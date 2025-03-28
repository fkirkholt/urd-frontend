var Field = {

  onupdate: function(vnode) {
    var rec = vnode.attrs.rec
    var colname = vnode.attrs.colname
    var field = rec.fields[colname]

    if (field.element == 'textarea' && field.expanded && !field.foldable) {
      var selector = '[data-field="' + rec.table.name + '.' + field.name + '"]'

      for (let i of document.querySelectorAll(selector + ".collapsible ol, "  + 
                                              selector + " .collapsible ul li p:first-child")) {
        let t = i.parentElement
        if (t.childElementCount > 1) {
          t.className = "fold open"
          i.onclick = function(event) {
            event.stopPropagation()
            t.classList.toggle("open")
            t.classList.toggle("close")
          } 
          field.foldable = true
        }
      }
    }
  },

  update: function(value, field_name, rec) {

    var field = rec.fields[field_name]

    field.value = value
    if (value == '') {
      field.value = null
    }
    field.invalid = false
    field.errormsg = ''

    field.dirty = true
    rec.dirty = true
    ds.table.dirty = true

    // Update grid cell
    if (rec.columns && field.name in rec.columns) {
      rec.columns[field.name].text = field.text
        ? field.text.replace(/\u00a0/g, '')
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
        other_field.fkey.constrained_columns.length > 1
      ) {
        // If the field is part of the dropdowns foreign keys
        if (other_field.fkey.constrained_columns.includes(field.name)) {
          if ('value' in rec.fields[name] && rec.fields[name].value !== null) {
            rec.fields[name].value = null
            rec.fields[name].dirty = true
            if (name in rec.columns) {
              rec.columns[name].value = null
              rec.columns[name].text = null
            }
          }
          m.request({
            method: 'GET',
            url: 'options',
            params: {
              q: '',
              limit: 1000,
              schema: ds.base.schema,
              base: ds.base.name,
              table: rec.table.name,
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

  display_value: function(field, rec, remove_p = true) {
    // field.value is not set for cells in grid
    var value = field.value

    if (field.text !== null && field.text !== undefined) {
      value = typeof(field.text) == 'string' ? field.text.trim() : field.text
    } else if (field.element == 'input' && field.attrs.type == 'checkbox') {
      var icon = value == 0 ? 'fa-square-o' 
        : value == 1 ? 'fa-check-square-o'
          : 'fa-minus-square-o'
      value = m('i', { class: 'fa ' + icon })
    } else if (
      field.datatype == 'json' &&
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
    } else if (field.value && (
      (field.datatype == 'str' && !field.size && field.expanded) ||
      get(field, 'attrs.data-format') == 'markdown'
    )) {
      let result = field.value.replace(/(^|\s)(\:[\w+:-]*\:)/gi, function (x, p1, p2, p3) {
        return p1 + '<mark class="gray" data-value="' + p2 + '">' + p2 + '</mark>';
      });

      // Hack to make marked format first list item like the rest.
      // There must be text in front of the list
      if (!remove_p) {
        result = 'tekst\n\n' + result
      }

      result = marked.parse(result)

      if (remove_p) {
        result = result.replace('<p>', '').replace('</p>', '')
      } else {
        // Remove text inserted in hack above
        result = result.replace(/^tekst\s/, '')
      }

      value = m.trust(result)
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

    $.each(field.fkey.referred_columns, function(i, ref_field) {
      var fk_field = field.fkey.constrained_columns[i]
      var value = rec.fields[fk_field].value
      filters.push(field.fkey.referred_table + '.' + ref_field + " = " + value)
    })

    m.request({
      method: "GET",
      url: "table",
      params: {
        base: field.fkey.base || ds.base.name,
        schema: field.fkey.schema,
        table: field.fkey.referred_table,
        filter: filters.join(';')
      }
    }).then(function(result) {
      var table = result.data
      if (table.count_records == 0) {
        alert("Record not found")
      }
      var pk = table.records[0].pkey
      m.request({
        method: "GET",
        url: "record",
        params: {
          base: field.fkey.base || ds.base.name,
          schema: field.fkey.schema,
          table: field.fkey.referred_table,
          // betingelse: betingelse,
          pkey: JSON.stringify(pk)
        }
      }).then(function(result) {
        var record = result.data
        var field
        // Get virtual columns from table.fields
        for (let field_name in table.fields) {
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
    var base

    if (field.fkey) {
      if (
        (ds.base.system == 'postgresql' && field.fkey.referred_schema != 'public') ||
        (ds.base.system == 'mssql' && field.fkey.referred_schema != 'dbo')
      ) {
        base = ds.base.cat + '.' + field.fkey.referred_schema
      } else if (['postgresql', 'sqlite', 'duckdb'].includes(ds.base.system)) {
        base = ds.base.name
      } else {
        base = field.fkey.referred_schema
      }
      url = '#/' + base + '/data/' + field.fkey.referred_table + '?'
      $.each(field.fkey.referred_columns, function(i, colname) {
        var fk_field = field.fkey.constrained_columns[i]
        url += colname + '=' + rec.fields[fk_field].value
        if (i !== field.fkey.referred_columns.length - 1) url += '&'
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
      percentage = (number * 100).toFixed(1)
    }

    return percentage
  },

  view: function(vnode) {
    var rec = vnode.attrs.rec
    var colname = vnode.attrs.colname
    var label = vnode.attrs.label
    var field = rec.fields[colname]
    var href = field.attrs['data-href']

    field.attrs = field.attrs || {}
    field.attrs.class = 'dib'
    if (field.size && field.size > 64) {
      field.attrs.class += ' w-100'
    }

    // Don't show fields used below threshold value
    if (field.use && field.use < config.threshold) {
      return
    }
    // Don't show fields where one value is used very frequent
    // Disabled until we get ui for choosing this
    // if (field.frequency && field.frequency > (1 - config.threshold)) {
    //   return
    // }
    // Don't show columns that has no values
    if (field.use === 0) {
      return
    }

    // Show hidden fields only in edit mode
    if (rec.table.fields[colname].hidden && !config.edit_mode) return

    // determine if field should be displayed or edited
    var display = !rec.table.privilege.update || field.virtual ||
      rec.readonly || !config.edit_mode || !field.editable

    if (href) {
      for (fieldname in rec.fields) {
        href = href.replace('{'+fieldname+'}', rec.fields[fieldname].value)
      }
    }

    var filepath_idx_name = rec.table.name + '_' + field.name + '_filepath_idx'
    field.is_filepath = (filepath_idx_name in rec.table.indexes) 

    return [
      (
        (!config.edit_mode && config.hide_empty && field.value == null) ||
          (field.fkey && field.expanded && label)
      ) ? '' : [
          m('label', {
            'data-expandable': field.expandable && field.value !== null,
            'data-field': rec.table.name + '.' + field.name,
            class: [
              label ? 'dib ml3 mt1' : 'ml2 mt1',
              field.element == 'textarea' ? 'w-100' : '', 
            ].join(' ')
          }, [
              label ? [
                m('b', { 
                  title: field.attrs.title,
                  'data-after': ':', 
                  class: [
                    'db mr2 nowrap',
                    field.expandable && field.value ? 'underline pointer' : '',
                    field.element == 'textarea' && !config.edit_mode ? 'underline pointer' : ''
                  ].join(' '),
                  onclick: function() {
                    if (field.fkey && field.expandable && field.value) {
                      Field.toggle_fkey(rec, colname)
                    } 
                    if (field.element == 'textarea' && !config.edit_mode) {
                      field.expanded = !field.expanded
                    }
                    if (!field.expanded) {
                      field.foldable = false
                    }
                  }
                }, [
                  label,
                ]),
                field.element == 'textarea' && field.expanded && !config.edit_mode
                ? [ 
                  m('span', {
                    class: 'moon-gray ml3 pointer link dim hover-blue',
                    onclick: function() {
                      var selector = '[data-field="' + rec.table.name + '.' + field.name + '"]'

                      for (let i of document.querySelectorAll(selector + ".collapsible ol, "  + 
                                                              selector + " .collapsible ul li p:first-child")) {
                        let t = i.parentElement
                        t.className = "fold close"
                      }
                    }
                  }, 'Collapse all'),
                  m('span', {
                    class: 'moon-gray ml3 pointer link dim hover-blue',
                    onclick: function() {
                      var selector = '[data-field="' + rec.table.name + '.' + field.name + '"]'

                      for (let i of document.querySelectorAll(selector + ".collapsible ol, "  + 
                                                              selector + " .collapsible ul li p:first-child")) {
                        let t = i.parentElement
                        t.className = "fold open"
                      }
                    }
                  }, 'Expand all'),
                ]
                : ''
              ] : m('i', {
                class: [
                  'fa fa-fw',
                  field.expanded ? 'fa-angle-down' : 'fa-angle-right'
                ].join(' '),
                onclick: function() {
                  if (field.fkey && field.expandable && field.value) {
                    Field.toggle_fkey(rec, colname)
                  } 
                }
              }),
              !field.use || !config.admin ? '' : m('span', {
                class: 'ml2 light-silver'
              }, '(' + Field.get_percentage(field.use) + '%)'),
              !display
                ? m(Input, { rec: rec, fieldname: colname, ...field.attrs })
                : (field.expandable && field.fkey) || field.attrs['data-format'] == 'link'
                  ? m('a', {
                    class: [
                      'dib mw6',
                      (field.expanded) ? '' : 'truncate'
                    ].join(' '),
                    'data-expandable': (field.element == 'textarea'),
                    'data-expanded': field.expanded,
                    'data-value': field.value,
                    href: field.attrs['data-href'] ? href 
                      : field.fkey ? Field.get_url(field, rec) 
                      : '#',
                    onclick: function() {
                      if (field.element == 'textarea') {
                        field.expanded = !field.expanded
                      }
                    }
                  }, Field.display_value(field, rec)) 
                  : field.datatype == 'date' || field.attrs['data-format'] == 'ISO 8601'
                    ? m('time', {
                      datetime: field.value,
                      class: 'db'
                    }, Field.display_value(field, rec))
                    : ['json', 'yaml'].includes(field.attrs['data-format'])
                      ? Field.display_value(field, rec)
                      : m('data', {
                        class: [
                          'db pr3 collapsible',
                          (field.expanded) ? 'bl b--moon-gray pl3' : 'truncate',
                          (field.is_filepath) ? 'underline pointer blue' : ''
                        ].join(' '),
                        value: field.element == 'textarea' ? null : field.value,
                        onclick: function() {
                          if (field.is_filepath) {
                            data = {}
                            data.base = rec.base_name;
                            data.table = rec.table_name;
                            data.column = field.name
                            data.pkey = JSON.stringify(rec.pkey);

                            params = Object.keys(data).map(function(k) {
                              return k + '=' + data[k]
                            }).join('&')
                            window.open('/file?' + params, '_blank')
                          }
                        }
                      }, Field.display_value(field, rec)),
              // Show trash bin for field from cross reference table
              rec.table.relationship != 'M:M' || !config.edit_mode
                ? ''
                : m('i', {
                  class: 'fa fa-trash-o light-blue pl1 hover-blue pointer',
                  onclick: Record.delete.bind(this, rec)
                }),
            ]),

        ],
      // Expanded record
      !field.fkey || !field.expanded ? null : m('fieldset', {
        name: colname,
        class: [
          'flex flex-wrap w-100',
          label ? '' : 'bt-0 br-0 bb-0 bl-1 ml3'
        ].join(' ')
      }, [
        !label ? null : m('legend', {
          class: 'b underline pointer',
          onclick: function() {
            Field.toggle_fkey(rec, colname)
          }
        }, label),
        m(Record, { record: field.relation })
      ]),
    ]
  }
}

export default Field

import config from './config.js'
import { marked } from 'marked'
import yaml from 'js-yaml'
import Input from './input.js'
import Record from './record.js'
import get from 'just-safe-get'
import JSONed from './jsoned.js'
import Codefield from './codefield.js'
