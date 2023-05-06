
var datapanel = {
    view: function(vnode) {
        // load table if route changes
        if (m.route.get() != Grid.url) {
            Grid.load()
            Grid.url = m.route.get()
        }

        if (!ds.table) return

        ds.type = 'table'

        var selected_idx = ds.table.selection !== null ? ds.table.selection : 0

        return !ds.table.records ? m('div', 'laster ...') : [
            m(Contents),
            ds.table.search || ds.table.edit
                ? ''
                : m('div#gridpanel', {
                    class: 'flex flex-column ml2',
                    style: [
                        'background: #f9f9f9',
                        'border: 1px solid lightgray',
                        ds.table.hide ? 'display: none' : ''
                    ].join(';')
                }, [
                    m(Toolbar),
                    m(Grid),
                    m(Pagination)
                ]),

            !ds.table.records ? '' : ds.table.search ? m(Search) : m(Record, {
                record: ds.table.records[selected_idx]
            }),
            m('div', {style: 'flex: 1'}),
        ]
    }
}

module.exports = datapanel

var Pagination = require('./pagination')
var Toolbar = require('./toolbar')
var Contents = require('./contents')
var Grid = require('./grid')
var Record = require('./record')
var Search = require('./search')
