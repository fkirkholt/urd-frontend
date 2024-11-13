var SQLpanel = {

  get_chart_data: function(data, table) {
    if (table && table.name.endsWith('_grid') && table.name.replace('_grid', '') in ds.base.tables) {
      table = ds.base.tables[table.name.replace('_grid', '')]
    }
    else if (table && table.name.endsWith('_view') && table.name.replace('_view', '') in ds.base.tables) {
      table = ds.base.tables[table.name.replace('_view', '')]
    }

    chart_cols = Object.keys(data[0])
    has_pkey = false
    pkey = []
    if (table && table.pkey.columns) {
      has_pkey = table.pkey.columns.every(val => chart_cols.includes(val));
    }
    if (has_pkey) {
      chart_cols.unshift('pkey')
      pkey = table.pkey.columns
    }
    fkey_cols = []
    if (table) {
      for (key in table.fkeys) {
        fkey = table.fkeys[key]
        fkey_cols = fkey_cols.concat(fkey.constrained_columns)
      }
    }
    chart_data = []
    data.forEach(function(item, i) {
      for (let col in item) {
        if (typeof(item[col]) != 'number' || pkey.includes(col) || fkey_cols.includes(col)) {
          const idx = chart_cols.indexOf(col)
          if ((has_pkey && idx == 0) || idx > 0) {
            chart_cols.splice(idx, 1)
          }
        } 
      }
    }) 
    if (chart_cols.length > 1) {
      data.forEach(function(item, i) {
        new_item = {}
        if (has_pkey) {
          values = []
          table.pkey.columns.forEach(function(col, i) {
            values.push(item[col])
          })
          new_item['pkey'] = values.join(', ') 
        }
        for (let col in item) {
          chart_cols.forEach(function(col, i) {
            if (col == 'pkey') {
              return
            }
            new_item[col] = item[col]
          })
        }
        chart_data.push(new_item)
      })
    }

    return chart_data
  },

  draw_result: function() {
    if (!ds.result) return

    return ds.result.map(function(query, i) {
      var table = ds.base.tables[query.table]
      if (table) {
        var pk_length = table.pkey.columns.length
        var pk_col = table.pkey.columns[pk_length - 1]
      }
      if (query.data) {
        var show_chart = false
        var chart_data = SQLpanel.get_chart_data(query.data, table)
        if (chart_data.length && table && table.type != 'xref') {
          show_chart = true
        }

        return [
          ds.result.length == 1 ? null : m(Codefield, {
            id: 'query' + i,
            value: query.string,
            editable: false,
            lang: 'sql'
          }),
          ds.result.length == 1
            ? null
            : m('p', { class: 'mt0 gray' }, '(' + query.time + 's)'),
          !show_chart ? '' : m('ul', {
            class: 'di w-100 pl1'
          }, [
            m('li', {
              class: ['fa fa-table mt1 list di pl2 pr2 bl bt br b--gray pointer br1 br--top f5 pt1',
              (!query.tab || query.tab == 'data')
                ? 'bg-white' : 'bg-light-gray'
              ].join(' '),
              style: (!query.tab || query.tab == 'data')
                ? 'padding-bottom: 2px' : 'padding-bottom: 1px',
              onclick: function() {
                query.tab = 'data'
              }
            }),
            m('li', {
              class: ['fa fa-bar-chart mt1 list di pl2 pr2 bl bt br b--gray pointer br1 br--top f5 pt1',
              (query.tab == 'chart')
                ? 'bg-white' : 'bg-light-gray'
              ].join(' '),
              style: (query.tab == 'chart')
                ? 'padding-bottom: 2px' : 'padding-bottom: 1px',
              onclick: function() {
                query.tab = 'chart'
              }
            })
          ]),
          query.tab == 'chart' ? '' : m('table', {
            class: 'collapse ba'
          }, [
              // m('tr.striped--light-gray', [
              m('thead', [
                m('tr', [
                  Object.keys(query.data[0]).map(function(item, i) {
                    return m('th', {
                      class: 'pl1 pl2 tl'
                    }, item)
                  })
                ]),
              ]),
              m('tbody', [
                query.data.map(function(item, i) {
                  var pk_values = []
                  if (table) {
                    $.each(table.pkey.columns, function(i, col) {
                      if (item[col] !== undefined) {
                        pk_values.push(col + '=' + item[col])
                      }
                    })
                  }

                  return m('tr.striped--light-gray', [
                    Object.keys(item).map(function(cell, i) {
                      var is_link = false
                      var link
                      var value = typeof (item[cell]) == 'string'
                        ? m.trust(item[cell]
                          .replace(/\n/g, '<br>')
                          .replace(/\s/g, '&nbsp;'))
                        : typeof (item[cell]) == 'boolean'
                        ? (item[cell] ? 1 : 0)
                        : item[cell]


                      if (
                        table &&
                          pk_values.length == pk_length &&
                          cell == pk_col
                      ) {
                        is_link = true
                        link = m('a', {
                          href: "#" + ds.base.name + '/data/'
                            + table.name + '?'
                            + pk_values.join('&')
                        }, item[cell])
                      }

                      return m('td', {
                        class: 'pl1 pl2'
                      }, is_link ? link : value)
                    })
                  ])
                })
              ])
              ]),
          // m('p'),
          !show_chart || query.tab != 'chart' ? '' : m(Chart, {
            // id: 'nychart', 
            class: 'bt',
            data: chart_data // query.data
          })
        ]
      } else {
        return [
          ds.result.length == 1 ? null : m(Codefield, {
            id: 'query' + i,
            value: query.string,
            editable: false,
            lang: 'sql'
          }),
          ds.result.length == 1
            ? null
            : m('p', { class: 'mt0 gray' }, '(' + query.time + 's)'),
          m('p', {
            class: [
              'pa1',
              query.success ? 'bg-washed-green' : 'bg-washed-red'
            ].join(' ')
          }, [
              query.result,
              query.success ? m('span', {
                class: 'gray'
              }, ' (' + query.time + 's)') : ''
            ])
        ]
      }
    })
  },

  run_query: function(expressions) {
    sql = expressions.pop().trim()
    if (sql.length == 0) {
      return
    }
    m.request({
      url: 'query',
      params: {
        base: ds.base.name,
        sql: sql,
        limit: $('input.limit').val()
      }
    }).then(function(data) {
        ds.result.push(data.result)
        if (expressions.length) {
          SQLpanel.run_query(expressions)
        }
      })
  },

  view: function(vnode) {
    var total_time = 0
    if (ds.result) {
      ds.result.map(function(query, i) {
        total_time += query.time
      })
    }

    return (!ds.user || !ds.user.admin) ? null : [
      m(Tablelist),
      m('div', {
        onclick: function() {
          $('#tablelist-context').hide()
        }

      }, [
          m('div', { style: 'width: fit-content' }, [
            m(Codefield, {
              id: 'query',
              class: 'ml3 ba b--light-silver mb2',
              editable: true,
              lang: 'sql'
            }),
            m('div', { class: 'ml3 h2' }, [
              !ds.result
                ? null
                : m('span', { class: 'fl' }, total_time + 's'),
              m('button', {
                id: 'run_sql',
                class: 'fr pt0 pb0 fa fa-play',
                onclick: function() {
                  var sql = Codefield.get_value('query')
                  expressions = sql.split(';')
                  expressions.reverse()
                  ds.result = []
                  SQLpanel.run_query(expressions)
                }
              }, ' Run'),
              m('label', {
                class: 'fr mr3'
              }, [
                  'Limit: ',
                  m('input.limit', {
                    type: "number",
                    class: "w4 v-top",
                    style: "height: 18px",
                    value: config.limit,
                    onchange: function(ev) {
                      config.limit = ev.target.value
                    }
                  })
                ]),
            ])
          ]),
          m('div', {
            class: 'ml3'
          }, [
              SQLpanel.draw_result()
            ])
        ])
    ]
  }
}

module.exports = SQLpanel

var config = require('./config')
// var Contents = require('./contents')
var Tablelist = require('./tablelist')
var Codefield = require('./codefield')
var Chart = require('./chart')
