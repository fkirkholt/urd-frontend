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

    /** Toggle detailed view of record beneath row in relation list */
    toggle_record: function(rec, tbl) {

        if (rec.open) {
            rec.open = false
        } else {
            rec.open = true
        }

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
                primary_key: JSON.stringify(rec.primary_key)
            }
        }).then(function(result) {
            var rel = $.extend(rec, result.data)
            rel.table = tbl
            rel.list = tbl
            rec.loaded = true
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
                    if (list.type != 'view') {
                        Record.select(list, idx)
                    }
                } else {
                    if (record.primary_key == null) return

                    Row.toggle_record(record, list)
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
                    $('form[name=record]').find('input,textarea,select').first().trigger('focus')
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
                !list.ismain ? '' : (idx < list.records.length - 1)
                    ? 'bb b--light-gray'
                    : 'bb b--moon-gray',
            ].join(' ')
        }, [
            m('td', {
                align: 'right',
                class: !list.ismain ? '' : 'linjenr pa0 w1 br b--light-gray',
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
            (   list.ismain || // only records in relations should be expanded
                record.primary_key == null
            ) ? '' : m('td.fa', {
                class: [
                    record.open ? 'fa-angle-down' : 'fa-angle-right',
                    record.invalid ? 'invalid' : record.dirty ? 'dirty' : '',
                ].join(' ')
            }),
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
            list.ismain ? '' : m('td', [
                !record.open || parent.readonly ? '' : m('i', {
                    class: [
                        list.privilege.delete && config.edit_mode ? 'fa fa-trash-o pl1' : '',
                        record.deletable ? 'light-blue' : 'moon-gray',
                        record.deletable ? (config.relation_view === 'column' ? 'hover-white' : 'hover-blue') : '',
                    ].join(' '),
                    style: 'cursor: pointer',
                    onclick: Record.delete.bind(this, record),
                    title: 'Slett'
                })
            ]),
            !list.ismain ? '' : m('td', {class: ' br b--moon-gray bb--light-gray pa0 f6 tr'}, [
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
