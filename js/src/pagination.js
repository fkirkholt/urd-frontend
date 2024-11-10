var Pagination = {

  navigate: function(name, set_index) {
    var list = ds.table
    var offset = parseInt(list.limit) + parseInt(list.offset)
    var selection = set_index == false ? null : 0
    switch (name) {
      case 'next':
        offset = parseInt(list.offset) + parseInt(list.limit)
        break
      case 'previous':
        offset = parseInt(list.offset) - list.limit
        selection = set_index ? config.limit - 1 : null
        break
      case 'last':
        offset = Math.floor((list.count_records - 1) / list.limit) * list.limit
        selection = set_index ? list.count_records - offset - 1 : null
        break
      case 'first':
        offset = 0
        break
    }

    Toolbar.set_url(selection, offset)
  },

  to: function() {
    var til_post
    var count = ds.table.count_records
    if (count < (parseInt(ds.table.offset) + parseInt(ds.table.limit))) {
      til_post = ds.table.count_records
    } else {
      til_post = parseInt(ds.table.offset) + parseInt(ds.table.limit)
    }
    return til_post
  },

  disabled: function(name, table) {
    var count_records = parseInt(table.count_records)
    var offset = parseInt(table.offset)
    var limit = parseInt(table.limit)
    if (name == 'first' || name == 'previous') {
      return table.offset == 0 ? true : false
    } else {
      return (count_records - offset <= limit)
        ? true
        : false
    }
  },

  view: function(vnode) {
    var table = ds.table
    var count = ds.table.count_records
    var from = Number(ds.table.offset) + 1
    var to = Pagination.to()
    return m('div', [
      !ds.table.is_chart ? '' : m('ul', {class: 'di fl mt1 pl0'}, [
        m('li', {
          class: ['fa fa-table list di ml0 pl2 pr2 bb b--gray pointer br1 br--top f5 pt1',
          (!ds.table.tab || ds.table.tab == 'data')
            ? 'bg-white br pb2' : 'bg-light-gray pb1'
          ].join(' '),
          style: (!ds.table.tab || ds.table.tab == 'data')
            ? 'padding-top: 4px; padding-bottom: 2px' : 'padding-top: 3px; padding-bottom: 1px',
          onclick: function() {
            ds.table.tab = 'data'
          }
        }),
        m('li', {
          class: ['fa fa-bar-chart list di ml0 pl2 pr2 bb br b--gray pointer br1 br--top f5 pt1',
          (ds.table.tab == 'chart')
            ? 'bg-white bl' : 'bg-light-gray'
          ].join(' '),
          style: (ds.table.tab == 'chart')
            ? 'padding-top: 4px; padding-bottom: 2px' : 'padding-top: 3px; padding-bottom: 1px',
          onclick: function() {
            ds.table.tab = 'chart'
          }
        }),
      ]),
      m('div[name="navigation"]', {
        class: 'fr ml2 mb1 mt1 mr1',
        onclick: function(e) {
          Pagination.navigate(e.target.name, false)
        }
      }, [
          m('button[name="first"]', {
            class: [
              'icon fa fa-angle-double-left ba b--light-silver br0 bg-white',
              Pagination.disabled('first', table) ? 'moon-gray' : ''
            ].join(' '),
            disabled: Pagination.disabled('first', table)
          }),
          m('button[name=previous]', {
            class: [
              'icon fa fa-angle-left bt br bl-0 bb b--light-silver br0 bg-white',
              Pagination.disabled('previous', table)
                ? 'moon-gray' : '',
            ].join(' '),
            disabled: Pagination.disabled('previous', table)
          }),
          m('button[name=next]', {
            class: [
              'icon fa fa-angle-right bt br bb bl-0 b--light-silver br0 bg-white',
              Pagination.disabled('next', table) ? 'moon-gray' : '',
            ].join(' '),
            disabled: Pagination.disabled('next', table)
          }),
          m('button[name=last]', {
            class: [
              'icon fa fa-angle-double-right bt br bb bl-0',
              'b--light-silver br0 bg-white',
              Pagination.disabled('last', table) ? 'moon-gray' : '',
            ].join(' '),
            disabled: Pagination.disabled('last', table)
          })
        ]),
      m('div[name="statuslinje"]', {
        class: 'f6 fr mb1 mt1 ml2'
      }, [count ? from + '-' + to + ' av ' + count : count]),
    ])
  }


}

module.exports = Pagination

var config = require('./config')
var Record = require('./record')
var Toolbar = require('./toolbar')
