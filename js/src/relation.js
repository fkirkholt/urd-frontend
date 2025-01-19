var Relation = {

  toggle_heading: function(object) {
    object.expanded
      ? object.expanded = false
      : object.expanded = true
  },

  add: function(e, rel) {
    e.stopPropagation()
    var rec = Record.create(rel, true)
    if (!rec) return

    // Focus first input field in new record
    setTimeout(function() {
      $('tr[data-name=' + rel.name + '] > td > table > tr')
        .find('input,select,textarea')
        .first().trigger('focus')
    }, 100)

    rel.modus = 'edit'
  },

  draw_relation_table: function(rel, record) {
    var columns = []
    var count_columns = 0

    // count columns that should be shown
    $.each(rel.grid.columns, function(idx, field_name) {
      var field = rel.fields[field_name]
      if (!(field.defines_relation)) {
        columns.push(field)
      }
    })

    // Make list instead of table of relations if only one column shown
    // and this relation has no subordinate relations of its own
    if (
      columns.length == 1 && columns[0].fkey &&
      Object.keys(rel.relations).length == 0
    ) {
      rel.relationship = 'M:M'
      return Relation.draw_relation_list(rel, record)
    }

    return m('table', { class: 'w-100 collapse' }, [
      // draw header cells
      m('tr', { class: 'bb' }, [
        m('td'),
        rel.pkey.length == 0 ? '' : m('td', { class: 'w0' }),
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
          var label = label && !$.isArray(rel.grid.columns)
            ? label : field.label_column
              ? field.label_column : field.label
          return field.defines_relation
            ? ''
            : m('td', {
              style: 'text-align: left',
              class: 'f6 pa1 pb0'
            }, label)
        }),
        m('td'),
      ]),
      // draw records
      !rel.records ? '' : rel.records.map(function(rec, rowidx) {
        rec.table_name = rel.name
        rec.rowidx = rowidx

        // Make editable only relations attached directly to
        // record and not to parent records
        var ismatch = Object.keys(rel.conds).every(function(k) {
          if (!rec.columns[k]) return true
          return rel.conds[k] == rec.columns[k].value
        })
        rec.readonly = !rec.new && !ismatch

        rec.deletable = rec.relations ? true : false

        if (rec.relations) {
          $.each(rec.relations, function(idx, rel) {
            var count = rel.count_records - rel.count_inherited
            if (count && rel.options?.ondelete != "CASCADE") {
              rec.deletable = false
            }
          })
        }

        return m(Row, {
          list: rel,
          record: rec,
          idx: rowidx,
          parent: record,
          colspan: count_columns + 1
        })
      }),
      record.readonly || !config.edit_mode ? '' : m('tr', [
        m('td'),
        m('td'),
        m('td', [
          !rel.privilege.insert ? '' : m('a', {
            onclick: function(e) { Relation.add(e, rel) }
          }, m('i', {
            class: 'fa fa-plus light-blue hover-blue pointer ml1'
          }))
        ])
      ]),
    ])
  },

  draw_relation_list: function(rel, record) {
    return [
      rel.records.map(function(rec, rowidx) {
        rec.rowidx = rowidx
        // Make editable only relations attached directly to
        // record and not to parent records
        var ismatch = Object.keys(rel.conds).every(function(k) {
          return rec.columns[k] && rel.conds[k] == rec.columns[k].value
        })
        rec.readonly = !rec.new && !ismatch
        if (rec.readonly) rec.inherited = true

        if (rec.delete) return
        if (rec.fields === undefined) {
          rec.fields = JSON.parse(JSON.stringify(rel.fields))
        }
        rec.table = rel
        rec.loaded = true
        rec.relations = {}

        rel.grid.columns.map(function(key) {
          var field = rec.fields[key]
          if (field.value === undefined) {
            field.value = rec.columns[key].value
              ? rec.columns[key].value
              : null
            field.text = rec.columns[key].text
            field.editable = rel.privilege.update
          }
        })

        return [
          rel.grid.columns.map(function(key) {
            var label = rel.fields[key].label

            if (rel.fields[key].defines_relation) {
              return
            }
            return m(Field, {
              rec: rec, colname: key, label: null
            })
          })
        ]
      }),
      (
        record.readonly ||
        !config.edit_mode ||
        rel.relationship == "1:1"
      ) ? '' : [
          !rel.privilege.insert ? '' : m('a', {
            onclick: function(e) { Relation.add(e, rel) }
          }, m('i', {
            class: 'fa fa-plus light-blue hover-blue '
              + 'pointer ml1'
          }))
        ]
    ]
  },

  /** Decide if the relation represents a direct descendant of the table */
  is_direct: function(rel_tbl_name, fkey_name) {
    var result = true
    var rel_table = ds.base.tables[rel_tbl_name]
    var rel_fkey = rel_table.fkeys[fkey_name]

    // The foreign key columns should not be part of other foreign keys
    // of the table if this is a direct descendant
    Object.values(rel_table.fkeys).map(function(fkey) {
      var res = rel_fkey.constrained_columns.every(function(col) {
        return fkey.name != fkey_name && fkey.constrained_columns.indexOf(col) >= 0
      });

      if (res) {
        result = false
      }
    })

    return result
  },

  get_url: function(rel) {
    var url
    var base_path
    var conditions
    if (
      ds.base.system == 'postgresql' &&
      rel.schema_name &&
      rel.schema_name != rel.base_name && rel.schema_name != 'public'
    ) {
      base_path = rel.base_name + '.' + rel.schema_name
    } else if (['sqlite', 'duckdb'].includes(ds.base.system)) {
      base_path = ds.base.name
    } else {
      base_path = rel.schema_name
    }
    url = '#/' + base_path + '/data/' + rel.name + '?'

    conditions = []
    if (rel.conds) {
      $.each(rel.conds, function(col, val) {
        conditions.push(col + "=" + val)
      })
    }

    if (conditions.length == 0) conditions = rel.conditions

    if (conditions) {
      url += conditions.join('&')
    }

    return url
  },

  // Check if relation is hidden
  is_hidden: function(rel, rec) {
    var hidden = false

    // Check if the relation is dependent on a special value
    // being set on field in the record the foreign key links to.
    // This is the case if a column in the foreign key is a constant,
    // defined by field name starting with `_` or `const_` and has a
    // default value.
    if (rel.show_if) {
      hidden = false
      Object.keys(rel.show_if).map(function(key) {
        var value = rel.show_if[key]
        if (rec.fields[key].value != value) {
          hidden = true
        }
      })
    }

    return hidden
  },

  view: function(vnode) {
    var rec = vnode.attrs.rec
    var ref = vnode.attrs.ref
    var label = vnode.attrs.label
    var key = ref.replace('relation.', '')
    var rel = rec.relations && rec.relations[key]
      ? rec.relations[key] : null
    if (rel === null || !('tables' in ds.base)) {
      return
    }

    var table = ds.base.tables[rec.table_name]
    var usage = rec.table.relations[key].use
    var url = Relation.get_url(rel)

    if (usage && usage < config.threshold) {
      return
    }

    if (!config.show_all_descendants && !Relation.is_direct(rel.name, key)) {
      return
    }

    if (Relation.is_hidden(rel, rec)) {
      return
    }

    return [
      rel.expanded ? null : [m('div', 
        {
          'data-expandable': rel.count_records ? true : false,
          'data-set': ref, 
          class: 'db ml3 mt1'
        }, 
        [
          m('b', { 
            class: [
              'dib mr2 ',
              rel.relationship == '1:1' && (!rel.count_records || rel.records[0].delete) ? ''
              : 'underline pointer' 
            ].join(''),
            onclick: function() {
              if (rel.count_records == 0 && rel.relationship == '1:1') {
                return
              }
              Relation.toggle_heading(rel)
              if (!rel.records || (rel.relationship == '1:1' && !rel.records[0].table)) {
                Record.get_relations(rec, key)
              } 
            }
          }, label),
          rel.dirty
            ? m('i', { class: 'fa fa-pencil ml1 light-gray' })
            : '',
          (config.edit_mode && rel.relationship == '1:1') ? m('input', {
            type: 'checkbox',
            checked: rel.count_records > 0 && rel.records[0].delete != true,
            onchange: function(ev) {
              if (ev.target.checked) {
                if (rel.count_records) {
                  rel.records[0].delete = false
                } else {
                  Record.get_relations(rec, key)
                }
              } else {
                if (rel.records[0].new) {
                  rel.records.splice(0, 1)
                }
                Record.delete(rel.records[0])
              }
            }
          })
          : (rel.relationship == '1:1') ? m('span', {
            class: 'gray f7'
          }, rel.count_records ? '1:1' : '0:1')
          : m('a', {
              class: 'ml1 pr1 normal light-blue hover-blue f7 link',
              href: url
            }, [
              rel.count_records,
            ])
        ]
      )],
      rel.expanded && rel.records
        ? m('fieldset', { 
          'data-set': ref, 
          'data-expandable': true, 
          class: 'flex flex-column w-100' 
        }, [
          m('legend', {
            onclick: function() {
              Relation.toggle_heading(rel)
            }
          }, [
              m('b', { class: 'underline pointer mr2' }, label),
              (config.edit_mode && rel.relationship == '1:1') ? m('input', {
                type: 'checkbox',
                checked: rel.count_records > 0 && rel.records[0].delete != true,
                onchange: function(ev) {
                  if (!ev.target.checked) {
                    if (rel.records[0].new) {
                      rel.records.splice(0, 1)
                    } else {
                      Record.delete(rel.records[0])
                    }
                    rel.expanded = false
                    rel.count_records = 0
                  }
                }
              })
              : (rel.relationship == '1:1') ? ''
              : m('a', {
                  class: 'ml1 pr1 normal light-blue hover-blue f7 link',
                  href: url
                }, [
                  rel.count_records,
                ])
            ]),
          ['1:M', 'M:M'].includes(rel.relationship)
          ? Relation.draw_relation_table(rel, rec)
          : m(Record, { record: rel.records[0] })
        ])
        : null
    ]
  }

}

export default Relation

import Record from './record.js'
import Row from './row.js'
import config from './config.js'
import Field from './field.js'
