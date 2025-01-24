var Cell = {

  /** Text alignment in cell */
  align: function(list, colname) {
    var col = list.fields[colname];
    if ((['int', 'float', 'Decimal'].includes(col.datatype) &&
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
      var icon = value == 0 
        ? 'fa-square-o' : value == 1 
          ? 'fa-check-square-o' : 'fa-minus-square-o'
      value = m('i', { class: 'fa ' + icon })
    }
    
    var expansion = list.ismain && list.expansion_column && colname == ds.table.grid.columns[0] 

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
        compressed || (value && value.length < 30) || (
          field.datatype !== 'str' &&
            field.datatype !== 'bytes' &&
            field.element != 'select'
        )
          ? 'nowrap' : '',
        compressed && value && value.length > 30 ? 'truncate' : 'overflow-wrap',
        compressed && value.length > 30 ? 'pt0 pb0' : '',
        vnode.attrs.border ? 'br b--light-gray' : '',
        ds.table.grid.sort_columns[colname] ? 'min-w3' : 'min-w2',
        'f6 pl1 pr1'
      ].join(' '),
      title: compressed && value.length > 30 ? value : '',
      headers: colname,
      'data-value': value
    }, [ expansion ? icon : '', value ])
  }
}

export default Cell

import Field from './field.js'
import Row from './row.js'
import get from 'just-safe-get'
import config from './config'
