var Cell = {

    align: function(list, colname) {
        var col = list.fields[colname];
        if (($.inArray(col.datatype, ['integer', 'float', 'decimal']) != -1 &&
            !col.foreign_key) && col.element !== 'input[type=checkbox]') {
                return 'right';
            } else {
                return 'left';
            }
    },

    view: function (vnode) {
        var list = vnode.attrs.list
        var rowidx = vnode.attrs.rowidx
        var col = vnode.attrs.col
        var compressed = vnode.attrs.compressed
        var rec = list.records[rowidx]
        var field = list.fields[col]
        if (field.hidden) return
        var value = rec.columns[col] == null ? ''
            : compressed && vnode.attrs.grid ? rec.values[col]
            : rec.columns[col]

        value = Field.display_value(field, value)
        var expansion = col === list.expansion_column && vnode.attrs.grid
        var is_checkbox = field.element == 'input[type=checkbox]'

        var icon = m('i', {
            class: [
                'fa fa-fw',
                rec.expanded ? 'fa-angle-down' : 'fa-angle-right',
                rec.count_children ? 'black' : 'moon-gray',
            ].join(' '),
            style: 'margin-left: ' + (rec.indent * 15) + 'px;',
            onclick: function() {
                row.expand(list, rec, rowidx)
            }
        })

        return m('td', {
            class: [
                Cell.align(list, col) === 'right' ? 'tr' : 'tl',
                compressed || (field.datatype !== 'string' &&
                               field.datatype !== 'binary' &&
                               field.element != 'select') || (value.length < 30)
                    ? 'nowrap' : '',
                compressed && value.length > 30 ? 'pt0 pb0' : '',
                vnode.attrs.border ? 'br b--light-gray' : '',
                ds.table.sort_fields[col] ? 'min-w3' : 'min-w2',
                'f6 pl1 pr1',
            ].join(' '),
            title: compressed && value.length > 30 ? value : ''
        }, [

            !(value.length > 30 && compressed)
                ? [m('div', [expansion ? icon : '', value])]
                : m('table', {
                    class: 'w-100',
                    style: 'table-layout:fixed;'
                }, [
                    m('tr', m('td.pa0', {
                        class: compressed ? 'truncate': 'overflow-wrap'
                    }, [expansion ? icon : '', value]))
                ]),
        ])
    }
}

module.exports = Cell

var ds = require('./datastore.js')
var control = require('./control.js')
var Field = require('./field')
