var cell = {

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
        var max_len = -1
        var n = 0
        var list = vnode.attrs.list
        var rowidx = vnode.attrs.rowidx
        var col = vnode.attrs.col
        var compressed = vnode.attrs.compressed
        $.each(list.grid.columns, function(idx, colname) {
            field = list.fields[colname]
            if (colname.indexOf('actions.') > -1) {
                return
            }
            if (max_len != 0 && field.size > max_len) {
                if (field.size == max_len) {
                    n++
                } else {
                    n = 1
                }
                max_len = list.fields[colname].size
            }
            if (field.datatype == 'string' && field.size == 0) {
                // size 0 means no size limit
                if (max_len == 0) {
                    n++
                } else {
                    n = 1
                }
                max_len = 0
            }
        })
        var percent_width = Math.floor(10/n) * 10
        var rec = list.records[rowidx]
        var field = list.fields[col]
        if (field.hidden) return
        var value = rec.columns[col] == null ? ''
            : compressed && vnode.attrs.grid ? rec.values[col]
            : rec.columns[col]

        value = control.display_value(field, value)
        var expansion = col === list.expansion_column && vnode.attrs.grid
        var is_checkbox = field.element == 'input[type=checkbox]'

        var icon = m('i', {
            class: [
                expansion ? 'fa fa-fw' : '',
                expansion && rec.expanded ? 'fa-angle-down' : expansion ? 'fa-angle-right' : '',
                expansion && rec.count_children ? 'black' : 'moon-gray',
            ].join(' '),
            style: col === list.expansion_column ? 'margin-left: ' + (rec.indent * 15) + 'px;' : '',
            onclick: function(e) {
                if (!rec.count_children) return
                if (rec.expanded === undefined) {
                    m.request({
                        method: 'get',
                        url: 'children',
                        params: {
                            base: ds.base.name,
                            table: ds.table.name,
                            primary_key: JSON.stringify(rec.primary_key)
                        }
                    }).then(function(result) {
                        var indent = rec.indent ? rec.indent + 1 : 1
                        records = result.data.map(function(record, idx) {
                            record.indent = indent
                            record.path = rec.path ? rec.path + '.' + idx : rowidx + '.' + idx
                            record.parent = rec.primary_key
                            return record
                        })
                        list.records.splice.apply(list.records, [rowidx+1, 0].concat(records))
                    })
                } else if (rec.expanded === false) {
                    list.records = list.records.map(function(record) {
                        if (_isEqual(record.parent, rec.primary_key)) record.hidden = false

                        return record
                    })
                } else {
                    var path = rec.path ? rec.path : rowidx

                    list.records = list.records.map(function(record) {

                        // Check if record.path starts with path
                        if(record.path && record.path.lastIndexOf(path, 0) === 0 && record.path !== path) {
                            record.hidden = true
                            if (record.expanded) record.expanded = false
                        }

                        return record
                    })
                }

                rec.expanded = !rec.expanded
            }
        })

        return m('td', {
            class: [
                field.datatype == 'string' && field.size == max_len ? 'w-' + percent_width : '',
                cell.align(list, col) === 'right' ? 'tr' : 'tl',
                compressed || (field.datatype !== 'string' && field.datatype !== 'binary' && field.element != 'select') || (value.length < 30) ? 'nowrap' : '',
                compressed && value.length > 30 ? 'pt0 pb0' : '',
                vnode.attrs.border ? 'bl b--light-gray' : '',
                ds.table.sort_fields[col] ? 'min-w3' : 'min-w2',
                'f6 pl1 pr1',
                rowidx < ds.table.records.length - 1 ? 'bb b--light-gray' : '',
            ].join(' '),
            title: compressed && value.length > 30 ? value : ''
        }, [

            !(value.length > 30 && compressed) ? [m('div', [icon, value])]
                : m('table', {
                    class: 'w-100',
                    style: 'table-layout:fixed; border-spacing:0px'
                }, [
                    m('tr', m('td.pa0', {class: compressed ? 'truncate': 'overflow-wrap'}, [icon, value]))
                ]),
        ])
    }
}

module.exports = cell

var ds = require('./datastore.js')
var control = require('./control.js')
var grid = require('./grid.js')
