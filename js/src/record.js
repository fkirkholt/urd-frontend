
var Record = {

    select: function(table, idx, root) {
        table.selection = idx

        if (table.records.length == 0) return

        // Don't load if already loaded
        if (table.records[idx].fields) {
            m.redraw()
            return
        }

        pk = ('pkey' in table.records[idx])
            ? JSON.stringify(table.records[idx].pkey)
            : JSON.stringify(table.records[idx].columns)

        m.request({
            method: "GET",
            url: 'record',
            params: {
                base: m.route.param('base'),
                table: table.name,
                pkey: pk
            }
        }).then(function(result) {
            rec = $.extend(table.records[idx], result.data)
            rec.table = table
            rec.root = root
            rec.fields = $.extend({}, table.fields, rec.fields)

            rec.columns = table.records[idx].columns
            Record.get_relations_count(rec)
        }).catch(function(e) {
            if (e.code === 401) {
                $('div.curtain').show()
                $('#login').show()
                $('#brukernavn').trigger('focus')
            }
        })
    },

    get_relations_count: function(rec) {
        m.request({
            method: "get",
            url: "relations",
            params: {
                base: rec.base_name,
                table: rec.table_name || rec.table.name,
                pkey: JSON.stringify(rec.pkey),
                count: true
            }
        }).then(function(result) {
            rec.relations = result.data
        })
    },

    get_relations: function(rec, alias) {
        $('.icon-crosshairs').addClass('fast-spin')
        m.request({
            method: "GET",
            url: "relations",
            params: {
                base: rec.base_name,
                table: rec.table.name,
                pkey: JSON.stringify(rec.pkey),
                count: false,
                alias: alias
            }
        }).then(function(result) {
            if (result.data[alias].relationship == '1:1') {
                record = result.data[alias].records[0]
                record.table = result.data[alias]
                Record.get_relations_count(record)
            }
            $('.icon-crosshairs').removeClass('fast-spin')
            Object.assign(rec.relations[alias], result.data[alias])
        })
    },

    create: function(list, relation) {

        if (list.actions.new) {
            Toolbar.run_action(list.actions.new)
            return
        }

        relation = relation ? relation : null

        // all columns and values defaults to null
        var columns = {}
        for (let idx in list.grid.columns) {
            col = list.grid.columns[idx]
            columns[col] = {
                text: null,
                value: null
            }
        }

        // Adds record to end of table
        var idx = list.records.length

        // Create new record with column specifications
        // after selected record
        list.records.splice(idx, 0, {
            pkey: {},
            columns: columns,
            new: true
        })

        list.selection = idx
        list.dirty = true

        // create new record
        var rec = {
            base_name: ds.base.name,
            table_name: list.name,
            table: list,
            columns: list.records[idx].columns,
            fields: $.extend(true, {}, list.fields),
            pkey: {},
            groups: [] // TODO: This should be removed
        }

        // set standard value of field, and sets editable from list
        $.each(rec.fields, function(name, field) {
            field.name = name
            var conditions = []

            if (field.default) {
                field.value = field.default
                field.dirty = true
            } else {
                // Sets the value to filtered value if such filter exists
                if (!relation) {
                    for (let idx in list.filters) {
                        filter = list.filters[idx]
                        var parts = filter.field.split('.')
                        var table_name
                        var field_name
                        if (parts.length == 2) {
                            table_name = parts[0]
                            field_name = parts[1]
                        } else {
                            table_name = rec.table_name
                            field_name = parts[0]
                        }

                        if (
                            table_name === rec.table_name && 
                            field_name === field.name && filter.operator === '='
                        ) {
                            conditions.push(filter)
                        }
                    }
                }

                if (conditions.length === 1) {
                    field.value = conditions[0].value
                    field.dirty = true
                } else {
                    field.value = null
                }
            }

            field.editable = field.editable === false
                ? field.editable : list.privilege.update
            rec.fields[name] = field

            if (field.value) {
                Field.update(field.value, field.name, rec)
            }
        })

        rec.new = true
        rec.dirty = true
        rec.loaded = true

        rec = $.extend(list.records[idx], rec)

        if (!relation) {
            rec.root = true
        } else {
            rec.fk = []
            rec.open = true
        }

        Record.get_relations_count(rec)

        return rec
    },

    copy: function() {
        var selected = ds.table.selection
        var active_rec = ds.table.records[selected]
        var clone = {}
        clone.fields = $.extend(true, {}, active_rec.fields)
        for (let name in clone.fields) {
            field = clone.fields[name]
            if (field.value) {
                field.dirty = true
            }
        }
        clone.columns = $.extend(true, {}, active_rec.columns)
        clone.table = ds.table
        clone.new = true
        clone.relations = []

        var idx = ds.table.selection + 1
        ds.table.records.splice(idx, 0, clone)
        ds.table.selection = idx
        ds.table.dirty = true

        // Handles auto fields
        $.each(ds.table.fields, function(name, field) {
            if (field.extra) {
                clone.fields[name].value = field.default
                if (clone.columns[name]) {
                    clone.columns[name].text = field.default
                }
                clone.fields[name].dirty = true
                if (field.options) {
                    if (field.default) {
                        clone.text = field.options.find(function(d) {
                            return d.value === field.default
                        }).text
                    } else {
                        clone.text = null
                    }
                }
            }
        })

        clone.pkey = {}
    },

    delete: function(rec) {
        if (rec.deletable === false) return
        rec.delete = rec.delete ? false : true
        rec.dirty = true
        ds.table.dirty = true

        if (config.autosave) Record.save(rec)
    },

    /**
     * Oppdaterer record ved autosave
     */
    save: function(rec) {
        var changes = Record.get_changes(rec, false)

        var data = {
            base_name: rec.base_name,
            table_name: rec.table.name,
            pkey: changes.prim_key,
            values: changes.values
        }

        m.request({
            method: changes.method,
            params: data,
            url: 'record'
        }).then(function(data) {
            for (let fieldname in changes.values) {
                rec.fields[fieldname].dirty = false
            }
            rec.new = false
            $.each(data.values, function(fieldname, value) {
                rec.fields[fieldname].value = value

                // Update value in grid cell
                if (rec.columns && fieldname in rec.columns) {
                    rec.columns[fieldname].value = value
                }

            })
            if (rec.delete){
                var idx = rec.table.selection
                rec.table.records.splice(idx, 1)
                rec.table.selection = 0
            }
        })
    },

    validate: function(record) {
        var rel
        var rec
        
        record.invalid = false
        record.dirty = record.delete ? true : false
        
        for (let fieldname in record.fields) {
            field = record.fields[fieldname]
            Input.validate(field.value, field)
            if (field.dirty) record.dirty = true
            if (field.invalid) record.invalid = true
        }

        for (let relname in record.relations) {
            rel = record.relations[relname]
            for (let idx in rel.records) {
                rec = rel.records[idx]
                Record.validate(rec)
                if (rec.dirty) rel.dirty = true
                if (rec.invalid) rel.invalid = true
            }

            if (rel.dirty) record.dirty = true
            if (rel.invalid) record.invalid = true
        }
    },

    get_changes: function(rec, traverse) {

        traverse = traverse ? traverse : false

        var changes = {}
        changes.prim_key = rec.pkey
        changes.relations = {}

        var values = {}
        $.each(rec.fields, function(name, field) {
            if (field.dirty == true) {
                values[name] = field.value
            }
        })

        if (Object.keys(values).length) {
            changes.values = values
        }

        changes.method = rec.delete ? 'delete' :
                         rec.new    ? 'post'   : 'put'

        if (changes.action == 'delete' || !traverse) return changes

        $.each(rec.relations, function(alias, rel) {
            if (!rel.dirty) return

            var changed_rel = {
                base_name: ds.base.name,
                table_name: rel.name,
                condition: rel.conditions.join(' AND '),
                foreign: rec.table.relations[alias].foreign,
                primary: rec.table.relations[alias].primary,
                records: []
            }
            for (let idx in rel.records) {
                subrec = rel.records[idx]
                if (!subrec.dirty) return
                subrec_changes = Record.get_changes(subrec, true)
                changed_rel.records.push(subrec_changes)
            }
            changes.relations[alias] = changed_rel
        })

        return changes
    },

    action_button: function(rec, action) {

        // If disabled status for the action is based on an expression
        // then we get the status from a column with same name as 
        // alias of action
        if (action.name && rec.columns[action.name] !== undefined) {
            action.disabled = rec.columns[action.name].text;
        }

        return action.disabled ? '' : m('i', {
            class: 'fa fa-' + action.icon,
            title: action.label,
            onclick: function(e) {
                var data = {};
                if (action.communication === 'download') {
                    data.base = rec.base_name;
                    data.table = rec.table_name;
                    data.pkey = JSON.stringify(rec.pkey);

                    params = Object.keys(data).map(function(k) {
                        return k + '=' + data[k]
                    }).join('&')
                    var address = (action.url[0] === '/')
                        ? action.url
                        : ds.base.schema + '/' + action.url;
                    window.open(address + '?' + params, '_blank')
                }
                e.stopPropagation();
            }
        });
    },

    view: function(vnode) {
        var rec = vnode.attrs.record

        // Clone record so the registration can be cancelled easily
        if (ds.table.edit && !ds.rec) {
            rec = structuredClone(rec)
            ds.rec = rec
        } else if (ds.table.edit) {
            rec = ds.rec
        }

        if (!rec || !rec.table) {
            return m('form[name="record"]', {
                class: 'flex flex-column',
            })
        }

        Record.validate(rec)

        rec.dirty = rec.dirty == undefined ? false : rec.dirty

        return m('form[name="record"]', {
            class: 'flex flex-column',
        }, [
            !ds.table.edit && !ds.table.hide
                ? ''
                : m('div', [
                    m('input[type=button]', {
                        value: 'Lagre og lukk',
                        onclick: function() {
                            var saved = true
                            if (ds.table.dirty) {
                                vnode.attrs.record = merge(vnode.attrs.record,
                                                           rec)
                                delete ds.rec
                                saved = Grid.save()
                            }
                            if (saved) {
                                ds.table.edit = false
                                config.edit_mode = false
                            }
                        }
                    }),
                    m('input[type=button]', {
                        value: 'Avbryt',
                        onclick: function() {
                            ds.table.edit = false
                            config.edit_mode = false
                            delete ds.rec
                            if (rec.new) {
                                var idx = ds.table.selection
                                ds.table.records.splice(idx, 1)
                                Record.select(ds.table, 0, true)
                            }
                        }
                    })
                ]),
            m('table[name=view]', {
                class: [
                    'pt1 pl1 pr2 flex flex-column',
                    config.theme === 'material' ? 'md' : '',
                    'overflow-auto',
                ].join(' '),
                style: '-ms-overflow-style:-ms-autohiding-scrollbar'
            }, [
                m('tbody', [
                    Object.keys(rec.table.form.items).map(function(label) {
                        var item = rec.table.form.items[label]

                        if (
                            typeof item !== 'object' &&
                                item.indexOf('.') === -1 &&
                                rec.table.fields[item].defines_relation
                        ) {
                            return
                        }

                        if (typeof item == 'object') {
                            return m(Fieldset, {
                                rec: rec, 
                                fieldset: item, 
                                label: label
                            })
                        } else if (
                            typeof item == "string" && 
                            item.includes('relations')
                        ) {
                            return m(Relation, {rec: rec, ref: item, label: label})
                        } else if (typeof item == "string" && item.includes('actions')) {
                            // TODO
                        } else {
                            return m(Field, {rec: rec, colname: item, label: label})
                        }

                    })
                ])
            ])
        ])
    }
}

module.exports = Record

var config = require('./config')
var merge = require('just-merge')
var Grid = require('./grid')
var Toolbar = require('./toolbar')
var Fieldset = require('./fieldset')
var Field = require('./field')
var Input = require('./input')
var Relation = require('./relation')
