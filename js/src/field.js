var Field = {

    update: function(value, fieldalias, rec) {

        var field = rec.fields[fieldalias]

        field.dirty = true
        rec.dirty = true
        ds.table.dirty = true

        // Update value in grid cell
        if (rec.columns && field.name in rec.columns) {
            rec.columns[field.name].text =
                field.coltext ? field.coltext :
                field.text    ? field.text    :
                typeof value == "string" ? value.substring(0, 256) : value
            rec.columns[field.name].value = value
        }

        rec.fields[field.name].value = value

        // For each select that depends on the changed field, we must set the
        // value to empty and load new options
        $.each(rec.table.fields, function(name, other_field) {
            if (name == field.name || !other_field.fkey) return
            if (other_field.defines_relation) return

            if (
                other_field.element == 'select' &&
                other_field.fkey.foreign.length > 1
            ) {
                // If the field is part of the dropdowns foreign keys
                if (other_field.fkey.foreign.includes(field.name)) {
                    if (rec.fields[name].value !== null) {
                        rec.fields[name].value = null
                        rec.fields[name].dirty = true
                        rec.columns[name].text = null
                    }
                    // Get new options for select
                    m.request({
                        method: 'GET',
                        url: 'select',
                        params: {
                            q: '',
                            limit: 1000,
                            schema: other_field.fkey.schema,
                            base: other_field.fkey.base,
                            table: other_field.fkey.table,
                            alias: other_field.name,
                            view: other_field.view,
                            column_view: other_field.column_view,
                            key: JSON.stringify(other_field.fkey.primary),
                            condition: Input.get_condition(rec, other_field)
                        }
                    }).then(function(data) {
                        rec.fields[name].options = data
                    })
                }
            }
        })


        // Updates conditions for relations
        if (rec.relations) {
            $.each(rec.relations, function(i, relation) {
                if (!relation.betingelse) {
                    return
                }
                $.each(relation.betingelse, function(relation_field) {
                    if (relation_field == field.name) {
                        $.each(relation.records, function(i, post) {
                            post.fields[relation_field] = value
                            post.dirty = true
                            relasjon.dirty = true
                        })
                    }
                })
            })
        }


        if (config.autosave == false) {
            return
        }

        rec.invalid = false
        rec.dirty = false
        ds.table.dirty = false
        $.each(rec.fields, function(name, field) {
            if (
                field.invalid || (
                    field.nullable === false && 
                    field.value === null && 
                    field.extra !== 'auto_increment'
                )
            ) {
                rec.invalid = true
            }
            if (field.dirty) {
                rec.dirty = true
            }
        })

        if (rec.invalid) return

        Record.save(rec)
    },

    display_value: function(field, value) {
        // field.value is not set for cells in grid
        value = field.value || value


        if (field.text) {
            value = field.text
        } else if (field.element == 'input[type=checkbox]') {
            var icon = value == 0 ? 'fa-square-o' : 'fa-check-square-o'
            value = m('i', {class: 'fa ' + icon})
        } else if (field.value && (
            field.datatype == 'json' || 
            get(field, 'attrs.data-format') == 'json'
        )) {
            value = m(JSONed, {
                name: field.name,
                mode: 'view',
                field: field,
                rec: rec,
                style: "width: 330px; height: 400px;",
                value: JSON.parse(field.value)
            })
        } else if (
            get(field, 'attrs.data-format') == 'markdown' &&
            field.expanded
        ) {
            value = m.trust(marked.parse(field.value))
        } else if (field.expanded) {
            value = m.trust(value.replace("\n", '<br>'))
        }

        return value
    },

    /**
     * Expands or collapses foreign key relations
     * @param {} list
     * @param {} field
     */
    toggle_fkey: function(rec, fieldname) {
        var field = rec.fields[fieldname]
        if (field.expanded) {
            field.expanded = false
            return
        } else if (field.fkey) {
            field.expanded = true
        }
        var filters = []

        $.each(field.fkey.primary, function(i, ref_field) {
            var fk_field = field.fkey.foreign[i]
            var value = rec.fields[fk_field].value
            filters.push(field.fkey.table + '.' + ref_field + " = " + value)
        })

        m.request({
            method: "GET",
            url: "table",
            params: {
                base: field.fkey.base || ds.base.name,
                schema: field.fkey.schema,
                table: field.fkey.table,
                filter: filters.join(' AND ')
            }
        }).then(function(result) {
            var table = result.data
            if (table.count_records == 0) {
                alert('Fant ikke posten i databasen')
            }
            var pk = table.records[0].pkey
            m.request({
                method: "GET",
                url: "record",
                params: {
                    base: field.fkey.base || ds.base.name,
                    schema: field.fkey.schema,
                    table: field.fkey.table,
                    // betingelse: betingelse,
                    pkey: JSON.stringify(pk)
                }
            }).then(function(result) {
                var record = result.data
                record.readonly = true
                record.table = table
                table.records[0] = Object.assign(table.records[0], record)
                rec.fields[fieldname].relation = record
                Record.get_relations_count(record)
            })
        })
    },

    view: function(vnode) {
        var rec = vnode.attrs.rec
        var colname = vnode.attrs.colname
        var label = vnode.attrs.label
        // var field = $.extend({}, rec.fields[colname])
        var field = rec.fields[colname]

        if (field.virtual) {
            field.text = rec.columns[colname].text
        }

        // Don't show fields used below threshold value
        if (field.use && field.use < config.threshold) {
            return
        }
        // Don't show fields where one value is used very frequent
        if (field.frequency && field.frequency > (1 - config.threshold)) {
            return
        }
        // Don't show columns that has no values
        if (field.use === 0) {
            return
        }

        // Show hidden fields only in edit mode
        if (rec.table.fields[colname].hidden && !config.edit_mode) return

        // TODO: Hva gjør jeg med rights her?
        console.log('field', field)
        var mandatory = !field.nullable && !field.extra && field.editable 
                        && !field.source == true
        label = isNaN(parseInt(label)) ? label: field.label

        if (field.fkey) {
            if (
                ds.base.system == 'postgres' &&
                field.fkey.schema &&
                field.fkey.schema != field.fkey.base &&
                field.fkey.schema != 'public'
            ) {
                base = field.fkey.base + '.' + field.fkey.schema
            } else if (ds.base.system == 'sqlite3') {
                base = ds.base.name
            } else {
                base = field.fkey.base || field.fkey.schema
            }
            var url = '#/' + base + '/data/' + field.fkey.table + '?'
            $.each(field.fkey.primary, function(i, colname) {
                var fk_field = field.fkey.foreign[i]
                url += colname + '=' + rec.fields[fk_field].value
                if (i !== field.fkey.primary.length - 1 ) url += '&'
            })
        }

        var use
        if (field.use == 1) {
            use = 100
        } else if (field.use) {
            use = (field.use * 100).toPrecision(2)
        }

        return [
            // TODO: sto i utgangspunktet list.betingelse. 
            // Finn ut hva jeg skal erstatte med.
            (
                !config.edit_mode && config.hide_empty 
                && field.value === null
            ) ? '' : m('tr', [
                m('td', {class: 'tc v-top'}, [
                    !field.fkey || !field.expandable || 
                    field.value === null ? null : m('i.fa.w1', {
                        class: !field.expanded 
                            ? 'fa-angle-right' : field.expandable 
                            ? 'fa-angle-down' : '',
                        onclick: Field.toggle_fkey.bind(this, rec, colname)
                    }),
                ]),
                m('td.label', {
                    class: [
                        'f6 pr1 v-top w1',
                        field.invalid ? 'invalid' : field.dirty ? 'dirty' : '',
                        !config.admin ? 'max-w5 truncate' : '',
                    ].join(' '),
                    onclick: function() {
                        if (field.fkey && field.expandable && field.value) {
                            Field.toggle_fkey(rec, colname)
                        } else if (field.element == 'textarea') {
                            field.expanded = !field.expanded
                        }
                    }
                }, [
                    get(field, 'attrs.title')
                        ? m('abbr', {title: field.attrs.title}, label)
                        : label,
                    !field.use || !config.admin ? '' : m('span', {
                        class: 'ml2 light-silver'
                    }, '(' + use + '%)'),
                    ':'
                ]),
                m('td', {
                    class: 'v-top'
                }, [
                    field.invalid && field.value == null 
                        ? m('i', {class: 'fa fa-asterisk red'})
                    : field.invalid 
                        ? m('i', {
                            class: 'fa fa-warning ml1 red',
                            title: field.errormsg
                        })
                    : field.dirty 
                        ? m('i', {class: 'fa fa-pencil ml1 light-gray'})
                    : mandatory && config.edit_mode
                        ? m('i', {class: 'fa fa-asterisk f7 light-gray'})
                    : ''
                ]),
                m('td', {
                    class: [
                        'max-w7 w-100',
                        (
                            field.element == 'textarea' && 
                            !field.expanded && !config.edit_mode
                        ) ? 'nowrap truncate' : '',
                        config.edit_mode ? 'nowrap' : '',
                        field.invalid ? 'invalid' : field.dirty ? 'dirty' : '',
                        rec.inherited ? 'gray' : '',
                    ].join(' '),
                    onclick: function() {
                        if (field.element == 'textarea') {
                            field = rec.fields[colname]
                            field.expanded = !field.expanded
                        }
                    }
                }, [
                    (
                        rec.table.privilege.update == 0 || 
                        rec.readonly || !config.edit_mode
                    )
                        ? Field.display_value(field)
                        : m(Input, {rec: rec, fieldname: colname}),
                    !field.expandable || field.value === null 
                        ? ''
                    : m('a', {
                        class: 'icon-crosshairs light-blue hover-blue ' 
                             + 'pointer link',
                        href: url
                    }),

                    // Show trash bin for field from cross reference table
                    rec.table.relationship != 'M:M' || !config.edit_mode 
                        ? ''
                    : m('i', {
                        class: 'fa fa-trash-o light-blue pl1 hover-blue '
                             + 'pointer',
                        onclick: Record.delete.bind(this, rec)
                    }),

                    !field.attrs || !field.attrs.href ? '' : m('a', {
                        href: sprintf(field.attrs.href, field.value)
                    }, m('i', {
                        class: 'icon-crosshairs light-blue hover-blue pointer'
                    })),
                ])
            ]),
            !field.fkey || !field.expanded ? null : m('tr', [
                m('td'),
                m('td', {
                    colspan: 3
                }, [
                    m(Record, {record: field.relation})
                ])
            ])
        ]
    }
}

module.exports = Field

var config = require('./config')
var marked = require('marked')
var sprintf = require("sprintf-js").sprintf
var Input = require('./input')
var Record = require('./record')
var get = require('just-safe-get')
var JSONed = require('./jsoned')
