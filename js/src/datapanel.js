
var datapanel = {

  set_attrs: function() {
    var string_value
    for (selector in ds.base.html_attrs) {
      for (attr in ds.base.html_attrs[selector]) {
        value = ds.base.html_attrs[selector][attr]
        if (attr == 'style' && typeof(value) == 'object' && value !== null) {
          string_value = ''
          for (key in value) {
            string_value += key + ':' + value[key] + ';'
          }
          $(selector).attr(attr, string_value)
        } else {
          $(selector).attr(attr, value)
        }

        if (attr == 'data-text') {
          $(selector).text(value)
        }
      }
    } 
  },

  onupdate: function() {
    datapanel.set_attrs()
    // Repeat to set attributes based on other attributes set
    datapanel.set_attrs()
  },

  view: function(vnode) {

    if (!ds.table) return

    var selected_idx = ds.table.selection !== null ? ds.table.selection : 0

    var params = m.route.param()
    // Find if primary key columns in query parameters.
    // This means a specific record is shown.
    is_pkey = true
    for (idx in ds.table.pkey) {
      key = ds.table.pkey[idx]
      if (params[key] === undefined) {
        is_pkey = false
      }
    }
    // Hide grid if a specific record is shown, and user has
    // chosen to show records separate from table.
    var hide_grid = config.recordview &&
      (params.index !== undefined || is_pkey)

    return !ds.table.records ? m('div', 'laster ...') : [
      m(Contents),
      ds.table.search || ds.table.edit || hide_grid
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

      !ds.table.records || (config.recordview && !hide_grid)
        ? '' : ds.table.search
          ? m(Search) : m('div', {class: 'flex flex-column'}, [
            config.recordview && hide_grid ? m(Toolbar) : null,
            m('form', {
              name: ds.table.name,
              class: 'flex flex-column'
            }, m(Record, {
              record: ds.table.records[selected_idx]
            })),
          ])
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
var config = require('./config')
