var Row = {

  /** Expand row to show children */
  expand: function(list, rec, rowidx) {
    if (!rec.count_children) return
    if (rec.expanded === undefined) {
      m.request({
        method: 'get',
        url: '/children',
        params: {
          cnxn: ds.cnxn,
          base: ds.base.name,
          table: list.name,
          pkey: JSON.stringify(rec.pkey)
        }
      }).then(function(result) {
        var indent = rec.indent ? rec.indent + 1 : 1
        var records = result.data.map(function(record, idx) {
          record.indent = indent
          record.path = rec.path
            ? rec.path + '.' + idx
            : rowidx + '.' + idx
          record.parent = rec.pkey
          return record
        })
        list.records.splice.apply(list.records,
          [rowidx + 1, 0].concat(records))
      })
    } else if (rec.expanded === false) {
      list.records = list.records.map(function(record) {
        if (compare(record.parent, rec.pkey)) record.hidden = false

        return record
      })
    } else {
      var path = rec.path ? rec.path : rowidx

      list.records = list.records.map(function(record) {

        // Check if record.path starts with path
        if (
          record.path &&
          record.path.lastIndexOf(path, 0) === 0 &&
          record.path !== path
        ) {
          record.hidden = true
          if (record.expanded) record.expanded = false
        }

        return record
      })
    }

    rec.expanded = !rec.expanded
  },

  /** Toggle detailed view of record beneath row in relation list */
  toggle_record: function(rec, tbl) {

    rec.open = !rec.open

    // Don't load record if it's already loaded
    if (rec.loaded) {
      return
    }

    m.request({
      method: "GET",
      url: "/record",
      params: {
        cnxn: ds.cnxn,
        base: rec.base_name ? rec.base_name : ds.base.name,
        table: tbl.name,
        pkey: JSON.stringify(rec.pkey)
      }
    }).then(function(result) {
      var rel = $.extend(rec, result.data)
      rel.table = tbl
      rec.loaded = true

      // Get virtual columns from tbl.fields.
      var field
      for (let field_name in tbl.fields) {
        let field = $.extend({}, tbl.fields[field_name])
        if (rel.fields[field.name] === undefined) {
          rel.fields[field.name] = field
        }
      }
      for (let fieldname in tbl.fields) {
        if (tbl.fields[fieldname].virtual) {
          rel.fields[fieldname].text = rel.columns[fieldname].text
        }
      }

      Record.get_relations_count(rel)
      setTimeout(function() {
        $('#main').get().scrollLeft = 420
      }, 50)
    })
  },


  view: function(vnode) {
    var record = vnode.attrs.record
    var parent = vnode.attrs.parent
    var list = vnode.attrs.list
    var idx = vnode.attrs.idx
    return [m('tr', {
      tabindex: 0,
      onclick: function(e) {
        if (list.ismain) { // if in main grid
          if (!list.pkey) {
            return
          }
          if (config.recordview) {
            ds.table.selection = idx
          } else {
            Toolbar.set_url(idx, ds.table.offset, true)
          }
        } else {
          if (record.pkey == null) return

          Row.toggle_record(record, list)
        }
      },
      // Key bindings for grid
      onkeydown: function(e) {
        e.redraw = false
        if (e.keyCode == 38 || e.keyCode == 75) { // arrow up or k
          $(this).prev('tr').trigger('focus')
          e.preventDefault()
        } else if (e.keyCode == 40 || e.keyCode == 74) { // arrow down or j
          $(this).next('tr').trigger('focus')
          e.preventDefault()
        } else if (e.keyCode == 13) { // enter
          e.redraw = false
          $(this).trigger('click')
          if (config.recordview) {
            $(this).find('td.nf-md-crosshairs_gps').trigger('click')
          } else {
            $('form[name=record]').find('input,textarea,select')
              .first().trigger('focus')
          }
        } else if (e.keyCode == 32) { // space
          $(this).trigger('click')
          e.preventDefault()
        } else if (e.shiftKey && e.keyCode == 9) { // shift tab
          $(this).prev('tr').trigger('click')
        } else if (e.keyCode == 9) { // tab
          $(this).next('tr').trigger('click')
        }
      },
      'data-selected': list.selection == idx,
      // classes for row
      class: [
        'lh-copy cursor-default',
        config.dark_mode ? 'bg-black' : 'bg-near-white',
        record.class ? record.class : '',
        !list.ismain ? '' 
        : (idx < list.records.length - 1) && config.dark_mode ? 'bb b--gray'
        : (idx < list.records.length - 1) ? 'bb b--moon-gray'
        : config.dark_mode ? 'bb b--gray'
        : 'bb b--moon-gray',
      ].join(' ')
    }, [
        // Draw icons indicating if record is dirty, illegal, new etc.
        m('td', {
          align: 'right',
          class: !list.ismain ? '' 
          : config.dark_mode ? 'pa0 br b--gray'
          :'pa0',
        }, [
            config.autosave ? m.trust('&nbsp;') : m('i', {
              class: [
                record.delete ? 'nf nf-fa-trash_o' 
                : record.invalid ? 'nf nf-fa-warning red' 
                : record.new ? 'nf nf-fa-plus_circle' 
                : record.dirty ? 'nf nf-fa-pencil light-gray' 
                : ''
              ],
              title: !record.messages ? null : record.messages.join(' ') 
            })
          ]),
        // Draw expansion icon
        (list.ismain || // only records in relations should be expanded
          record.pkey == null
        ) ? '' : m('td.nf', {
            class: [
              record.open ? 'nf-fa-angle_down' : 'nf-fa-angle_right',
              record.invalid ? 'invalid' : record.dirty ? 'dirty' : '',
            ].join(' ')
          }),
        // Draw each column in the row
        Object.keys(list.grid.columns).map(function(label, colidx) {
          var colname = list.grid.columns[label]
          var defines_relation = get(list.fields, colname + '.defines_relation')

          return defines_relation ? '' : m(Cell, {
            list: list,
            rowidx: idx,
            colname: colname,
            compressed: config.compressed,
            border: list.ismain ? true : false,
          })
        }),
        // Draw trash bin icon for deleting row in relations
        list.ismain ? '' : m('td', [
          !record.open || parent.readonly ? '' : m('i', {
            class: [
              list.privilege.delete && config.edit_mode
                ? 'nf nf-fa-trash_o pl1' : '',
              record.deletable ? 'light-blue' : 'moon-gray',
              record.deletable ? (
                config.relation_view === 'column'
                  ? 'hover-white' : 'hover-blue'
              ) : '',
            ].join(' '),
            style: 'cursor: pointer',
            onclick: Record.delete.bind(this, record),
            title: 'Slett'
          })
        ]),
        // Draw icons for actions in main grid
        list.grid.actions.length == 0 ? '' : m('td', {
          class: [
            'br b--moon-gray bb--light-gray f6 tr',
            list.grid.actions.length ? 'pr2 pl2' : 'pa0'
          ].join(' ')
        }, [
            list.grid.actions.map(function(name) {
              var action = list.actions[name]
              action.name = name

              return Record.action_button(record, action)
            })
          ]),
        // Draw crosshairs symbol for navigate to record view
        // Only shows when record is not shown right of table
        !list.ismain || !config.recordview ? '' : m('td', {
          class: [
            'nf nf-md-crosshairs_gps light-blue hover-blue pointer',
            'br b--moon-gray bb--light-gray'
          ].join(' '),
          onclick: function(e) {
            Toolbar.set_url(idx)
            e.stopPropagation()
          }
        })
      ]),
      !record.open ? null : m('tr', [
        m('td'),
        m('td'),
        m('td', {
          colspan: vnode.attrs.colspan,
          class: 'bl b--moon-gray mw4'
        }, [
            m(Record, { record: record })
          ])
      ])]
  }
}

export default Row

import compare from 'just-compare'
import get from 'just-safe-get'
import config from './config.js'
import Cell from './cell.js'
import Record from './record.js'
import Toolbar from './toolbar.js'
