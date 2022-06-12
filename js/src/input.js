var Input = {

    /**
     * Get conditions to collect data from a foreign key field
     *
     * param {Object} rec - record
     * param {Object} field - foreign key field
     */
    get_condition: function(rec, field) {

        var kandidatbetingelser = []
        var filter

        var keys = []
        Object.keys(rec.table.foreign_keys).map(function(label) {
            key = rec.table.foreign_keys[label]

            if (key.foreign.indexOf(field.name) > 0) {
                last_fk_col = key.foreign.slice(-1)
                if (last_fk_col != field.name && rec.fields[last_fk_col].nullable == true) {
                    return
                }
                key.foreign_idx = key.foreign.indexOf(field.name)
                keys.push(key)
            }
        })

        $.each(keys, function(idx, key) {

            if (key.filter) {
                filter = key.filter
                $.each(rec.fields, function(name, field2) {
                    var re = new RegExp('\\b'+field2.table+'\\.'+field2.name+'\\b', 'g')
                    filter = filter.replace(re, "'"+field2.value+"'")
                    re = new RegExp('\!= null\\b', 'g')
                    filter = filter.replace(re, 'is not null')
                    re = new RegExp('\= null\\b', 'g')
                    filter = filter.replace(re, 'is null')
                })
                kandidatbetingelser.push(filter)
            }

            if (key.foreign && key.foreign.length > 1) {
                $.each(key.foreign, function(i, column) {
                    if (column === field.name) return
                    var condition
                    if (rec.fields[column].value != null && column in rec.fields) {
                        var col = field.foreign_key.primary.slice(-1)[0]

                        if (key.table == field.foreign_key.table) {
                            condition = key.primary[i] + " = '" + rec.fields[column].value + "'"
                        } else {
                            condition = col + ' in (select ' + key.primary[key.foreign_idx]
                            condition += ' from ' + key.table + ' where ' + key.foreign[i]
                            condition += " = '" + rec.fields[column].value + "')"
                        }
                        kandidatbetingelser.push(condition)
                    }
                })
            }
        })

        return kandidatbetingelser.join(' AND ')
    },

    validate: function(value, field) {
        field.invalid = false
        field.errormsg = ''
        if (field.editable == false) return
        if ((field.nullable || field.extra) && (value == '' || value == null)) {
            field.invalid = false
        } else if (!field.nullable && (value === '' || value === null) && !field.source) {
            field.errormsg = 'Feltet kan ikke stå tomt'
            field.invalid = true
        } else if (field.datatype == 'integer' && field.format === 'byte') {
            field.errormsg = 'Må ha enhet (B, kB, MB, GB) til slutt'
            field.invalid = false
        } else if (field.datatype == 'integer') {
            var pattern = new RegExp("^-?[0-9]*$")
            if (!pattern.test(value)) {
                field.errormsg = 'Feltet skal ha heltall som verdi'
                field.invalid = true
            }
        } else if (field.datatype == 'date') {
            if (dayjs(value, 'YYYY-MM-DD', true).isValid() == false) {
                field.errormsg = 'Feil datoformat'
                field.invalid = true
            }
        } else if (field.datatype == 'string' && field.placeholder == 'yyyy(-mm(-dd))') {
            if (
                dayjs(value, 'YYYY-MM-DD', true).isValid() == false &&
                dayjs(value, 'YYYY-MM', true).isValid() == false &&
                dayjs(value, 'YYYY', true).isValid() == false
            ) {
                field.errormsg = 'Feil datoformat'
                field.invalid = true
            }
        }
        if (field.invalid) {
            field.errormsg += '. Verdien er nå ' + value
        }
    },

    view: function(vnode) {
        var rec = vnode.attrs.rec
        var fieldname = vnode.attrs.fieldname
        var placeholder = vnode.attrs.placeholder
        var field = rec.fields[fieldname]
        var value
        var readOnly = !field.editable

        placeholder = placeholder || field.placeholder

        if (!placeholder && field.extra == 'auto_increment') {
            placeholder = 'autoincr.'
        }

        if (field.element == 'select' && (field.options || field.optgroups)) {
            var filtered_optgroups

            if (field.optgroups && field.optgroup_field && rec.fields[field.optgroup_field].value) {
                filtered_optgroups = field.optgroups.filter(function(optgroup) {
                    return optgroup.label == rec.fields[field.optgroup_field].value
                })
            } else {
                filtered_optgroups = field.optgroups
            }

            var option = field.options.find(function(opt) {
                return opt.value == field.value
            })

            maxlength = field.options && field.options.length ? field.options.map(function(el) {
                return el.label ? el.label.length : 0
            }).reduce(function(max, cur) {
                return Math.max(max, cur)
            }) : 0


            return readOnly
                ? m('input', {
                    disabled: true, value: option ? option.label : field.value
                })
                : m(Select, {
                    name: field.name,
                    // style: field.expandable ? 'width: calc(100% - 30px)' : '',
                    class: [
                        'max-w7',
                        maxlength >= 30 ? 'w-100' : '',
                    ].join(' '),
                    options: field.options,
                    optgroups: filtered_optgroups,
                    required: !field.nullable,
                    value: field.value,
                    text: field.text,
                    label: field.label,
                    clear: true,
                    placeholder: placeholder,
                    disabled: readOnly,
                    onchange: function(event) {
                        if (field.optgroup_field) {
                            var optgroup = $(':selected', event.target).closest('optgroup').data('value')
                            rec.fields[field.optgroup_field].value = optgroup
                        }
                        if (event.target.value == field.value) {
                            return
                        }
                        Input.validate(event.target.value, field)
                        var text = event.target.options[event.target.selectedIndex].text
                        var coltext = event.target.options[event.target.selectedIndex].dataset.coltext
                        field.text = text
                        field.coltext = coltext
                        Field.update(event.target.value, field.name, rec)
                    }
            })
        } else if (field.element === 'select') {

            if (!field.text) field.text = field.value

            key_json = JSON.stringify(field.foreign_key ? field.foreign_key.primary: [field.name])

            return m(Autocomplete, {
                name: field.name,
                style: field.expandable ? 'width: calc(100% - 30px)' : 'width: 100%',
                required: !field.nullable,
                class: 'max-w7 border-box',
                item: field,
                value: field.value,
                text: field.text,
                placeholder: 'Velg',
                disabled: readOnly,
                ajax: {
                    url: "select",
                    data: {
                        limit: 1000,
                        schema: field.foreign_key ? field.foreign_key.schema : '',
                        base: (field.foreign_key && field.foreign_key.base)
                            ? field.foreign_key.base
                            : rec.base_name,
                        table: field.foreign_key ? field.foreign_key.table : rec.table_name,
                        alias: field.name,
                        view: field.view,
                        column_view: field.column_view,
                        key: key_json,
                        condition: Input.get_condition(rec, field)
                    }
                },
                onchange: function(event) {
                    var value = $(event.target).data('value')

                    // handle self referencing fields
                    if (value === undefined) value = event.target.value

                    field.text = event.target.value
                    field.coltext = $(event.target).data('coltext')

                    if (field.value === value) {
                        return
                    }

                    Input.validate(value, field)
                    Field.update(value, field.name, rec)
                },
                onclick: function(event) {
                    if (event.target.value === '') {
                        $(event.target).autocomplete('search', '')
                    }
                }

            })
        } else if (field.datatype == 'json') {
            return m(JSONed, {
                name: field.name,
                field: field,
                rec: rec,
                style: "width: 350px; height: 400px;",
                value: JSON.parse(field.value),
                onchange: function(value) {
                    Field.update(value, field.name, rec)
                }
            })
        } else if (field.element == 'textarea' && field.expanded === true) {
            var converter = new showdown.Converter()
            text = converter.makeHtml(field.value)

            return readOnly ? m.trust(text) : m('textarea', {
                name: field.name,
                class: [
                    'ba b--light-grey w-100 max-w7',
                    field.format == 'markdown' ? 'code' : ''
                ].join(' '),
                required: !field.nullable,
                value: field.value,
                disabled: readOnly,
                onchange: function(event) {
                    Input.validate(event.target.value, field)
                    Field.update(event.target.value, field.name, rec)
                }
            })

        } else if (
            (field.element == 'input' && field.attr.type == 'checkbox') ||
            field.element == 'input[type=checkbox]'
        ) {
            return m('input[type=checkbox][name=' + field.name +']', {
                disabled: readOnly,
                onchange: function(event) {
                    var value = event.target.checked ? 1 : 0
                    Input.validate(value, field)
                    Field.update(value, field.name, rec)
                },
                checked: +field.value
            })
        } else if (field.element == 'input[type=date]') {
            var value = typeof field.value === 'object' && field.value !== null
                ? field.value.date
                : field.value
            return m('input[type=date]', {
                name: field.name,
                class: 'w5',
                // required: !field.nullable,
                disabled: readOnly,
                dateFormat: 'yy-mm-dd',
                value: typeof field.value === 'object' && field.value !== null
                    ? field.value.date
                    : field.value,
                onchange: function(event) {
                    var value = event.target.value
                    if (field.value && value === field.value.substr(0, 10)) {
                        event.redraw = false
                        return
                    }
                    Input.validate(value, field)
                    Field.update(value, field.name, rec)
                }
            })
        } else {
            var size = field.datatype == 'float' || field.datatype == 'decimal'
                ? field.size + 1
                : field.size
            var width = size ? Math.round(size * 0.6) + 'em' : ''

            value = typeof field.value === 'string'
                ? field.value.replace(/\n/g, '\u21a9')
                : field.value

            return m('input', {
                name: field.name,
                maxlength: size ? size : '',
                // required: !field.nullable && field.extra !== 'auto_increment',
                class: [
                    !field.nullable && field.value === '' ? 'invalid' : '',
                    field.size >= 30 ? 'w-100' : '',
                    'min-w3 max-w7 border-box',
                ].join(' '),
                style: [
                    'width: ' + width,
                    'text-overflow: ellipsis',
                ].join(';'),
                disabled: readOnly,
                value: value,
                placeholder: placeholder,
                onchange: function(event) {
                    value = event.target.value.replace(/\u21a9/g, "\n")
                    Input.validate(value, field)
                    Field.update(value, field.name, rec)
                }
            })
        }
    }
}

module.exports = Input

var Record = require('./record')
var Select = require('./select')
var Autocomplete = require('./seeker')
var JSONed = require('./jsoned')
var Field = require('./field')
var showdown = require('showdown')
var dayjs = require('dayjs')
var customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
