var Datapanel = {

  set_attrs: function() {
    var string_value
    if (ds.base.html_attrs == undefined) {
      return
    }
    Object.keys(ds.base.html_attrs).sort().forEach(function(selector, i) {
      for (let attr in ds.base.html_attrs[selector]) {
        let value = ds.base.html_attrs[selector][attr]
        if (attr == 'style' && typeof(value) == 'object' && value !== null) {
          string_value = ''
          for (let key in value) {
            $(selector).css(key, value[key])
          }
        } else {
          $(selector).attr(attr, value)
        }

        if (attr == 'data-text') {
          $(selector).text(value)
        }
      }
    }) 
  },

  onupdate: function() {
    Datapanel.set_attrs()
    // Repeat to set attributes based on other attributes set
    Datapanel.set_attrs()
  },

  view: function(vnode) {

    if (!ds.table) return

    var selected_idx = ds.table.selection !== null ? ds.table.selection : 0

    var params = m.route.param()
    // Find if primary key columns in query parameters.
    // This means a specific record is shown.
    var is_pkey = true
    for (let idx in ds.table.pkey) {
      let key = ds.table.pkey[idx]
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
          ? m(Search) : m('div', {class: 'flex flex-auto flex-column'}, [
            config.recordview && hide_grid ? m(Toolbar) : null,
            m('form', {
              name: ds.table.name,
              class: 'flex flex-wrap mw7 mr2'
            }, m(Record, {
              record: ds.table.records[selected_idx]
            })),
          ])
    ]
  }
}

export default Datapanel

import Pagination from './pagination.js'
import Toolbar from './toolbar.js'
import Contents from './contents.js'
import Grid from './grid.js'
import Record from './record.js'
import Search from './search.js'
import config from './config.js'
