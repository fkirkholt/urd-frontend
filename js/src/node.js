var Node = {

    draw_inline_fieldset: function(rec, fieldset) {

        if (!fieldset.inline) {
            return
        }

        return m('td.nowrap', [
            Object.keys(fieldset.items).map(function(label, idx) {
                var fieldname = fieldset.items[label]
                var type = fieldname.indexOf('actions.') > -1 ? 'action' : 'field'

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

    /**
     * Validate field or heading in form
     *
     * @param {object} rec record
     * @param {object|string} item what we shall validate
     * @param {boolean} revalidate
     */
    validate: function(rec, item, revalidate) {
        item.dirty = false
        item.invalid = false
        var parts
        var type = typeof item === 'object'        ? 'heading'
                 : item.indexOf('relations.') > -1 ? 'relation'
                 : item.indexOf('actions.') > -1   ? 'action'
                 : 'field'

        switch (type) {
        case 'heading':
            // For headings we validate each subitem
            Object.keys(item.items).map(function(label, idx) {
                var subitem = item.items[label]

                var status = Node.validate(rec, subitem)

                if (status.dirty) item.dirty = true
                if (status.invalid) item.invalid = true

            })

            return {dirty: item.dirty, invalid: item.invalid}
        case 'relation':
            // If relations isn't loaded yet
            if (!rec.relations) return {dirty: false, invalid: false}

            parts = item.split('.')
            var rel_key = parts[1]
            var rel = rec.relations[rel_key]
            if (!rel) return {dirty: false, invalid: false}
            if (rel.records) {
                $.each(rel.records, function(i, rec) {
                    if (!rec.loaded) return
                    Record.validate(rec)
                    if (rec.invalid) {
                        rel.invalid = true
                    }
                    if (rec.dirty) {
                        rel.dirty = true
                    }
                })
            }
            if (rel.invalid) rec.invalid = false
            if (rel.dirty) rec.dirty = true

            return {dirty: rel.dirty, invalid: rel.invalid}
        case 'field':
            // If record of relation isn't loaded from server yet
            if (!rec.fields) return {dirty: false, invalid: false}

            parts = item.split('.')
            var field_name = parts.pop()

            var field = rec.fields[field_name]

            if (revalidate) {
                Input.validate(field.value, field)
            }
            var status = {
                dirty: field.dirty,
                invalid: field.invalid
            }

            if (field.dirty) rec.dirty = true
            if (field.invalid) rec.invalid = true

            return status
        case 'action':
            return {}
        }
    },

    view: function(vnode) {
        var rec = vnode.attrs.rec
        var colname = vnode.attrs.colname
        var label = vnode.attrs.label
        if (typeof colname === 'object') {
            label = colname.label ? colname.label : label;
            if (
                !colname.inline && colname.expanded === undefined &&
                config.expand_headings
            ) {
                colname.expanded = true;
            }

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
                            !colname.inline || colname.expandable ? 'b' : '',
                            colname.inline ? 'underline' : ''
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
                    !colname.expanded ? Node.draw_inline_fieldset(rec, colname) : null
                ]),
                !colname.expanded ? null : m('tr', [
                    m('td'),
                    m('td', {colspan: 3}, [
                        m('table', [
                            Object.keys(colname.items).map(function(label, idx) {
                                var col = colname.items[label];
                                return m(Node, {rec: rec, colname: col, label: label});
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
        } else if (typeof colname === "string" && colname.indexOf('actions.') > -1) {
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
var Record = require('./record')
var Input = require('./input')
