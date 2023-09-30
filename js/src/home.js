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
    if (config.tab == 'users' && !ds.users) return

    return m('div', [
      config.tab == 'users' ? null : m('ul', [
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
      ]),
      config.tab != 'users' ? null : ds.users.map(function(user, i) {
        return [
          user.expanded ? '' : m('p', {
            class: 'ml3 mt1 mb1 underline pointer',
            onclick: function() {
              m.request({
                method: 'get',
                url: 'user_roles',
                params: {'user': user.name, 'host': user.host} 
              }).then(function(result) {
                user.roles = result.data
              })

              user.expanded = true
            }
          }, user.name),
          !user.expanded ? '' : m('fieldset', [
            m('legend', {
              class: 'pointer underline',
              onclick: function() {
                user.expanded = false
              }
            }, user.name),
            ds.roles.map(function(role, i) {
              return m('label', { class: 'ml2' }, [
                m('input[type=checkbox]', {
                  class: 'mr1',
                  checked: user.roles.includes(role),
                  onchange: function() {
                    if (this.checked) {
                      user.roles.push(role)
                    } else {
                      const index = user.roles.indexOf(role)
                      user.roles.splice(index, 1)
                    }
                    m.request({
                      method: 'put',
                      url: 'change_user_role',
                      params: {
                        'user': user.name, 
                        'host': user.host, 
                        'role': role, 
                        'grant': this.checked 
                      }
                    })
                  }
                }),
                role
              ])
            })
          ])
        ]
      })
    ])
  }
}

module.exports = home
