var Node = {

    draw_inline_fieldset: function(rec, fieldset) {

        if (!fieldset.inline) {
            return
        }

        return m('td.nowrap', [
            Object.keys(fieldset.items).map(function(label, idx) {
                var fieldname = fieldset.items[label]
                var type = fieldname.indexOf('actions.') > -1
                    ? 'action' : 'field'

                switch (type) {
                case 'field':
                    var field = rec.fields[fieldname]
                    var separator
                    if (idx > 0 && field.value) {
                        separator = field.separator ? field.separator : ', '
                    } else {
                        separator = null
                    }

                    // determine if field should be displayd or edited
                    var display = rec.table.privilege.update == 0 ||
                        rec.readonly || !config.edit_mode

                    return m('span', {class: display ? '' : 'mr2'},
                             display
                             ? [separator, Field.display_value(field)].join('')
                             : m(Input, {
                                 rec: rec,
                                 fieldname: fieldname,
                                 placeholder: field.label
                             })
                    )
                case 'action':
                    var action = ds.table.actions[fieldname]
                    return m('span', {class: 'mr2'}, [
                        m('input', {
                            type: 'button',
                            value: action.label,
                            onclick: function() {
                                Toolbar.run_action(action, rec)
                            }
                        })
                    ])
                }
            })
        ])
    },

    view: function(vnode) {
        var rec = vnode.attrs.rec
        var colname = vnode.attrs.colname
        var label = vnode.attrs.label

        if (typeof colname === 'object') {
            label = colname.label ? colname.label : label;

            // Find number of registered fields under the heading
            var count_fields = 0;
            var count_field_values = 0;
            var count_empty_relations = 0;
            Object.keys(colname.items).map(function(label) {
                count_fields++;
                var col = colname.items[label];
                if (rec.fields[col] && rec.fields[col].value !== null) {
                    count_field_values++;
                } else if (
                    typeof col === 'string' && 
                    col.includes('relations')
                ) {
                    var key = col.replace('relations.', '');
                    var rel = rec.relations && rec.relations[key]
                        ? rec.relations[key]
                        : {};
                    if ($.isEmptyObject(rel)) count_empty_relations++;
                    if (rel.count_records) count_field_values++;
                }
            });

            // if (count_empty_relations === count_fields) return;

            return [
                m('tr', [
                    m('td', {class: 'tc'}, [
                        colname.inline && !colname.expandable ? '' : m('i.fa', {
                            class: [
                                'fa-angle-' + colname.expanded 
                                    ? 'down' : 'right',
                                colname.invalid 
                                    ? 'invalid' : colname.dirty ? 'dirty' : ''
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
                            !colname.inline || colname.expandable ? 'b' : '',
                        ].join(' '),
                        colspan: colname.inline ? 1 : 3,
                        onclick: function() {
                            colname.expanded = !colname.expanded;
                        }
                    }, [
                        label,
                        colname.inline ? '' : m('span', {
                            class: 'normal ml1 moon-gray f7'
                        }, count_field_values + '/' + count_fields),
                    ]),
                    m('td', [
                        colname.expanded ? '' :
                        colname.invalid 
                            ? m('i', {class: 'fa fa-warning ml1 red'})     
                        : colname.dirty ? m('i', {
                            class: 'fa fa-pencil ml1 light-gray'
                        }) : '',
                    ]),
                    !colname.expanded 
                        ? Node.draw_inline_fieldset(rec, colname) : null
                ]),
                !colname.expanded ? null : m('tr', [
                    m('td'),
                    m('td', {colspan: 3}, [
                        m('table', [
                            Object.keys(colname.items).map(function(label) {
                                var col = colname.items[label];
                                return m(Node, {
                                    rec: rec, colname: col, label: label
                                });
                            })
                        ])
                    ])
                ])
            ];
        } else {
            // var item = get(rec, colname, rec.fields[colname]);
        }

        if (typeof colname === "string" && colname.indexOf('relations') > -1) {
            return m(Relation, {rec: rec, colname: colname, label: label})
        } else if (typeof colname === "string" && colname.includes('actions')) {
            // TODO
        } else {
            return m(Field, {rec: rec, colname: colname, label: label})
        }
    }
}

module.exports = Node

var config = require('./config')
var Field = require('./field')
var Relation = require('./relation')
var Input = require('./input')
