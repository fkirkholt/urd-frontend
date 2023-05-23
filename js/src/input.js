var Input = {

    // Get condition to collect options for a foreign key field.
    get_condition: function(rec, field) {

        var conditions = []

        // Find the foreign keys (usually only one) that is set on
        // this column. This requires the column to be the last
        // column in the foreign key.
        var keys = []
        Object.keys(rec.table.fkeys).map(function(fk_name) {
            var key = rec.table.fkeys[fk_name]

            if (key.foreign.indexOf(field.name) > 0) {
                last_fk_col = key.foreign.slice(-1)
                if (
                    last_fk_col != field.name && 
                    rec.fields[last_fk_col].nullable == true
                ) {
                    return
                }
                key.foreign_idx = key.foreign.indexOf(field.name)
                keys.push(key)
            }
        })

        // Sets conditions based on values of the other
        // columns in the foreign key
        keys.forEach(function(key) {
            $.each(key.foreign, function(i, column) {
                if (column === field.name) return
                var col = rec.fields[column]
                var cond
                if (col.value != null && column in rec.fields) {
                    var pkcol = field.fkey.primary.slice(-1)[0]

                    if (key.table == field.fkey.table) {
                        cond = key.primary[i] + " = '" + col.value + "'"
                    } else {
                        cond = pkcol + ' in (select ' 
                             + key.primary[key.foreign_idx]
                        cond += ' from ' + key.table + ' where ' 
                              + key.foreign[i]
                        cond += " = '" + col.value + "')"
                    }
                    conditions.push(cond)
                }
            })
        })

        return conditions.join(' AND ')
    },

    // Validate field and check if it's mandatory
    validate: function(value, field) {
        field.invalid = false
        field.errormsg = ''
        if (field.editable == false) return
        if ((field.nullable || field.extra) && (value == '' || value == null)) {
            field.invalid = false
        } else if (
            !field.nullable && (value === '' || value === null) && 
            !field.source
        ) {
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

        if (
            !placeholder && 
            field.extra == 'auto_increment' && 
            field.element != 'select'
        ) {
            placeholder = 'autoincr.'
        }

        if (field.element == 'select' && (field.options || field.optgroups)) {
            var filtered_optgroups
            var optgroup_field = rec.fields[field.optgroup_field]

            if (
                field.optgroups && field.optgroup_field && 
                optgroup_field.value
            ) {
                filtered_optgroups = field.optgroups.filter(function(optgroup) {
                    return optgroup.label == optgroup_field.value
                })
            } else {
                filtered_optgroups = field.optgroups
            }

            var option = field.options.find(function(opt) {
                return opt.value == field.value
            })

            maxlength = field.options && field.options.length 
                ? field.options.map(function(el) {
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
                    // style: field.expandable 
                    //     ? 'width: calc(100% - 30px)' : '',
                    class: [
                        'max-w7',
                        maxlength >= 30 ? 'w-100' : '',
                        field.attrs ? field.attrs.class : ''
                    ].join(' '),
                    style: field.attrs ? field.attrs.style : '',
                    title: field.attrs ? field.attrs.title : '',
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
                        var idx = event.target.selectedIndex
                        if (field.optgroup_field) {
                            var optgroup = $(':selected', event.target)
                                .closest('optgroup').data('value')
                            rec.fields[field.optgroup_field].value = optgroup
                        }
                        if (event.target.value == field.value) {
                            return
                        }
                        Input.validate(event.target.value, field)
                        var text = event.target.options[idx].text
                        var coltext = event.target.options[idx].dataset.coltext
                        field.text = text
                        field.coltext = coltext
                        Field.update(event.target.value, field.name, rec)
                    }
            })
        } else if (field.element === 'select') {

            if (!field.text) field.text = field.value

            var key = field.fkey ? field.fkey.primary: [field.name]
            key_json = JSON.stringify(key)

            return m(Autocomplete, {
                name: field.name,
                style: field.expandable 
                    ? 'width: calc(100% - 30px)' : 'width: 100%',
                required: !field.nullable,
                class: [
                    'max-w7 border-box',
                    field.attrs ? field.attrs.class : ''
                ].join(' '),
                style: field.attrs ? field.attrs.style : '',
                title: field.attrs ? field.attrs.title : '',
                item: field,
                value: field.value,
                text: field.text,
                placeholder: 'Velg',
                disabled: readOnly,
                ajax: {
                    url: "select",
                    data: {
                        limit: 1000,
                        schema: field.fkey ? field.fkey.schema : '',
                        base: (field.fkey && field.fkey.base)
                            ? field.fkey.base
                            : rec.base_name,
                        table: field.fkey ? field.fkey.table : rec.table_name,
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
                style: "width: 330px; height: 400px;",
                value: JSON.parse(field.value),
                onchange: function(value) {
                    Field.update(value, field.name, rec)
                }
            })
        } else if (field.element == 'textarea') {
            text = field.value ? marked.parse(field.value) : ''

            return readOnly ? m.trust(text) : m('textarea', {
                name: field.name,
                class: [
                    'ba b--light-grey w-100 max-w7',
                    field.format == 'markdown' ? 'code' : '',
                    field.attrs ? field.attrs.class : '',
                ].join(' '),
                style: field.attrs ? field.attrs.style : '',
                title: field.attrs ? field.attrs.title : '',
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
                class: field.attrs ? field.attrs.class : '',
                style: field.attrs ? field.attrs.style : '',
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
                class: [
                    'w5',
                    field.attrs ? field.attrs.class : '',
                ].join(' '),
                style: field.attrs ? field.attrs.style : '',
                title: field.attrs ? field.attrs.title : '',
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
                title: field.attrs ? field.attrs.title : '',
                // required: !field.nullable && field.extra !== 'auto_increment',
                class: [
                    !field.nullable && field.value === '' ? 'invalid' : '',
                    field.size >= 30 ? 'w-100' : '',
                    'min-w3 max-w7 border-box',
                    field.attrs ? field.attrs.class : ''
                ].join(' '),
                style: [
                    'width: ' + width,
                    'text-overflow: ellipsis',
                    field.attrs ? field.attrs.style : ''
                ].join(';'),
                disabled: readOnly,
                value: value,
                placeholder: get(field, 'attrs.placeholder') || placeholder,
                pattern: get(field, 'attrs.pattern'),
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

var Select = require('./select')
var Autocomplete = require('./seeker')
var JSONed = require('./jsoned')
var Field = require('./field')
var get = require('just-safe-get')
var marked = require('marked')
var dayjs = require('dayjs')
var customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
