var Row = {

    expand: function(list, rec, rowidx) {
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
    },

    view: function(vnode) {
        var record = vnode.attrs.record
        var idx = vnode.attrs.idx
        return m('tr', {
            tabindex: 0,
            onclick: function(e) {
                e.redraw = false
                if (ds.table.type != 'view') {
                    Record.select(ds.table, idx)
                }
            },
            onkeydown: function(e) {
                e.redraw = false
                if (e.keyCode == 38) { // arrow up
                    $(this).prev('tr').trigger('focus')
                    e.preventDefault()
                } else if (e.keyCode == 40) { // arrow down
                    $(this).next('tr').trigger('focus')
                    e.preventDefault()
                } else if (e.keyCode == 13) { // enter
                    e.redraw = false
                    $(this).trigger('click')
                    $('#main form:first').find(':input:enabled:not([readonly]):first').trigger('focus')
                } else if (e.keyCode == 32) { // space
                    $(this).trigger('click')
                    e.preventDefault()
                } else if (e.shiftKey && e.keyCode == 9) { // shift tab
                    $(this).prev('tr').trigger('click')
                } else if (e.keyCode == 9) { // tab
                    $(this).next('tr').trigger('click')
                }
            },
            class: [
                (ds.table.selection == idx && ds.table.type != 'view') ? 'bg-light-blue focus' : '',
                'lh-copy cursor-default bg-white',
                record.class ? record.class : '',
                idx < ds.table.records.length - 1 ? 'bb b--light-gray' : 'bb b--moon-gray',
            ].join(' ')
        }, [
            m('td', {
                align: 'right',
                class: 'linjenr pa0 w1 br b--light-gray',
            }, [
                config.autosave ? m.trust('&nbsp;') : m('i', {
                    class: [
                        record.delete  ? 'fa fa-trash'       :
                            record.invalid ? 'fa fa-warning red' :
                            record.new     ? 'fa fa-plus-circle' :
                            record.dirty   ? 'fa fa-pencil light-gray' : ''
                    ]
                })
            ]),
            Object.keys(ds.table.grid.columns).map(function(label, colidx) {
                var col = ds.table.grid.columns[label]

                return m(Cell, {
                    list: ds.table,
                    rowidx: idx,
                    col: col,
                    compressed: config.compressed,
                    border: true,
                    grid: true
                })
            }),
            m('td', {class: ' br b--moon-gray bb--light-gray pa0 f6 tr'}, [
                ds.table.grid.actions.map(function(name, idx) {
                    var action = ds.table.actions[name]
                    action.name = name

                    return Record.action_button(record, action)
                })
            ])
        ])

    }
}

module.exports = Row

var ds = require('./datastore')
var config = require('./config')
var Cell = require('./cell')
var Record = require('./record')
var _isEqual = require('lodash/isEqual')
