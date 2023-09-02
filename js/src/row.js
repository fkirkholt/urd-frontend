var Row = {

  /** Expand row to show children */
  expand: function(list, rec, rowidx) {
    if (!rec.count_children) return
    if (rec.expanded === undefined) {
      m.request({
        method: 'get',
        url: 'children',
        params: {
          base: ds.base.name,
          table: list.name,
          pkey: JSON.stringify(rec.pkey)
        }
      }).then(function(result) {
        var indent = rec.indent ? rec.indent + 1 : 1
        records = result.data.map(function(record, idx) {
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
      url: "record",
      params: {
        base: rec.base_name ? rec.base_name : ds.base.name,
        table: tbl.name,
        pkey: JSON.stringify(rec.pkey)
      }
    }).then(function(result) {
      var rel = $.extend(rec, result.data)
      rel.table = tbl
      rel.list = tbl
      rec.loaded = true

      // Get virtual columns from tbl.fields.
      for (field_name in tbl.fields) {
        field = $.extend({}, tbl.fields[field_name])
        if (rel.fields[field.name] === undefined) {
          rel.fields[field.name] = field
        }
      }
      for (fieldname in tbl.fields) {
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
          e.redraw = false
          if (list.pkey) {
            Record.select(list, idx)
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
            $(this).find('td.icon-crosshairs').trigger('click')
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
      // classes for row
      class: [
        (list.selection == idx && list.pkey)
          ? 'bg-light-blue focus'
          : '',
        'lh-copy cursor-default bg-white',
        record.class ? record.class : '',
        !list.ismain ? '' : (idx < list.records.length - 1)
          ? 'bb b--light-gray'
          : 'bb b--moon-gray',
      ].join(' ')
    }, [
        // Draw icons indicating if record is dirty, illegal, new etc.
        m('td', {
          align: 'right',
          class: !list.ismain ? '' : 'pa0 br b--light-gray',
        }, [
            config.autosave ? m.trust('&nbsp;') : m('i', {
              class: [
                record.delete ? 'fa fa-trash' :
                  record.invalid ? 'fa fa-warning red' :
                    record.new ? 'fa fa-plus-circle' :
                      record.dirty ? 'fa fa-pencil light-gray' : ''
              ],
              title: !record.messages ? null : record.messages.join(' ') 
            })
          ]),
        // Draw expansion icon
        (list.ismain || // only records in relations should be expanded
          record.pkey == null
        ) ? '' : m('td.fa', {
            class: [
              record.open ? 'fa-angle-down' : 'fa-angle-right',
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
                ? 'fa fa-trash-o pl1' : '',
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
        !list.ismain || list.grid.actions.length == 0 ? '' : m('td', {
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
            'icon-crosshairs light-blue hover-blue pointer',
            'br b--moon-gray bb--light-gray'
          ].join(' '),
          onclick: function(e) {
            var query_params
            path = m.route.get()
            if (path.includes('?')) {
              query_params = m.parseQueryString(path.slice(path.indexOf('?') + 1))
            }

            query_params = query_params ? query_params.index = idx : {index: idx}

            // m.route.set(Grid.url + '?' + m.buildQueryString(query_params))
            Toolbar.set_url(idx, query_params.offset)
            e.stopPropagation()
          }
        })
      ]),
      !record.open ? null : m('tr', [
        m('td'),
        m('td'),
        m('td', {
          colspan: vnode.attrs.colspan,
          class: 'bl b--moon-gray'
        }, [
            m(Record, { record: record })
          ])
      ])]
  }
}

module.exports = Row

var compare = require('just-compare')
var get = require('just-safe-get')
var ds = require('./datastore')
var config = require('./config')
var Cell = require('./cell')
var Record = require('./record')
var Toolbar = require('./toolbar')
