var config = require('./config.js')
var datapanel = require('./datapanel.js')
var grid = require('./grid.js')

var home = {

  load_databases: function() {

    grid.url = ''

    m.request({
      method: 'get',
      url: 'dblist'
    }).then(function(result) {
      ds.dblist = result.data
    }).catch(function(e) {
      if (e.code === 401) {
        $('div.curtain').show()
        $('#login').show()
        $('#brukernavn').trigger('focus')
      } else {
        alert(e.response ? e.response.detail : 'An error has occurred.')
      }
    })
  },

  oninit: function() {
    if (!ds.dblist) {
      home.load_databases()
    }
  },

  view: function(vnode) {
    if (!ds.dblist) return

    if (config.admin) return m(datapanel)

    return m('div', [
      m('h2', 'Databaser'),
      m('ul', [
        ds.dblist.records.map(function(post, i) {
          return m('li', [
            m('h4.mt1.mb1', [
              m('a', {
                href: '#/' + post.columns.name + '/data'
              }, post.columns.label),
            ]),
            m('p.mt1.mb1', post.columns.description)
          ])
        })
      ])
    ])
  }
}

module.exports = home
