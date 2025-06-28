import config from './config.js'
import Datapanel from './datapanel.js'
import Grid from './grid.js'
import Codefield from './codefield.js'

var home = {

  editor: null,

  load_databases: function() {

    Grid.url = ''

    var params = {}
    params.cnxn = ds.cnxn
    if (ds.path) {
      params.path = ds.path
    }

    m.request({
      method: 'get',
      url: 'dblist',
      params: params
    }).then(function(result) {
      ds.dblist = result.data
      ds.path = result.data.path
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

    return [m('div#list', { class: 'overflow-y-auto' }, [
      config.tab == 'users' ? null : m('ul', { class: 'nf-ul' }, [
        !ds.path ? null : m('li', [
          m('span', { class: "nf-li" }, [
            m('i', { class: "nf nf-fa-level_up" })
          ]),
          m('a', {
            class: 'no-underline hover-blue',
            href: '#/' + ds.cnxn + '/' + (ds.path ? ds.path.substring(0, ds.path.lastIndexOf('/')) : ''),
          }, '..')
        ]),
        ds.dblist.records.map(function(post, i) {
          return m('li', [
            m('mt1.mb1', [
              post.columns.type == 'database' ? [
                m('span', { class: "nf-li" }, [
                  m('i', { class: "nf nf-oct-database" })
                ]),
                m('a', {
                  class: 'no-underline hover-blue light-blue',
                  href: '#/' + ds.cnxn + '/' + post.columns.name + '/!data'
                }, ' ' + post.columns.label)
              ]
              : post.columns.type == 'dir' ?  [
                m('span', { class: "nf-li" }, [
                  m('i', { class: "nf nf-md-folder_outline" })
                ]),
                m('a', { 
                  class: 'no-underline blue',
                  href: '#/' + ds.cnxn + '/' + post.columns.name,
                }, ' ' + post.columns.label)
              ]
              : [
                m('span', { class: "nf-li" }, [
                  m('i', { class: "nf nf-oct-file" })
                ]),
                m('a', {
                  class: [
                    'no-underline hover-blue',
                    (post.columns.size > 100000000) ? 'gray' : '',
                  ].join(' '),
                  href: '#/' + ds.cnxn + '/' + post.columns.name,
                }, ' ' + post.columns.label)
              ]
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
    ]),
    m('div#file', { 
      class: 'flex flex-column mw7',
      style: 'flex-grow: 1'
    }, [
      !ds.file || ds.file.type == 'dir' ? '' : m('div', { class: 'ml3 mb2'}, [
        m('i', { 
          class: [
            'nf nf-fa-save ml2', 
            ds.file.dirty ? 'dim pointer' : 'o-30'
          ].join(' '),
          onclick: function() {
            m.request({
              method: 'post',
              url: 'file',
              params: {
                path: ds.file.path,
                content: ds.file.content
              }
            })
            .then(function(result) {
              if (result) {
                ds.file.dirty = false
              }
            })

          }
        })
      ]),
      !ds.file || ds.file.type == 'dir' ? '' 
      : ds.file.msg ? m('div', { class: 'ml3'}, ds.file.msg) 
      : m(Codefield, {
        id: 'file-content',
        class: 'ml3 ba b--light-silver mb2 bottom-0 overflow-y-auto',
        editable: true,
        'data-pkey': ds.file.path,
        lang: ds.file.path.endsWith('.sql') ? 'sql'
          : ds.file.path.endsWith('.yml') ? 'yaml'
          : ds.file.path.endsWith('.json') ? 'json'
          : ds.file.path.endsWith('.md') ? 'md'
          : 'text',
        value: ds.file.content,
        oncreate: function(vnode) {
          home.editor = vnode.state
        },
        onchange: function(value) {
          ds.file.content = value
          ds.file.dirty = true
          m.redraw()
        }
      })
    ])]
  }
}

export default home
