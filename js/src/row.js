var Row = {

    expand: function(list, rec, rowidx) {
        if (!rec.count_children) return
        if (rec.expanded === undefined) {
            m.request({
                method: 'get',
                url: 'children',
                params: {
                    base: ds.base.name,
                    table: list.name,
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
                if (compare(record.parent, rec.primary_key)) record.hidden = false

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
        var parent = vnode.attrs.parent
        var list = vnode.attrs.list
        var idx = vnode.attrs.idx
        return [m('tr', {
            tabindex: 0,
            onclick: function(e) {
                if (record.root) {
                    e.redraw = false
                    if (list.type != 'view') {
                        Record.select(list, idx)
                    }
                } else {
                    if (record.primary_key == null) return

                    parent.active_relation = record
                    Record.toggle_record(record, list)
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
                (list.selection == idx && list.type != 'view')
                    ? 'bg-light-blue focus'
                    : '',
                'lh-copy cursor-default bg-white',
                record.class ? record.class : '',
                !record.root ? '' : (idx < list.records.length - 1)
                    ? 'bb b--light-gray'
                    : 'bb b--moon-gray',
            ].join(' ')
        }, [
            m('td', {
                align: 'right',
                class: !record.root ? '' : 'linjenr pa0 w1 br b--light-gray',
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
            (   record.root || // only records in relations should be expanded
                record.primary_key == null
            ) ? '' : m('td.fa', {
                class: [
                    record.open ? 'fa-angle-down' : 'fa-angle-right',
                    record.invalid ? 'invalid' : record.dirty ? 'dirty' : '',
                ].join(' ')
            }),
            Object.keys(list.grid.columns).map(function(label, colidx) {
                var col = list.grid.columns[label]
                var defines_relation = get(list.fields, col + '.defines_relation')

                return defines_relation ? '' : m(Cell, {
                    list: list,
                    rowidx: idx,
                    col: col,
                    compressed: config.compressed,
                    border: record.root ? true : false,
                    grid: true
                })
            }),
            !record.root ? '' : m('td', {class: ' br b--moon-gray bb--light-gray pa0 f6 tr'}, [
                list.grid.actions.map(function(name, idx) {
                    var action = list.actions[name]
                    action.name = name

                    return Record.action_button(record, action)
                })
            ])
        ]),
        !record.open ? null : m('tr', [
            m('td'),
            m('td'),
            m('td', {
                colspan: vnode.attrs.colspan,
                class: 'bl b--moon-gray'
            }, [
                m(Record, {record: record})
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
