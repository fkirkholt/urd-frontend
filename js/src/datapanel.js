
var datapanel = {
    view: function(vnode) {
        // load table if route changes
        if (m.route.get() != Grid.url && config.show_table) {
            Grid.load()
            Grid.url = m.route.get()
        }

        if (!ds.table) return

        ds.type = 'table'

        if (!config.show_table) {
            var table_name = m.route.param('table')
            if (ds.table && ds.table.name !== table_name) {
                ds.table = ds.base.tables[table_name]
            }

            if (Diagram.main_table !== table_name) {
                Diagram.draw(ds.base.tables[table_name])
            }
        } else {
            var selected_idx = ds.table.selection !== null ? ds.table.selection : 0
        }

        return config.show_table && !ds.table.records ? m('div', 'laster ...') : [
            m(Contents),
            config.show_table ? '' : m(Diagram),
            !config.show_table || ds.table.search || ds.table.edit
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

            !config.show_table || !ds.table.records ? '' : ds.table.search ? m(Search) : m(Entry, {
                record: ds.table.records[selected_idx]
            }),
            !config.show_table ? '' : m('div', {style: 'flex: 1'}),
        ]
    }
}

module.exports = datapanel

var Pagination = require('./pagination')
var Toolbar = require('./toolbar')
var Contents = require('./contents')
var Grid = require('./grid')
var Entry = require('./entry')
var Search = require('./search')
var config = require('./config')
var Diagram = require('./diagram')
