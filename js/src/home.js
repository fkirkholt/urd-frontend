import config from './config.js'
import Grid from './grid.js'
import Codefield from './codefield.js'
import { Marked } from 'marked'
import { markedHighlight } from "marked-highlight"
import hljs from 'highlight.js'
import Filetree from './filetree.js'


const KEY_CODE_ENTER = 13

var home = {

  editor: null,

  save_file: function(filepath, content, load_files=false) {
    m.request({
      method: 'post',
      url: '/file',
      params: {
        cnxn: ds.cnxn,
        path: filepath,
      },
      body: content
    })
    .then(function(result) {
      if (result && ds.file) {
        ds.file.dirty = false
      }
      if (load_files) {
        ds.dblist = null
        home.initialized = false
        return m.request({
          method: 'get',
          url: '/file_list',
          params: {cnxn: ds.cnxn, path: ds.path} 
        })
      }
    })
    .then(function(result) {
      ds.dblist = result.data
    })
  },

  parsed_markdown: function(content) {
    if (!content) {
      return content
    }
    let result = content.replace(/(^|\s)(:[\w+:-]*:)/gi, function (_, p1, p2) {
      return p1 + '<mark class="gray" data-value="' + p2 + '">' + p2 + '</mark>';
    });

    // Hack to make marked format first list item like the rest.
    // There must be text in front of the list
    result = 'dummy-paragraph\n\n' + result

    const marked = new Marked(
      markedHighlight({
        emptyLangClass: 'hljs',
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        }
      })
    );

    result = marked.parse(result)
    // Remove text inserted in hack above
    result = result.replace('<p>dummy-paragraph</p>', '')

    return m.trust(result)
  },

  load_databases: function(grep=null) {

    Grid.url = ''

    var params = {}
    params.cnxn = ds.cnxn
    params.pattern = grep
    params.path = ds.path

    m.request({
      method: 'get',
      url: '/dblist',
      params: params
    }).then(function(result) {
      ds.dblist = result.data
      ds.path = result.data.path
      ds.base.system = result.data.system
      if (grep) {
        ds.dblist.grep = grep
      }
    })
    .catch(function(e) {
      if (e.code === 401) {
        if (typeof(e.response.detail) == 'string') {
          alert(e.response.detail)
        } else {
          ds.base.system = e.response.detail.system
          ds.base.server = e.response.detail.host
          ds.base.name = e.response.detail.database
        }
        $('div.curtain').show()
        $('#login').show()
        $('#brukernavn').trigger('focus')
      } else {
        alert(e.response ? e.response.detail : 'Error loading databases')
      }
    })
  },

  onupdate: function() {
    $('a').not('[href^="http"]').off().on('click', function(e) {
      m.route.set($(this).attr('href'))
      e.preventDefault()
    })

    var selector = 'div.markdown'
    for (const i of document.querySelectorAll(
      selector + " ol, "  + 
      selector + " ul li p:first-child"
    )) {
      const t = i.parentElement
      if (t.childElementCount > 1 && !t.className.includes('fold')) {
        t.className = "fold open"
        i.onclick = function(event) {
          event.stopPropagation()
          t.classList.toggle("open")
          t.classList.toggle("close")
        } 
      }
    }
  },

  filterRecs: function(recs) {
    recs = recs.filter(function(rec) {
      const filter = $('#filter_files').val()?.toLowerCase()
      const label = rec.columns.label.toLowerCase()
      const descr = rec.columns.description?.toLowerCase()

      return !(rec.deleted || label.includes('../') ||
        !ds.dblist.grep?.includes(filter) && (filter !== undefined && 
        !(label.includes(filter) ||
         (filter.at(0) == '^' && label.startsWith(filter.substring(1)) ||
         (filter.at(-1) == '$' && label.endsWith(filter.replace('$', '')))))) &&
        !descr?.includes(filter)
      )
    }).sort((a, b) => { 
      return a.columns.label.localeCompare(b.columns.label, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      }) 
    })

    return recs
  },

  view: function() {
    if (!ds.dblist) return
    if (config.tab == 'users' && !ds.users) return

    if (!home.initialized) {
      home.filtered_recs = home.filterRecs(ds.dblist.records)
      home.treeData = Filetree.buildTree(home.filtered_recs)
      Object.keys(home.treeData.children).forEach(key => {
        Filetree.collapseTree(home.treeData.children[key])
      })
      home.initialized = true
    }

    const filecompletions = []
    for (const i in ds.dblist.records) {
      const rec = ds.dblist.records[i]
      const option = {
        label: ds.path ? ds.path + '/' + rec.columns.label : rec.columns.label,
        type: 'keyword',
        title: rec.columns.title
      }
      filecompletions.push(option)
    }
    if (ds.dblist.autocomplete) {
      ds.dblist.autocomplete.filecompletions = filecompletions
    }

    return [m('div#list', { 
      class: 'overflow-y-auto overflow-x-hidden', 
      style: (ds.file && ds.file.type != 'dir') ? 'min-width: 250px; width:250px' : ''
    }, [
      m('ul#filelist-context', {
        class: [
        'absolute left-0 list pa1 shadow-5 dn pointer z-999 pl2 pr2 ba b--gray',
        config.dark_mode ? 'bg-dark-gray' : 'bg-white'
        ].join(' ')
      }, [
        m('li', {
          class: 'hover-blue',
          onclick: function() {
            Filetree.context_file.rename = true
            $('#filelist-context').hide()
          }
        }, 'Rename'),
        m('li', {
          class: 'hover-blue',
          onclick: function() {
            const node = Filetree.context_file
            $('#filelist-context').hide()
            if (!confirm('Are you sure you want to delete the file?')) {
              return
            }

            m.request({
              method: 'delete',
              url: '/file_delete',
              params: {
                cnxn: ds.cnxn,
                filename: node.path
              },
            })
            .then(function(result) {
              if (result.success && ds.file && ds.file.path == node.path) {
                m.route.set('/' + ds.cnxn + (ds.path ? '/' + ds.path : ''))
              }
              node.deleted = true
            })
          }
        }, 'Delete')
      ]),
      config.tab == 'users' ? null : m('input', {
        id: 'filter_files',
        style: 'width:240px',
        placeholder: 'filter files',
        onkeydown: function(event) {
          home.initialized = false
          var val = event.target.value
          var file
          if (event.keyCode == KEY_CODE_ENTER) {
            if (event.shiftKey) {
              file = (ds.dblist.path ? ds.dblist.path + '/' : '') + val
              m.route.set('/' + ds.cnxn + '/' + file)
            } else {
              m.route.set('/' + ds.cnxn + (ds.dblist.path ? ('/' + ds.dblist.path) : '')
                          + (val ? '?grep=' + val : ''))
            }
          }
          return
        }
      }),
      config.tab == 'users' ? null : m('div', {
        style: 'width:240px'
      }, [
        m('span', {
          class: 'fr gray' 
        }, home.filtered_recs.length == ds.dblist.records.length 
          ? home.filtered_recs.length
          : home.filtered_recs.length + '/' + ds.dblist.records.length
        )
      ]),
      config.tab == 'users' ? null : m("ul.list", { style: 'margin-left: 20px' }, [
        !ds.path ? null : m('li', [
          m('i', { class: "nf nf-fa-level_up", style: "margin-left:-24px" }),
          m('span', {
            class: 'no-underline hover-blue pointer ml2',
            onclick: function() {
              const path = ds.path.substring(0, ds.path.lastIndexOf('/'))
              m.route.set('/' + ds.cnxn + (path ? '/' + path : ''))
            }
          }, '..')
        ]),
        Object.values(home.treeData.children).flatMap(function(child, idx) {
          const node = home.treeData
          if (idx == 100 && home.trunc !== false) {
            return m('span', {
              class: 'underline pointer',
              onclick: function() {
                node.trunc = false
              }
            }, 'Show all')
          } else if (idx > 100 && node.trunc !== false) {
            return []
          }
          return m(Filetree, { node: child })
        })
      ]),
      config.tab != 'users' ? null : ds.users.map(function(user) {
        return [
          user.expanded ? '' : m('p', {
            class: 'ml3 mt1 mb1 underline pointer',
            onclick: function() {
              m.request({
                method: 'get',
                url: '/user_roles',
                params: {cnxn: ds.cnxn, user: user.name, host: user.host} 
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
            ds.roles.map(function(role) {
              return m('label', { class: 'ml2' }, [
                m('input[type=checkbox]', {
                  class: 'mr1',
                  checked: user.roles?.includes(role),
                  onchange: function() {
                    if (this.checked) {
                      user.roles.push(role)
                    } else {
                      const index = user.roles.indexOf(role)
                      user.roles.splice(index, 1)
                    }
                    m.request({
                      method: 'put',
                      url: '/change_user_role',
                      params: {
                        'cnxn': ds.cnxn,
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
            }),
            ds.roles.length ? null : m('p', '(No roles)') 
          ])
        ]
      }),
      config.tab !== 'users' || ds.new_user ? '' : m('p', {
        class: 'ml3 mt1 mb1 underline pointer',    
        onclick: function() {
          ds.new_user = true
        }
      }, 'Create new user'),
      config.tab !== 'users' || !ds.new_user ? '' : m('fieldset', [
        m('legend', {
          class: 'pointer underline',
          onclick: function() {
            ds.new_user = false
          }
        }, 'Create new user '),
        m('legend', [m('b', { class: 'db' }, 'brukernavn'), m('input#uid')]),
        m('legend', [m('b', { class: 'db' }, 'passord'), m('input#pwd')]),
        m('input[type=button]', { 
          class: 'fr mt2',
          value: 'OK',
          onclick: function() {
            m.request({
              method: 'put',
              url: '/create_user',
              params: {
                cnxn: ds.cnxn,
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
      class: 'flex flex-column',
      style: 'flex-grow: 1'
    }, [
      !ds.file || ds.file.type == 'dir' ? '' 
      : m('div', { class: 'ml3 mb2'}, [
        m('i', { 
          id: 'save-file',
          class: [
            'nf nf-fa-save ml2', 
            ds.file.dirty ? 'dim pointer' : 'o-30',
            config.edit_mode ? '' : 'dn'
          ].join(' '),
          onclick: function() {
            home.save_file(ds.file.path, home.editor.get_value())
          }
        }),
        m('i', {
          id: 'fold-list',
          class: [
            'nf ml2',
            ds.file.folded ? 'nf-oct-unfold' : 'nf-oct-fold',
            config.edit_mode ? 'dn' : ''
          ].join(' '),
          title: 'Fold all lists',
          onclick: function() {
            var selector = 'div.markdown'

            for (const i of document.querySelectorAll(
              selector + " ol, "  + selector + " ul li p:first-child"
            )) {
              const t = i.parentElement
              t.className = ds.file.folded ? "fold open" : "fold close"
            }
            ds.file.folded = !ds.file.folded
          }
        }),
      ]),
      !ds.file || ds.file.type == 'dir' ? '' 
      : ds.file.msg ? m('div', { class: 'ml3'}, ds.file.msg) 
      : ds.file.type.startsWith('image/') ? m('div', m('img', { 
        src: '/' + ds.file.path
      }))
      : ds.file.type == 'application/pdf' ? m('embed', {
        src: ds.file.name,
        type: ds.file.type,
        height: '100%',
        width: '100%'
      })
      : !config.edit_mode && ds.file.path.endsWith('.md') ? m('div', {
        class: 'ml3 overflow-y-auto markdown'
      }, home.parsed_markdown(ds.file.content))
      : m(Codefield, {
        id: 'file-content',
        class: 'ml3 ba b--light-silver mb2 bottom-0 overflow-y-auto',
        editable: config.edit_mode,
        'data-pkey': ds.file.path,
        lang: ds.file.path.endsWith('.sql') ? 'sql'
          : ds.file.path.endsWith('.yml') ? 'yaml'
          : ds.file.path.endsWith('.json') ? 'json'
          : ds.file.path.endsWith('.md') ? 'md'
          : ds.file.path.endsWith('.py') ? 'py'
          : ds.file.path.endsWith('.js') ? 'js'
          : ds.file.path.endsWith('.css') ? 'css'
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
    ]),
    !ds.file?.path.endsWith('.md') ? '' : m('div#backlinks', {
      class: 'flex flex-column ml3',
      style: 'min-width:210px'
    }, [
      m('h3', { class: 'mb0' }, 
        'Backlinks (' + (ds.file.backlinks ? ds.file.backlinks.length : '0')  + ')'),
      m('ul', [
        !ds.file.backlinks ? '' : ds.file.backlinks.map(function(link) {
          return m('li', {
            class: 'pointer hover-blue',
            onclick: function() {
              m.route.set('/' + ds.cnxn + (ds.path ? '/' + ds.path : '') + '/' + link)
            }
          }, link)
        })
      ])
    ])
    ]
  }
}

export default home
