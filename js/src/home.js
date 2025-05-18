import config from './config.js'
import Datapanel from './datapanel.js'
import Grid from './grid.js'

var home = {

  load_databases: function() {

    Grid.url = ''

    m.request({
      method: 'get',
      url: 'dblist'
    }).then(function(result) {
      ds.dblist = result.data
      ds.base.system = result.data.system
    }).catch(function(e) {
      if (e.code === 401) {
        ds.base.system = e.response.detail.system
        ds.base.server = e.response.detail.host
        ds.base.name = e.response.detail.database
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
        ds.dblist.subfolders.length == 0 ? null : m('li', [
          m('a', {
            class: 'no-underline hover-blue',
            href: '#',
            onclick: function() {
              ds.dblist.subfolders.pop()
              m.request({
                method: 'get',
                url: 'dblist',
                params: {
                  subfolder: ds.dblist.subfolders 
                }
              }).then(function(result) {
                ds.dblist = result.data
              })
            }
          }, '..')
        ]),
        ds.dblist.records.map(function(post, i) {
          return m('li', [
            m('h4.mt1.mb1', [
              post.columns.name.endsWith('.db') ? m('a', {
                class: 'no-underline hover-blue',
                href: '#/' + post.columns.name.replace(/\.db$/, '') + '/data'
              }, post.columns.label)
              : m('a', { 
                class: 'no-underline green',
                href: '#',
                onclick: function() {
                  ds.dblist.subfolders.push(post.columns.name)
                  m.request({
                    method: 'get',
                    url: 'dblist',
                    params: {
                      subfolders: JSON.stringify(ds.dblist.subfolders)
                    }
                  }).then(function(result) {
                    ds.dblist = result.data
                  })
                }
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
                  checked: user.roles && user.roles.includes(role),
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
      }),
      config.tab !== 'users' || ds.new_user ? '' : m('p', {
        class: 'ml3 mt1 mb1 underline pointer',    
        onclick: function() {
          ds.new_user = true
        }
      }, 'Opprett ny bruker'),
      config.tab !== 'users' || !ds.new_user ? '' : m('fieldset', [
        m('legend', {
          class: 'pointer underline',
          onclick: function() {
            ds.new_user = false
          }
        }, 'Opprett ny bruker '),
        m('legend', [m('b', { class: 'db' }, 'brukernavn'), m('input#uid')]),
        m('legend', [m('b', { class: 'db' }, 'passord'), m('input#pwd')]),
        m('input[type=button]', { 
          class: 'fr mt2',
          value: 'OK',
          onclick: function() {
            m.request({
              method: 'put',
              url: 'create_user',
              params: {
                name: $('#uid').val(),
                pwd: $('#pwd').val()
              }
            }).then(function(result) {
              ds.users = result.data.users
              ds.new_user = false
            }).catch(function(e) {
              if (e.code === 401) {
                ds.base.system = e.response.detail.system
                ds.base.server = e.response.detail.host
                ds.base.name = e.response.detail.database
                $('div.curtain').show()
                $('#login').show()
                $('#brukernavn').trigger('focus')
              } else {
                alert(e.response ? e.response.detail : 'An error has occurred.')
              }
            })
          }
        })
      ])
    ])
  }
}

export default home
