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
                    m('tr', [
                        m('td'),
                        config.relation_view === 'column' || rel.primary_key.length == 0 ? '' : m('td', {class: 'w0 gray'}),
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
                                    class: 'gray f6 pa1 pb0'
                                }, label)
                        }),
                        m('td'),
                        config.relation_view !== 'column' ? '' : m('td'),
                    ]),
                    // draw records
                    rel.records.map(function(rec, rowidx) {
                        rec.table_name = rel.name

                        // Make editable only relations attached directly to record
                        // and not to parent records
                        rec.readonly = !rec.new && !_isMatch(rec.values, rel.conds) &&
                            // all keys of rel.conds should be in rec.values
                            Object.keys(rel.conds).every(function(val) {
                                return Object.keys(rec.values).indexOf(val) >= 0
                            })

                        rec.deletable = rec.relations ? true : false

                        $.each(rec.relations, function(idx, rel) {
                            var count_local = rel.count_records - rel.count_inherited
                            if (count_local && rel.delete_rule != "cascade") {
                                rec.deletable = false
                            }
                        })

                        return [
                            m('tr', {
                                class: [
                                    config.relation_view === 'column' && _isEqual(rec, record.active_relation) ? 'bg-blue white' : '',
                                    rec.readonly ? 'gray' : 'black'
                                ].join(' '),
                                onclick: function() {
                                    if (rec.primary_key == null) return
                                    record.active_relation = rec
                                    Record.toggle_record(rec, rel)
                                }
                            }, [
                                m('td', {
                                    align: 'center',
                                    class: 'bg-white'
                                }, [
                                    m('i', {
                                        class: [
                                            rec.delete ? 'fa fa-trash light-gray mr1' :
                                            rec.invalid ? 'fa fa-warning red mr1' :
                                            rec.dirty ? 'fa fa-pencil light-gray mr1' : '',
                                        ].join(' ')
                                    })
                                ]),
                                config.relation_view === 'column' || rec.primary_key == null ? '' : m('td.fa', {
                                    class: [
                                        rec.open ? 'fa-angle-down' : 'fa-angle-right',
                                        rec.invalid ? 'invalid' : rec.dirty ? 'dirty' : '',
                                    ].join(' ')
                                }),
                                Object.keys(rel.grid.columns).map(function(label, colidx) {
                                    var field_name = rel.grid.columns[label]

                                    // Check if this is an action
                                    if (field_name.indexOf('actions.') > -1) {
                                        var parts = field_name.split('.')
                                        var action_name = parts[1]
                                        var action = rel.actions[action_name]
                                        action.alias = action_name

                                        return Record.action_button(rec, action)
                                    }

                                    var field = rel.fields[field_name]

                                    return field.defines_relation
                                        ? ''
                                        : m(Cell, {
                                            list: rel,
                                            rowidx: rowidx,
                                            col: field_name,
                                            compressed: true
                                        })
                                }),
                                m('td', {class: 'bb b--light-gray'}, [
                                    !rec.open || record.readonly ? '' : m('i', {
                                        class: [
                                            rel.privilege.delete && config.edit_mode ? 'fa fa-trash-o pl1' : '',
                                            rec.deletable ? 'light-blue' : 'moon-gray',
                                            rec.deletable ? (config.relation_view === 'column' ? 'hover-white' : 'hover-blue') : '',
                                        ].join(' '),
                                        style: 'cursor: pointer',
                                        onclick: Record.delete.bind(this, rec),
                                        title: 'Slett'
                                    })
                                ]),
                                config.relation_view !== 'column' || record.readonly ? '' : m('td', {class: 'bb b--light-gray'}, [
                                    m('i', {
                                        class: 'fa fa-angle-right'
                                    })
                                ]),
                            ]),
                            !rec.open || config.relation_view === 'column' ? null : m('tr', [
                                m('td'),
                                m('td'),
                                m('td', {
                                    colspan: count_columns+1,
                                    class: 'bl b--moon-gray'
                                }, [
                                    m(Record, {record: rec})
                                ])
                            ])
                        ]
                    }),
                    record.readonly || !config.edit_mode ? '' : m('tr', [
                        m('td'),
                        config.relation_view !== 'expansion' ? '' : m('td'),
                        m('td', [
                            !rel.privilege.insert ? '' : m('a', {
                                onclick: function(e) {
                                    e.stopPropagation()
                                    var rec = Record.create(rel, true)
                                    if (!rec) return

                                    rel.modus = 'edit'
                                    record.active_relation = rec
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
                        // Make editable only relations attached directly to record
                        // and not to parent records
                        rec.readonly = !rec.new && !_isMatch(rec.values, rel.conds)
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
                                field.value = rec.values
                                    ? rec.values[key]
                                    : null
                                field.text = rec.columns[key]
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
                        config.relation_view !== 'expansion' ? '' : m('td'),
                        m('td', [
                            !rel.privilege.insert ? '' : m('a', {
                                onclick: function(e) {
                                    e.stopPropagation()
                                    var rec = Record.create(rel, true)
                                    if (!rec) return

                                    rel.modus = 'edit'
                                    record.active_relation = rec
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
        $.each(rel.conds, function(col, val) {
            conditions.push(col + "=" + val)
        })

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

var Record = require('./record')
var Cell = require('./cell')
var ds = require('./datastore')
var config = require('./config')
var _isMatch = require('lodash/isMatch')
var _isEqual = require('lodash/isEqual')
