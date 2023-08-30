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

      if (key.constrained_columns.indexOf(field.name) > 0) {
        last_fk_col = key.constrained_columns.slice(-1)
        if (
          last_fk_col != field.name &&
          rec.fields[last_fk_col].nullable == true
        ) {
          return
        }
        key.foreign_idx = key.constrained_columns.indexOf(field.name)
        keys.push(key)
      }
    })

    // Sets conditions based on values of the other
    // columns in the foreign key
    keys.forEach(function(key) {
      $.each(key.constrained_columns, function(i, column) {
        if (column === field.name) return
        var col = rec.fields[column]
        var cond
        if (col.value != null && column in rec.fields) {
          var pkcol = field.fkey.referred_columns.slice(-1)[0]

          if (key.referred_table == field.fkey.referred_table) {
            cond = key.referred_columns[i] + " = '" + col.value + "'"
          } else {
            cond = pkcol + ' in (select ' + key.referred_columns[key.foreign_idx]
            cond += ' from ' + key.referred_table + ' where ' + key.constrained_columns[i]
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
    field.invalid = field.invalid || false
    field.errormsg = field.errormsg || ''
    if (field.editable == false) return
    if ((field.nullable || field.extra) && (value == '' || value == null)) {
      field.invalid = false
    } else if (
      !field.nullable && (value === '' || value === null) &&
      !field.source
    ) {
      field.errormsg = 'Feltet kan ikke stå tomt'
      field.invalid = true
    } else if (field.datatype == 'int' && field.format === 'byte') {
      field.errormsg = 'Må ha enhet (B, kB, MB, GB) til slutt'
      field.invalid = false
    } else if (field.datatype == 'int') {
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
    } else if (
      field.datatype == 'str' && 
      field.attrs.placeholder == 'yyyy(-mm(-dd))'
    ) {
      if (
        dayjs(value, 'YYYY-MM-DD', true).isValid() == false &&
        dayjs(value, 'YYYY-MM', true).isValid() == false &&
        dayjs(value, 'YYYY', true).isValid() == false
      ) {
        field.errormsg = 'Feil datoformat'
        field.invalid = true
      }
    }
  },

  view: function(vnode) {
    var rec = vnode.attrs.rec
    delete vnode.attrs.rec
    var fieldname = vnode.attrs.fieldname
    var field = rec.fields[fieldname]

    if (
      !vnode.attrs.placeholder &&
      field.extra == 'auto_increment' &&
      field.element != 'select'
    ) {
      vnode.attrs.placeholder = 'autoincr.'
    }

    vnode.attrs.required = field.extra != 'auto_increment' && !field.nullable
    vnode.attrs.value = field.value
    vnode.attrs.disabled = !field.editable
    vnode.attrs.style = vnode.attrs.style || {}
    vnode.attrs['data-table'] = rec.table.name
    vnode.attrs['data-dirty'] = field.dirty

    var has_idx = false
    $.each(rec.table.indexes, function(i, idx) {
      if (idx.columns[0] === field.name) {
        has_idx = true
        if (idx.unique) {
          field.unique = true
        }
      }
    })

    if (field.element == 'select' && (field.options || field.optgroups)) {
      var filtered_optgroups
      var optgroup_field = rec.fields[field.optgroup_field]

      if (field.optgroups && field.optgroup_field && optgroup_field.value) {
        filtered_optgroups = field.optgroups.filter(function(optgroup) {
          return optgroup.label == optgroup_field.value
        })
      } else {
        filtered_optgroups = field.optgroups
      }

      var option = field.options.find(function(opt) {
        return opt.value == field.value
      })

      vnode.attrs.options = field.options
      vnode.attrs.optgroups = filtered_optgroups
      vnode.attrs.text = field.text
      vnode.attrs.label = field.label
      vnode.attrs.clear = true
      vnode.attrs.onchange = function(event) {
        var idx = event.target.selectedIndex
        if (field.optgroup_field) {
          var optgroup = $(':selected', event.target)
            .closest('optgroup').data('value')
          rec.fields[field.optgroup_field].value = optgroup
        }
        if (event.target.value == field.value) {
          return
        }
        var text = event.target.options[idx].text
        field.text = text
        Field.update(event.target.value, field.name, rec)
        Input.validate(event.target.value, field)
      }

      return vnode.attrs.disabled
        ? m('input', {
          disabled: true, value: option ? option.label : field.value
        })
        : m(Select, {...vnode.attrs})
    } else if (field.element === 'select' || has_idx) {

      if (!field.text) field.text = field.value

      vnode.attrs.item = field
      vnode.attrs.text = field.text
      vnode.attrs.hide_options = field.unique
      vnode.attrs.ajax = {
        url: 'options',
        data: {
          schema: ds.base.schema,
          base: ds.base.name,
          table: rec.table.name,
          column: field.name,
          condition: Input.get_condition(rec, field)
        }
      }
      vnode.attrs.onchange = function(event) {
        var value = $(event.target).data('value')
        var options

        // handle self referencing fields
        if (value === undefined) value = event.target.value

        field.text = event.target.value

        if (field.value === value) {
          return
        }

        Field.update(value, field.name, rec)

        if (field.unique) {
          options = JSON.parse(event.target.dataset.options)
          for (idx in options) {
            if (value == options[idx].value) {
              field.invalid = true
              field.errormsg = 'Ikke unik verdi'
            }
          }
        }
        Input.validate(value, field)
      }
      vnode.attrs.onclick = function(event) {
        if (event.target.value === '') {
          $(event.target).autocomplete('search', '')
        }
      }

      return m(Autocomplete, {...vnode.attrs})
    } else if (
      (field.datatype == 'json' || get(field, 'attrs.data-type') == 'json') &&
        get(field, 'attrs.data-format') == 'yaml'
    ) {
      vnode.attrs.id = field.name
      vnode.attrs['data-pkey'] = rec.pkey
      vnode.attrs.class = vnode.attrs.class + ' ba b--light-silver'
      vnode.attrs.editable = true
      vnode.attrs.lang = 'yaml'
      vnode.attrs.value = yaml.dump(JSON.parse(field.value))
      vnode.attrs.onchange = function(value) {
        value = JSON.stringify(yaml.load(value))
        Field.update(value, field.name, rec)
      }

      return m(Codefield, {...vnode.attrs})

    } else if (field.datatype == 'json' || get(field, 'attrs.data-format') == 'json') {

      vnode.attrs.field = field
      vnode.attrs.rec = rec
      vnode.attrs.value = JSON.parse(field.value)
      vnode.attrs.onchange = function(value) {
        Field.update(value, field.name, rec)
      }

      return m(JSONed, {...vnode.attrs})
    } else if (field.element == 'textarea') {
      text = field.value ? marked.parse(field.value) : ''

      vnode.attrs.class = 'w5'
      vnode.attrs.onchange = function(event) {
        Field.update(event.target.value, field.name, rec)
        Input.validate(event.target.value, field)
        event.stopPropagation()
      }

      return vnode.attrs.disabled ? m.trust(text) : m('textarea', {...vnode.attrs})
    } else if (field.element == 'input' && field.attrs.type == 'checkbox') {
      vnode.attrs.checked = +field.value
      vnode.attrs.indeterminate = field.value === null ? true : false
      vnode.attrs.onclick = function(event) {
        var cb = event.target
        if (field.nullable && cb.readOnly) cb.checked=cb.readOnly=false;
        else if (field.nullable && !cb.checked) cb.readOnly=cb.indeterminate=true;
      }
      vnode.attrs.onchange = function(event) {
        var cb = event.target
        var value = cb.indeterminate ? null : cb.checked ? 1 : 0
        Field.update(value, field.name, rec)
        Input.validate(value, field)
      }

      return m('input[type=checkbox][name=' + field.name + ']', {...vnode.attrs})
    } else if (field.element == 'input' && field.attrs.type == 'date') {
      vnode.attrs.value = typeof field.value === 'object' && field.value !== null
        ? field.value.date
        : field.value
      vnode.attrs.dateFormat = 'yy-mm-dd'
      vnode.attrs.onchange = function(event) {
        var value = event.target.value
        if (field.value && value === field.value.substr(0, 10)) {
          event.redraw = false
          return
        }
        Field.update(value, field.name, rec)
        Input.validate(value, field)
      }

      return m('input[type=date]', {...vnode.attrs})
    } else {
      var size = field.datatype == 'float' || field.datatype == 'Decimal'
        ? field.size + 1
        : field.size

      vnode.attrs.value = typeof field.value === 'string'
        ? field.value.replace(/\n/g, '\u21a9')
        : field.value

      vnode.attrs.size = size ? size : null
      vnode.attrs.maxlength = size ? size : ''
      vnode.attrs.class = 'border-box mw5 truncate'
      vnode.attrs.onchange = function(event) {
        var value = event.target.value.replace(/\u21a9/g, "\n")
        Field.update(value, field.name, rec)
        Input.validate(value, field)
      }

      return m('input', {...vnode.attrs})
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
var Codefield = require('./codefield')
var yaml = require('js-yaml')
