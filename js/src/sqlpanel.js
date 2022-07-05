var SQLpanel = {

    draw_result: function() {
        if (!ds.result) return

        return ds.result.map(function(query, i) {
            if (query.data) {
                return [
                    m('p', {class: 'mb0'}, m.trust(query.string.replace(/\n/g, '<br>'))),
                    m('p', {class: 'mt0 gray'}, '(' + query.time + 's)'),
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
                            return m('tr.striped--light-gray', [
                                Object.keys(item).map(function(cell, i) {
                                    return m('td', {
                                        class: 'pl1 pl2'
                                    }, item[cell])
                                })
                            ])
                        })
                    ]),
                    m('p')
                ]
            } else {
                return [
                    m('p', m.trust(query.string.replace("\n", '<br>'))),
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
        return [
            m(Contents),
            m('div', {

            }, [
                m('div', {style: 'width: fit-content'}, [
                    m(SQLeditor),
                    m('div', [
                        m('button', {
                            class: 'fr pt0 pb0 fa fa-play',
                            onclick: function() {
                                var sql = $('#sql').val()
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
var Contents = require('./contents')
var SQLeditor = require('./sqleditor')
