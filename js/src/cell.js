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

    if (get(field, 'attrs.data-format') == 'markdown') {
      field.value = col.value
      var val = Field.display_value(field, rec)
    }

    var value = col.value == null && col.text == null ? ''
      // Show value if the table is displayed in compressed mode
      : get(field, 'attrs.data-format') == 'markdown' ? val
      : compressed ? col.value
      // else show the display text (that also shows in a select box)
      : col.text ? col.text : col.value

    if (field.element == 'input' && field.attrs.type == 'checkbox') {
      var icon = value == 0 
        ? 'nf-fa-square_o' : value == 1 
          ? 'nf-fa-check_square_o' : 'nf-fa-minus_square_o'
      value = m('i', { class: 'nf ' + icon })
    }
    
    var expansion = false

    if (list.ismain && list.expansion_column) {
      var expansion_col = null
      for (const indexname in ds.table.indexes) {
        let index = ds.table.indexes[indexname]
        if (index.unique && index.columns.join() != ds.table.pkey.join()) {
          for (const fieldname of index.columns) {
            if (ds.table.fields[fieldname].datatype == 'str') {
              expansion_col = fieldname
              break
            }
          }
        }
      }
      if (!expansion_col) {
        for (const fieldname of ds.table.grid.columns) {
          if (ds.table.fields[fieldname].datatype == 'str') {
            expansion_col = fieldname
            break
          }
        }
      }
      expansion = colname == expansion_col
    }

    var icon = m('i', {
      class: [
        'nf nf-fw',
        rec.expanded ? 'nf-fa-angle_down' : 'nf-fa-angle_right',
        config.dark_mode ? 'white' : 'black',
        rec.count_children ? '' : 'o-20',
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
        vnode.attrs.border && config.dark_mode ? 'br b--gray'
        : vnode.attrs.border ? 'br b--moon-gray' : '',
        ds.table.grid.sort_columns[colname] ? 'min-w3' : 'min-w2',
        'f6 pl1 pr1'
      ].join(' '),
      title: compressed && value.length > 30 ? value : '',
      headers: colname,
      'data-value': ('' + col.value).replace('\n', ' ').replace(/\s\s+/g, ' ').slice(0, 255)
    }, [ expansion ? icon : '', value ])
  }
}

export default Cell

import Field from './field.js'
import Row from './row.js'
import get from 'just-safe-get'
import config from './config'
