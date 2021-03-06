var Relation = {

    toggle_heading: function(object) {
        object.expanded
            ? object.expanded = false
            : object.expanded = true
    },

    draw_relation_table: function(rel, record) {
        var count_columns = 0
        var group = rel.gruppe

        // count columns that should be shown
        $.each(rel.grid.columns, function(idx, field_name) {
            var field = rel.fields[field_name]
            if (!(field.defines_relation)) {
                count_columns++
            }
        })

        // Make list instead of table of relations if only one column shown
        if (count_columns == 1 && Object.keys(rel.relations).length == 0) {
            rel.relationship = 'M:M'
            return Record.draw_relation_list(rel, record)
        }

        return m('tr', [
            m('td', {}),
            m('td', {colspan:3}, [
                m('table', {class: 'w-100 collapse'}, [
                    // draw header cells
                    m('tr', {class: 'bb' }, [
                        m('td'),
                        rel.primary_key.length == 0 ? '' : m('td', {class: 'w0'}),
                        Object.keys(rel.grid.columns).map(function(label, idx) {
                            var field_name = rel.grid.columns[label]

                            var field = rel.fields[field_name]

                            // If this is for instance an action
                            if (field === undefined) {
                                return m('td', '')
                            }

                            if (!(field.defines_relation)) {
                                count_columns++
                            }
                            var label = label && !$.isArray(rel.grid.columns) ? label
                                : field.label_column ? field.label_column
                                : field.label
                            return field.defines_relation
                                ? ''
                                : m('td', {
                                    style: 'text-align: left',
                                    class: 'f6 pa1 pb0'
                                }, label)
                        }),
                        m('td'),
                    ]),
                    // draw records
                    !rel.records ? '' : rel.records.map(function(rec, rowidx) {
                        rec.table_name = rel.name
                        rec.rowidx = rowidx

                        // Make editable only relations attached directly to record
                        // and not to parent records
                        var ismatch = Object.keys(rel.conds).every(function(k) {
                            return rel.conds[k] == rec.columns[k].value
                        })
                        rec.readonly = !rec.new && !ismatch

                        rec.deletable = rec.relations ? true : false

                        if (rec.relations) {
                            $.each(rec.relations, function(idx, rel) {
                                var count_local = rel.count_records - rel.count_inherited
                                if (count_local && rel.delete_rule != "cascade") {
                                    rec.deletable = false
                                }
                            })
                        }

                        return m(Row, {
                            list: rel,
                            record: rec,
                            idx: rowidx,
                            parent: record,
                            colspan: count_columns+1
                        })
                    }),
                    record.readonly || !config.edit_mode ? '' : m('tr', [
                        m('td'),
                        m('td'),
                        m('td', [
                            !rel.privilege.insert ? '' : m('a', {
                                onclick: function(e) {
                                    e.stopPropagation()
                                    var rec = Record.create(rel, true)
                                    if (!rec) return

                                    rel.modus = 'edit'
                                }
                            }, m('i', {class: 'fa fa-plus light-blue hover-blue pointer ml1'}))
                        ])
                    ]),
                ])
            ])
        ])
    },

    draw_relation_list: function(rel, record) {
        return m('tr', [
            m('td', {}),
            m('td', {colspan:3}, [
                m('table', {class: 'w-100 collapse'}, [
                    rel.records.map(function(rec, rowidx) {
                        rec.rowidx = rowidx
                        // Make editable only relations attached directly to record
                        // and not to parent records
                        var ismatch = Object.keys(rel.conds).every(function(k) {
                            return rel.conds[k] == rec.columns[k].value
                        })
                        rec.readonly = !rec.new && !ismatch
                        if (rec.readonly) rec.inherited = true

                        if (rec.delete) return
                        if (rec.fields === undefined) {
                            rec.fields = JSON.parse(JSON.stringify(rel.fields))
                        }
                        rec.table = rel
                        rec.loaded = true

                        Object.keys(rel.fields).map(function (key) {
                            var field = rec.fields[key]
                            if (field.value === undefined) {
                                field.value = rec.columns[key].value
                                    ? rec.columns[key].value
                                    : null
                                field.text = rec.columns[key].text
                                field.editable = rel.privilege.update
                            }
                        })

                        return [
                            Object.keys(rel.form.items).map(function (label, idx) {
                                var item = rel.form.items[label]

                                if (typeof item !== 'object' && item.indexOf('.') === -1 && rel.fields[item].defines_relation) {
                                    return
                                }
                                return m(Node, {rec: rec, colname: item, label: label})
                            })
                        ]
                    }),
                    record.readonly || !config.edit_mode || rel.relationship == "1:1" ? '' : m('tr', [
                        m('td'),
                        m('td'),
                        m('td', [
                            !rel.privilege.insert ? '' : m('a', {
                                onclick: function(e) {
                                    e.stopPropagation()
                                    var rec = Record.create(rel, true)
                                    if (!rec) return

                                    rel.modus = 'edit'
                                }
                            }, m('i', {class: 'fa fa-plus light-blue hover-blue pointer ml1'}))
                        ])
                    ]),
                ])
            ])
        ])
    },

    view: function(vnode) {
        var rec = vnode.attrs.rec
        var colname = vnode.attrs.colname
        var label = vnode.attrs.label
        var key = colname.replace('relations.', '')
        var rel = rec.relations && rec.relations[key] ? rec.relations[key] : {}
        var usage = rec.table.relations[key].use

        if (usage && usage < config.threshold) {
            return
        }

        if (rel.show_if) {
            hidden = false
            Object.keys(rel.show_if).map(function(key) {
                value = rel.show_if[key]
                if(rec.fields[key].value != value) {
                    hidden = true
                }
            })
            if(hidden) return ''
        }

        var base_path
        if (ds.base.system == 'postgres' &&
            rel.schema_name &&
            rel.schema_name != rel.base_name && rel.schema_name != 'public')
        {
            base_path = rel.base_name + '.' + rel.schema_name
        } else {
            base_path = rel.base_name || rel.schema_name
        }
        var url = '#/' + base_path + '/' + rel.name + '?'

        conditions = []
        if (rel.conds) {
            $.each(rel.conds, function(col, val) {
                conditions.push(col + "=" + val)
            })
        }

        if (conditions.length == 0) conditions = rel.conditions

        if (conditions) {
            url += conditions.join('&')
        }

        return [
            m('tr.heading', {
                onclick: function() {
                    Relation.toggle_heading(rel)
                    if (!rel.records) {
                        Record.get_relations(rec, key)
                    }
                }
            }, [
                m('td.fa.tc.w1', {
                    class: [
                        rel.expanded === true ? 'fa-angle-down' : 'fa-angle-right',
                        rel.invalid ? 'invalid' : rel.dirty ? 'dirty' : ''
                    ].join(' ')
                }),
                m('td.label', {
                    class: "f6 nowrap pr2 b",
                    colspan: 3
                }, [
                    label,
                    rel.count_records !== undefined ? m('span', {class: 'ml1 pr1 normal moon-gray f7'}, rel.count_records) : '',
                    // show target icon for relations
                    !rel.name ? '' :
                    m('a', {
                        class: [
                            'icon-crosshairs light-blue hover-blue pointer mr1 link',
                        ].join(' '),
                        href: url
                    }),
                    rel.dirty ? m('i', {class: 'fa fa-pencil ml1 light-gray'}) : '',
                ]),
            ]),
            rel.expanded && rel.records
                ? ['1:M', 'M:M'].includes(rel.relationship)
                    ? Relation.draw_relation_table(rel, rec)
                    : m('tr', [
                        m('td'),
                        m('td', {colspan: 3}, [
                            m(Record, {record: rel.records[0]})
                        ])
                    ])
                : null
        ]
    }

}

module.exports = Relation

var get = require('just-safe-get')
var Record = require('./record')
var Row = require('./row')
var Cell = require('./cell')
var ds = require('./datastore')
var config = require('./config')
