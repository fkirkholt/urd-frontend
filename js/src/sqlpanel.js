var SQLpanel = {

  draw_result: function() {
    if (!ds.result) return

    return ds.result.map(function(query, i) {
      var table = ds.base.tables[query.table]
      if (table) {
        var pk_length = table.pkey.columns.length
        var pk_col = table.pkey.columns[pk_length - 1]
      }
      if (query.data) {
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
          m('table', {
            class: 'collapse ba'
          }, [
            m('tr.striped--light-gray', [
              Object.keys(query.data[0]).map(function(item, i) {
                return m('th', {
                  class: 'pl1 pl2 tl'
                }, item)
              })
            ]),
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
          ]),
          m('p')
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

    return [
      m(Tablelist),
      m('div', {
        onclick: function() {
          $('#tablelist-context').hide()
        }

      }, [
        m('div', { style: 'width: fit-content' }, [
          m(Codefield, {
            id: 'query',
            class: 'ml3 w8 ba b--light-silver mb2',
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
