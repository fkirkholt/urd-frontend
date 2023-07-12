var Cell = {

  /** Text alignment in cell */
  align: function(list, colname) {
    var col = list.fields[colname];
    if ((['integer', 'float', 'decimal'].includes(col.datatype) &&
      !col.fkey) && (col.element !== 'input' || col.attrs.type != 'checkbox')) {
      return 'right';
    } else {
      return 'left';
    }
  },

  view: function(vnode) {
    var list = vnode.attrs.list
    var rowidx = vnode.attrs.rowidx
    var colname = vnode.attrs.colname
    // if table is displayed in compressed mode
    var compressed = vnode.attrs.compressed
    var rec = list.records[rowidx]
    var field = list.fields[colname]
    var col = rec.columns[colname]
    if (field.hidden) return

    var value = col.value == null && col.text == null ? ''
      // Show value if the table is displayed in compressed mode
      : compressed ? col.value
        // else show the display text (that also shows in a select box)
        : col.text

    if (field.element == 'input' && field.attrs.type == 'checkbox') {
      var icon = value === 0 
        ? 'fa-square-o' : value === 1 
          ? 'fa-check-square-o' : 'fa-minus-square-o'
      value = m('i', { class: 'fa ' + icon })
    }
    
    var expansion = colname === list.expansion_column && list.ismain

    var icon = m('i', {
      class: [
        'fa fa-fw',
        rec.expanded ? 'fa-angle-down' : 'fa-angle-right',
        rec.count_children ? 'black' : 'moon-gray',
      ].join(' '),
      style: 'margin-left: ' + (rec.indent * 15) + 'px;',
      onclick: function() {
        Row.expand(list, rec, rowidx)
      }
    })

    return m('td', {
      class: [
        Cell.align(list, colname) === 'right' ? 'tr' : 'tl',
        compressed || value.length < 30 || (
          field.datatype !== 'string' &&
            field.datatype !== 'binary' &&
            field.element != 'select'
        )
          ? 'nowrap' : '',
        compressed && value.length > 30 ? 'pt0 pb0' : '',
        vnode.attrs.border ? 'br b--light-gray' : '',
        ds.table.sort_fields[colname] ? 'min-w3' : 'min-w2',
        'f6 pl1 pr1',
        get(field, 'attrs.class') ? field.attrs.class : ''
      ].join(' '),
      title: compressed && value.length > 30 ? value : ''
    }, [
        !(value && value.length > 30 && compressed)
          ? [m('div', [expansion ? icon : '', value])]
          : m('table', {
            class: 'w-100',
            style: 'table-layout:fixed;'
          }, [
              m('tr', m('td.pa0', {
                class: compressed ? 'truncate' : 'overflow-wrap'
              }, [expansion ? icon : '', value]))
            ]
          ),
      ]
    )
  }
}

module.exports = Cell

var ds = require('./datastore')
var Field = require('./field')
var Row = require('./row')
var get = require('just-safe-get')
