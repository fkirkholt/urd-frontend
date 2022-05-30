var Field = {

    display_value: function(field, value) {
        if (value === '') return '';
        if (typeof value === 'undefined') value = field.value;
        // Different types of fields
        var is_date_as_string = value &&
            field.placeholder == 'yyyy(-mm(-dd))' &&
            field.datatype == 'string';
        var is_timestamp = field.element == 'input' &&
            field.attr.class == 'timestamp';
        var is_date = field.element == 'input[type=date]';
        var is_integer = field.datatype == 'integer' && !field.options && !field.foreign_key;
        var is_checkbox = field.element == 'input[type=checkbox]';
        var date_items;

        if (field.text) {
            value = field.text;
        } else if (field.element == 'select' && field.options && field.value) {
            var option = _find(field.options, value);
            value = option ? option.label : value;
        } else if (is_date_as_string) {
            if (field.size === 8) {
                date_items = [
                    value.substr(0,4),
                    value.substr(4,2),
                    value.substr(6,2)
                ];
                value = $.grep(date_items, Boolean).join('-');
            }
        } else if (is_timestamp) {
            // var parts = value.split(' ');
            // value = moment(value, 'YYYY-MM-DD').format('DD.MM.YYYY') + ' ' + parts[1];
        } else if (is_date) {
            // value = value ? moment(value, 'YYYY-MM-DD').format('DD.MM.YYYY') : '';
        } else if (is_checkbox) {
            var icon = value == 0 ? 'fa-square-o' : 'fa-check-square-o';
            value = m('i', {class: 'fa ' + icon});
        } else if (is_integer && field.size > 5) {
            numeral.locale('no');
            value = value === null ? null : numeral(value).format();
        } else if (field.datatype == 'json' && field.value) {
            console.log('field.value', field.value)
            value = m(jsoned, {
                name: field.name,
                mode: 'view',
                field: field,
                rec: rec,
                style: "width: 350px; height: 400px;",
                value: JSON.parse(field.value)
            })
        } else if (field.element == "textarea" && field.expanded) {
            var converter = new showdown.Converter();
            value = m.trust(converter.makeHtml(field.value))
        }

        return value;
    },

    view: function(vnode) {
        var colname = vnode.attrs.colname
        var label = vnode.attrs.label
        var field = $.extend({}, rec.fields[colname])

        if (field.virtual) {
            field.text = rec.columns[colname]
        }

        // Show hidden fields only in edit mode
        if (rec.table.fields[colname].hidden && !config.edit_mode) return

        // TODO: Hva gjør jeg med rights her?
        var mandatory = !field.nullable && !field.extra && field.editable && !field.source == true
        label = isNaN(parseInt(label)) ? label: field.label

        if (field.foreign_key) {
            if (
                ds.base.system == 'postgres' &&
                field.foreign_key.schema &&
                field.foreign_key.schema != field.foreign_key.base &&
                field.foreign_key.schema != 'public'
            ) {
                base = field.foreign_key.base + '.' + field.foreign_key.schema
            } else if (ds.base.system == 'sqlite3') {
                base = ds.base.name
            } else {
                base = field.foreign_key.base || field.foreign_key.schema
            }
            var url = '#/' + base + '/' + field.foreign_key.table + '?'
            $.each(field.foreign_key.primary, function(i, colname) {
                var fk_field = field.foreign_key.foreign[i]
                url += colname + '=' + rec.fields[fk_field].value
                if (i !== field.foreign_key.primary.length - 1 ) url += '&'
            })
        }

        return [
            // TODO: sto i utgangspunktet list.betingelse. Finn ut hva jeg skal erstatte med.
            (!config.edit_mode && config.hide_empty && rec.fields[colname].value === null) ? '' : m('tr', [
                m('td', {class: 'tc v-top'}, [
                    !field.foreign_key || !field.expandable || rec.fields[colname].value === null ? null : m('i.fa.w1', {
                        class: !field.expanded ? 'fa-angle-right' : field.expandable ? 'fa-angle-down' : '',
                        onclick: entry.toggle_relation.bind(this, rec, colname)
                    }),
                    field.element != 'textarea' ? null : m('i.fa', {
                        class: field.expanded ? 'fa-angle-down' : 'fa-angle-right',
                        onclick: function() {
                            field = rec.fields[colname]
                            field.expanded = !field.expanded
                        }
                    })
                ]),
                m('td.label', {
                    class: [
                        'f6 pr1 v-top',
                        field.invalid ? 'invalid' : field.dirty ? 'dirty' : '',
                        'max-w5 w1 truncate'
                    ].join(' '),
                    title: label,
                    onclick: function() {
                        if (field.foreign_key && field.expandable && rec.fields[colname].value) {
                            entry.toggle_relation(rec, colname)
                        } else if (field.element == 'textarea') {
                            field = rec.fields[colname]
                            field.expanded = !field.expanded
                        }
                    }
                }, [
                    field.description
                        ? m('abbr', {title: field.description}, label)
                        : label,
                    ':'
                ]),
                m('td', {
                    class: 'v-top'
                }, [
                    field.invalid && field.value == null ? m('i', {class: 'fa fa-asterisk red'}) :
                    field.invalid ? m('i', {class: 'fa fa-warning ml1 red', title: field.errormsg}) :
                    field.dirty ? m('i', {class: 'fa fa-pencil ml1 light-gray'}) :
                    mandatory && config.edit_mode ? m('i', {class: 'fa fa-asterisk f7 light-gray'}) : ''
                ]),
                m('td', {
                    class: [
                        'max-w7 w-100',
                        field.element == 'textarea' && !field.expanded && !config.edit_mode ? 'nowrap truncate' : '',
                        config.edit_mode ? 'nowrap' : '',
                        field.invalid ? 'invalid' : field.dirty ? 'dirty' : '',
                        rec.inherited ? 'gray' : '',
                    ].join(' ')
                }, [
                    rec.table.privilege.update == 0 || rec.readonly || !config.edit_mode
                        ? Field.display_value(field)
                        : m(Input, {rec: rec, fieldname: colname}),
                    !field.expandable || field.value === null ? '' : m('a', {
                        class: 'icon-crosshairs light-blue hover-blue pointer link',
                        href: url
                    }),

                    // Show trash bin for field from cross reference table
                    rec.table.relationship != 'M:M' || !config.edit_mode ? '' : m('i', {
                        class: 'fa fa-trash-o light-blue pl1 hover-blue pointer',
                        onclick: entry.delete.bind(this, rec)
                    }),

                    !field.attr || !field.attr.href ? '' : m('a', {
                        href: sprintf(field.attr.href, field.value)
                    }, m('i', {class: 'icon-crosshairs light-blue hover-blue pointer'})),
                    ds.base.schema != 'urd' || rec.table.name != 'database_' || field.name != 'name' ? '' : m('a', {
                        href: '#/' + (rec.columns.alias ? rec.columns.alias : rec.columns.name)
                    }, m('i', {class: 'icon-crosshairs light-blue hover-blue pointer'}))
                ])
            ]),
            !field.foreign_key || !field.expanded ? null : m('tr', [
                m('td'),
                m('td', {
                    colspan: 3
                }, [
                    m(entry, {record: field.relation})
                ])
            ])
        ]
    }
}

module.exports = Field

var m = require('mithril')
var ds = require('./datastore.js')
var config = require('./config.js');
var showdown = require('showdown');
var numeral = require('numeral'); require('numeral/locales/no');
var moment = require('moment');
var sprintf = require("sprintf-js").sprintf
var Input = require('./input')
var _find = require('lodash/find');
