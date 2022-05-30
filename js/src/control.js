
var control = {

    /**
     * Get conditions to collect data from a foreign key field
     *
     * param {Object} rec - record
     * param {Object} field - foreign key field
     */
    get_condition: function(rec, field) {

        var kandidatbetingelser = [];
        var filter;

        var keys = [];
        Object.keys(rec.table.foreign_keys).map(function(label) {
            key = rec.table.foreign_keys[label];

            if (key.foreign.indexOf(field.name) > 0) {
                last_fk_col = key.foreign.slice(-1)
                if (last_fk_col != field.name && rec.fields[last_fk_col].nullable == true) {
                    return
                }
                key.foreign_idx = $.inArray(field.name, key.foreign);
                keys.push(key);
            }
        });

        $.each(keys, function(idx, key) {

            if (key.filter) {
                filter = key.filter;
                $.each(rec.fields, function(name, field2) {
                    var re = new RegExp('\\b'+field2.table+'\\.'+field2.name+'\\b', 'g');
                    filter = filter.replace(re, "'"+field2.value+"'");
                    re = new RegExp('\!= null\\b', 'g');
                    filter = filter.replace(re, 'is not null');
                    re = new RegExp('\= null\\b', 'g');
                    filter = filter.replace(re, 'is null');
                });
                kandidatbetingelser.push(filter);
            }

            if (key.foreign && key.foreign.length > 1) {
                $.each(key.foreign, function(i, column) {
                    if (column === field.name) return;
                    var condition
                    if (rec.fields[column].value != null && column in rec.fields) {
                        var col = field.foreign_key.primary.slice(-1)[0];

                        if (key.table == field.foreign_key.table) {
                            condition = key.primary[i] + " = '" + rec.fields[column].value + "'"
                        } else {
                            condition = col + ' in (select ' + key.primary[key.foreign_idx];
                            condition += ' from ' + key.table + ' where ' + key.foreign[i];
                            condition += " = '" + rec.fields[column].value + "')";
                        }
                        kandidatbetingelser.push(condition);
                    }
                });
            }
        });

        return kandidatbetingelser.join(' AND ');
    },


    button: function(rec, action) {

        // If disabled status for the action is based on an expression
        // then we get the status from a column with same name as alias of action
        if (action.name && rec.columns[action.name] !== undefined) {
            action.disabled = rec.columns[action.name];
        }

        return action.disabled ? '' : m('i', {
            class: 'fa fa-' + action.icon,
            title: action.label,
            onclick: function(e) {
                var data = {};
                if (action.communication === 'download') {
                    data.base = rec.base_name;
                    data.table = rec.table_name;
                    data.primary_key = JSON.stringify(rec.primary_key);

                    var address = (action.url[0] === '/') ? action.url.substr(1) : ds.base.schema + '/' + action.url;
                    $.download(address, data, '_blank');
                }
                e.stopPropagation();
            }
        });
    },

    draw: function(rec, colname, label) {

        if (typeof colname === 'object') {
            label = colname.label ? colname.label : label;
            if (!colname.inline && colname.expanded === undefined && config.expand_headings) colname.expanded = true;

            // Find number of registered fields under the heading
            var count_fields = 0;
            var count_field_values = 0;
            var count_empty_relations = 0;
            Object.keys(colname.items).map(function(label, idx) {
                count_fields++;
                var col = colname.items[label];
                if (rec.fields[col] && rec.fields[col].value !== null) {
                    count_field_values++;
                } else if (typeof col === 'string' && col.indexOf('relations') > -1) {
                    var key = col.replace('relations.', '');
                    var rel = rec.relations && rec.relations[key] ? rec.relations[key] : {};
                    if ($.isEmptyObject(rel)) count_empty_relations++;
                    if (rel.count_records) count_field_values++;
                }
            });

            // if (count_empty_relations === count_fields) return;

            return [
                m('tr', [
                    m('td', {class: 'tc'}, [
                        colname.inline && colname.expandable === false ? '' : m('i.fa', {
                            class: [
                                colname.expanded ? 'fa-angle-down' : 'fa-angle-right',
                                colname.invalid ? 'invalid' : colname.dirty ? 'dirty' : ''
                            ].join(' '),
                            onclick: function() {
                                if (colname.expandable === false) return;

                                colname.expanded = !colname.expanded;
                            }
                        })
                    ]),
                    m('td.label', {
                        class: [
                            'f6 nowrap pr2',
                            !colname.inline || colname.expandable ? 'b' : ''
                        ].join(' '),
                        colspan: colname.inline ? 1 : 3,
                        onclick: function() {
                            colname.expanded = !colname.expanded;
                        }
                    }, [
                        label,
                        colname.inline ? '' : m('span', {class: 'normal ml1 moon-gray f7'}, count_field_values + '/' + count_fields),
                    ]),
                    m('td', [
                        colname.expanded ? '' :
                        colname.invalid ? m('i', {class: 'fa fa-warning ml1 red'})     :
                        colname.dirty ? m('i', {class: 'fa fa-pencil ml1 light-gray'}) : '',
                    ]),
                    !colname.expanded ? entry.draw_inline_fields(rec, colname) : null
                ]),
                !colname.expanded ? null : m('tr', [
                    m('td'),
                    m('td', {colspan: 3}, [
                        m('table', [
                            Object.keys(colname.items).map(function(label, idx) {
                                var col = colname.items[label];
                                return control.draw(rec, col, label);
                            })
                        ])
                    ])
                ])
            ];
        } else {
            var item = _get(rec, colname, rec.fields[colname]);
        }

        if (typeof colname === "string" && colname.indexOf('relations') > -1) {
            var key = colname.replace('relations.', '');
            var rel = rec.relations && rec.relations[key] ? rec.relations[key] : {};

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
            var url = '#/' + base_path + '/' + rel.name + '?';

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
                        entry.toggle_heading(rel)
                        if (!rel.records) {
                            entry.get_relations(rec, key);
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
                        ? entry.draw_relation_table(rel, rec)
                        : m('tr', [
                            m('td'),
                            m('td', {colspan: 3}, [
                                m(entry, {record: rel.records[0]})
                            ])
                        ])
                    : null
            ];
        } else if (typeof colname === "string" && colname.indexOf('actions.') > -1) {
            m('tr', [
                m('td'),
                m('td', [
                    m('input', {
                        type: 'button',
                        value: 'test'
                    })
                ])
            ]);
        } else {
            return m(Field, {colname: colname, label: label})
        }
    }
};

module.exports = control;

var m = require('mithril');
var $ = require('jquery');
var jsoned = require('./jsoned.js');
var ds = require('./datastore.js');
var _get = require('lodash/get');
var config = require('./config.js');
var Field = require('./field')

// TODO: Dette fører til sirkulær avhengighet, som gjør at entry blir tomt objekt.
var entry = require('./entry.js');

