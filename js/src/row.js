row = {
    view: function(vnode) {
        var record = vnode.attrs.record
        var idx = vnode.attrs.idx
        return m('tr', {
            tabindex: 0,
            onclick: function(e) {
                e.redraw = false;
                if (ds.table.type != 'view') {
                    entry.select(ds.table, idx);
                }
            },
            onkeydown: function(e) {
                e.redraw = false;
                if (e.keyCode == 38) { // arrow up
                    $(this).prev('tr').focus();
                    e.preventDefault();
                } else if (e.keyCode == 40) { // arrow down
                    $(this).next('tr').focus();
                    e.preventDefault();
                } else if (e.keyCode == 13) { // enter
                    e.redraw = false;
                    $(this).trigger('click');
                    $('#main form:first').find(':input:enabled:not([readonly]):first').focus();
                } else if (e.keyCode == 32) { // space
                    $(this).trigger('click');
                    e.preventDefault();
                } else if (e.shiftKey && e.keyCode == 9) { // shift tab
                    $(this).prev('tr').trigger('click');
                } else if (e.keyCode == 9) { // tab
                    $(this).next('tr').trigger('click');
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
                var col = ds.table.grid.columns[label];

                return m(cell, {
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

                    return control.button(record, action)
                })
            ])
        ]);

    }
}

module.exports = row

var ds = require('./datastore.js')
var config = require('./config.js')
var cell = require('./cell.js')
var control = require('./control.js')
var entry = require('./entry.js')
