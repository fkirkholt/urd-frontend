var Field = {

  update: function(value, field_name, rec) {

    var field = rec.fields[field_name]

    field.value = value
    field.invalid = false
    field.errormsg = ''

    field.dirty = true
    rec.dirty = true
    ds.table.dirty = true

    // Update grid cell
    if (rec.columns && field.name in rec.columns) {
      rec.columns[field.name].text = field.text
        ? field.text
        : typeof value == "string"
          ? value.substring(0, 256)
          : value
      rec.columns[field.name].value = value
    }

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
            rec.columns[name].value = null
            rec.columns[name].text = null
          }
          m.request({
            method: 'GET',
            url: 'options',
            params: {
              q: '',
              limit: 1000,
              schema: ds.base.schema,
              base: ds.base.name,
              table: ds.table.name,
              column: other_field.name,
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

    // Autosaves 
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

  display_value: function(field, rec) {
    // field.value is not set for cells in grid
    value = field.value

    if (field.text !== null && field.text !== undefined) {
      value = field.text
    } else if (field.element == 'input[type=checkbox]') {
      var icon = value == 0 ? 'fa-square-o' : 'fa-check-square-o'
      value = m('i', { class: 'fa ' + icon })
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
      (field.datatype == 'json' || get(field, 'attrs.data-type') == 'json') &&
        get(field, 'attrs.data-format') == 'yaml'
    ) {
      value = m(Codefield, {
        id: 'yaml',
        class: field.attrs.class || '',
        'data-pkey': rec.pkey,
        editable: false,
        lang: 'yaml',
        value: yaml.dump(JSON.parse(field.value))
      })
    } else if (
      get(field, 'attrs.data-format') == 'markdown' &&
      field.expanded
    ) {
      value = m.trust(marked.parse(field.value))
    } else if (field.expanded) {
      if (typeof(value) == 'string') {
        value = m.trust(value.replace("\n", '<br>'))
      }
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
      // Don't send request again if already loaded
      if (field.relation) {
        return
      }
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
        var field
        // Get virtual columns from table.fields
        for (field_name in table.fields) {
          field = table.fields[field_name]
          if (record.fields[field.name] === undefined) {
            record.fields[field.name] = field
          }
        }
        record.readonly = true
        record.table = table
        table.records[0] = Object.assign(table.records[0], record)
        rec.fields[fieldname].relation = record
        Record.get_relations_count(record)
      })
    })
  },

  // Get url to foreign key field
  get_url: function(field, rec) {
    var url
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
      url = '#/' + base + '/data/' + field.fkey.table + '?'
      $.each(field.fkey.primary, function(i, colname) {
        var fk_field = field.fkey.foreign[i]
        url += colname + '=' + rec.fields[fk_field].value
        if (i !== field.fkey.primary.length - 1) url += '&'
      })
    }

    return url
  },

  is_mandatory: function(field) {
    // TODO: Hva gjør jeg med rights her?
    var mandatory = !field.nullable && !field.extra && field.editable
      && !field.source == true

    return mandatory
  },

  // Get percentage with precision 2 from number
  get_percentage: function(number) {
    var percentage
    if (number == 1) {
      percentage = 100
    } else if (number) {
      percentage = (number * 100).toPrecision(2)
    }

    return percentage
  },

  view: function(vnode) {
    var rec = vnode.attrs.rec
    var colname = vnode.attrs.colname
    var label = vnode.attrs.label
    var field = rec.fields[colname]

    field.attrs = field.attrs || {}
    field.attrs.rec = rec
    field.attrs.name = colname

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

    return [
      // TODO: sto i utgangspunktet list.betingelse. 
      // Finn ut hva jeg skal erstatte med.
      (
        (!config.edit_mode && config.hide_empty && field.value === null) ||
          (field.fkey && field.expanded)
      ) ? '' : m('div.field', {class: 'mt1'}, [
          // Show label
          m('label', {
            class: [
              'f6 pr1 v-top',
              field.invalid ? 'invalid' : field.dirty ? 'dirty' : '',
              !config.admin ? 'max-w5 truncate' : '',
              field.expandable && field.value !== null ? 'underline pointer' : '',
            ].join(' '),
            onclick: function() {
              if (field.fkey && field.expandable && field.value) {
                Field.toggle_fkey(rec, colname)
              } 
            }
          }, [
              m('i.fa', {class: ''}),
              get(field, 'attrs.title')
                ? m('abbr', { title: field.attrs.title }, label)
                : label,
              !field.use || !config.admin ? '' : m('span', {
                class: 'ml2 light-silver'
              }, '(' + Field.get_percentage(field.use) + '%)'),
              ':'
            ]),
          // Show icons signifying mandatory, modified, or illegal value
          m('span', {
            class: 'v-top'
          }, [
              field.invalid && field.value == null
                ? m('i', { class: 'fa fa-asterisk red' })
                : field.invalid
                  ? m('i', {
                    class: 'fa fa-warning ml1 red',
                    title: field.errormsg
                  })
                  : field.dirty
                    ? m('i', { class: 'fa fa-pencil ml1 light-gray' })
                    : Field.is_mandatory(field) && config.edit_mode
                      ? m('i', { class: 'fa fa-asterisk f7 light-gray' })
                      : ''
            ]),
          // Show field value
          m('span.dib', {
            class: [
              'max-w7 v-top',
              (field.element == 'textarea' &&
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
              (rec.table.privilege.update == 0 || rec.readonly || !config.edit_mode ||
              !field.editable)
                ? m('span', {...field.attrs}, Field.display_value(field, rec))
                : m(Input, {...field.attrs}),
              !field.expandable || field.value === null
                ? ''
                : m('a', {
                  class: 'icon-crosshairs light-blue hover-blue pointer link',
                  href: Field.get_url(field, rec),
                  onclick: function(e) {
                    // Delete active table to avoid flicker
                    delete ds.table
                  }
                }),

              // Show trash bin for field from cross reference table
              rec.table.relationship != 'M:M' || !config.edit_mode
                ? ''
                : m('i', {
                  class: 'fa fa-trash-o light-blue pl1 hover-blue pointer',
                  onclick: Record.delete.bind(this, rec)
                }),

              !field.attrs || !field.attrs.href ? '' : m('a', {
                href: sprintf(field.attrs.href, field.value)
              }, m('i', {
                  class: 'icon-crosshairs light-blue hover-blue pointer'
                })),
            ])
        ]),
      // Expanded record
      !field.fkey || !field.expanded ? null : m('fieldset', [
        m('legend', {
          class: 'underline pointer',
          onclick: function() {
            Field.toggle_fkey(rec, colname)
          }
        }, label),
        m(Record, { record: field.relation })
      ])
    ]
  }
}

module.exports = Field

var config = require('./config')
var marked = require('marked')
var sprintf = require("sprintf-js").sprintf
var yaml = require('js-yaml')
var Input = require('./input')
var Record = require('./record')
var get = require('just-safe-get')
var JSONed = require('./jsoned')
var Codefield = require('./codefield')
