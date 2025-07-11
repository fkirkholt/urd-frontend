var Toolbar = {

  oninit: function() {
    mousetrap(document.body).bind('mod+s', function() {
      Grid.save()
      return false
    })
    mousetrap(document.body).bind('mod+n', function() {
      Record.create(ds.table)
      return false
    })
    mousetrap(document.body).bind('mod+f', function() {
      ds.table.search = true
      m.redraw()
      return false
    })
    mousetrap(document.body).bind('esc', function() {
      $('#urdgrid tr.focus').trigger('focus')
    })
    mousetrap(document.body).bind('alt+-', function() {
      const shy = String.fromCodePoint(0x00AD)
      navigator.clipboard.writeText(shy)
    })
  },

  onremove: function() {
    mousetrap.reset()
  },

  run_action: function(action) {
    var rec_idx = ds.table.selection
    var prim_key = ds.table.records[rec_idx].pkey
    var prim_nokler_json = JSON.stringify(prim_key)
    var address = ds.cnxn + '/' + ds.base.name +
      (action.url[0] === '/' ? '' : '/') + action.url
    var communication = action.communication

    var $form = $('form#action')
    $form.find('input[name="pkey"]').val(prim_nokler_json)

    if (ds.table.dirty) {
      alert("Du må lagre før du kan utføre handling")
      return
    }

    if (communication == 'route') {
      address += '?' + m.buildQueryString(prim_key)
      Grid.url = address
      m.route.set(address)      
    } else if (communication == 'submit') {
      $form.attr('action', address).attr('method', 'post').submit()
    } else if (communication == 'ajax') {
      m.request({
        url: address,
        method: action.method ? action.method : 'get',
        dataType: 'json',
        contentType: "application/json",
        data: JSON.stringify({
          base: ds.base.name,
          table: ds.table.name,
          pkey: prim_nokler_json
        }),
        background: true
      }).then(function(result) {
        if (action.update_field) {
          var field = ds.table.records[rec_idx]
            .fields[action.update_field]
          Field.update(result.value, field.name,
            ds.table.records[rec_idx])
          m.redraw()
        }
      }).catch(function(e) {
        alert(e.response ? e.response.detail : 'An error has occured.')
      })
    } else if (communication == 'dialog') {
      m.request({
        url: address + '?version=1',
        responseType: "text",
      }).then(function(result) {
        $('#action-dialog').append(result)
      })
      $('div.curtain').show()
      $('#action-dialog').show()
    }
  },

  button: {
    disabled: function(name) {
      var selection = ds.table.selection
      var count_records = ds.table.count_records
      var offset = ds.table.offset
      if (name == 'first' || name == 'previous') {
        return offset == 0 && selection == 0
          ? true : false
      } else {
        return (count_records - offset <= ds.table.limit &&
          selection == count_records - ds.table.offset - 1)
          ? true
          : false
      }
    }
  },

  delete_record: function() {
    var idx = ds.table.selection
    var rec = ds.table.records[idx]
    var deletable = true
    $.each(rec.relations, function(idx, rel) {
      if (rel.count_records && rel.options?.ondelete != "CASCADE") {
        deletable = false
      }
    })
    if (ds.table.privilege.delete != true || !deletable) return

    var r = true
    if (config.autosave || !config.edit_mode) {
      r = confirm('Are you sure you want to delete the record?')
    }

    if (r === true) {
      if (rec.new) {
        ds.table.records.splice(idx, 1)
      } else {
        Record.delete(rec)
      }

      if (!config.edit_mode) {
        Grid.save()
      }
    }
  },

  // Get search parameters to be shown in the search field
  get_search: function() {
    var search_params
    var param = m.route.param()
    search_params = []
    $.each(param, function(key, value) {
      if (['cnxn', 'base', 'table', 'index', 'offset', 'order'].indexOf(key) >= 0) return
      var expr = value ? key + '=' + value : key 
      search_params.push(expr)
    })

    return search_params.join('; ')
  },

  set_url: function(index, offset, replace=false) {
    // Set index in url
    var query_params = {}
    var path = m.route.get()
    if (path.includes('?')) {
      query_params = m.parseQueryString(path.slice(path.indexOf('?') + 1))
      delete query_params.index
    }
    if (index !== null) {
      query_params.index = index
    }
    if (offset !== undefined) {
      query_params.offset = offset
    }
    if (Object.keys(ds.table.grid.sort_columns).length > 0) {
      var sort = Object.values(ds.table.grid.sort_columns)[0]
      query_params.order = sort.col
      query_params.order += ' ' + sort.dir
    }
    m.route.set('/' + ds.cnxn + '/' + ds.base.name + '/!data/' + ds.table.name, query_params, {replace: replace})
  },

  view: function(vnode) {

    if (!ds.base.name || !ds.table || !ds.table.records || ds.type === 'dblist') return

    var idx = ds.table.selection
    var rec = ds.table.records[idx]

    // Table can just hold one row if last pkey column starts with 'const_'
    var single_rec = ds.table.pkey && ds.table.pkey.slice(-1)[0].substr(0, 6) == 'const_'
    var params = m.route.param()
    var full = single_rec && ds.table.records.length
    var is_pkey = true
    for (let idx in ds.table.pkey) {
      let key = ds.table.pkey[idx]
      if (params[key] === undefined) {
        is_pkey = false
      }
    }
    ds.table.hidden = config.recordview &&
      (params.index !== undefined || is_pkey)

    return m('ul', { id: 'toolbar', target: '_blank', class: 'flex f6 list pl1 mt1 mb1' }, [
      // Make form to use with submit action
      m('li', [
        m('form#action', [
          m('input', {
            type: 'hidden',
            name: 'base',
            value: ds.base.name
          }),
          m('input', {
            type: 'hidden',
            name: 'table',
            value: ds.table.name
          }),
          m('input', { type: 'hidden', name: 'pkey' }),
        ]),
      ]),
      // Button for expanding or compressing grid.
      // A compressed grid has no word wrap and shortens text
      ds.table.hidden ? '' : m('i', {
        class: 'ml1 mr2 nf pointer '
          + (config.compressed ? 'nf-md-arrow_expand' : 'nf-md-arrow_collapse'),
        title: config.compressed ? 'Ekspander' : 'Komprimer',
        onclick: function() {
          config.compressed = !config.compressed
        }
      }),
      // Button for opening search
      ds.table.hidden ? '' : m('i', {
        class: 'nf nf-fa-search ml1 mr2 pointer dim',
        title: 'Søk',
        onclick: function() {
          ds.table.filters = Search.parse_query(ds.table.query)
          ds.table.search = !ds.table.search
        }
      }),
      // Search field
      ds.table.hidden ? '' : m('input[type=search]', {
        placeholder: ds.table.fts ? "Full-text search" : "Search all text fields",
        value: Toolbar.get_search(),
        style: 'flex: 1',
        onfocus: function(event) {
          event.target.select()
        },
        onchange: function(event) {
          var value = event.target.value
          m.route.set('/' + ds.cnxn + '/' + ds.base.name + '/!data/' + ds.table.name +
            '?' + encodeURIComponent(value.replace(/;\s*/g, '&')))
        }
      }),
      // Button for creating new record
      m('li', { class: 'dib' }, [
        m('i', {
          class: [
            'nf nf-fa-file_o ml3 mr1',
            ds.table.privilege.insert && !full
              ? 'dim pointer'
              : 'moon-gray'
          ].join(' '),
          title: 'New record',
          onclick: function() {
            if (ds.table.privilege.insert != true || full) return
            Record.create(ds.table)

            if (config.recordview) {
              Toolbar.set_url(ds.table.selection)
            } else {
              Record.select(ds.table, ds.table.selection)
            }

            // Focus first input in new record
            setTimeout(function() {
              $('form[name=record] > table')
                .find('input,select,textarea')
                .first()
                .trigger('focus')
            }, 100)

            if (!config.edit_mode) {
              ds.table.edit = true
              config.edit_mode = true
            }
          }
        })
      ]),
      // Button for copying selected record
      m('li', { class: 'dib' }, [
        m('i', {
          class: [
            'nf nf-fa-copy ml2 mr1 f6',
            ds.table.privilege.insert == true && !full
              ? 'dim pointer' : 'moon-gray'
          ].join(' '),
          title: 'Copy record',
          onclick: function() {
            if (ds.table.privilege.insert != true || full) return
            Record.copy()
            if (!config.edit_mode) {
              ds.table.edit = true
              config.edit_mode = true
            }
          }
        })
      ]),
      // Button for editing selected record
      !config.edit_mode ? m('li', { class: 'dib' }, [
        m('i', {
          class: [
            'nf nf-fa-edit ml2 mr1 pointer f6',
            ds.table.privilege.update == true
              ? 'dim pointer' : 'moon-gray'
          ].join(' '),
          title: 'Edit record',
          onclick: function() {
            ds.table.edit = true
            config.edit_mode = true
          }
        })
      ]) : '',
      // Button for saving all changes
      m('li', { class: 'dib' }, [
        config.autosave || !config.edit_mode ? '' : [
          m('i', {
            class: [
              'nf nf-fa-save ml2 mr1',
              ds.table.dirty ? 'dim pointer' : 'o-30'
            ].join(' '),
              title: 'Save',
            onclick: function() {
              if (!ds.table.dirty) return
              Grid.save()
            }
          })
        ]
      ]),
      // Button for deleting selected record
      ds.table.hide ? '' : m('li', { class: 'dib' }, [
        m('i', {
          class: [
            'nf nf-fa-trash_o ml2 mr1',
            (ds.table.privilege.delete == true &&
              rec && Record.is_deletable(rec))
              ? 'dim pointer' : 'o-30'
          ].join(' '),
          title: 'Delete',
          onclick: Toolbar.delete_record
        })
      ]),
      // Button for printing page
      m('li', { class: 'dib' }, [
        m('i', {
          class: 'nf nf-fa-print ml1 mr2 pointer dim',
          onclick: function() {
            print()
          }
        })
      ]),
      // Button for more actions
      m('li', { class: 'dib relative' }, [
        m('i', {
          class: 'nf nf-fa-cog ml2 mr1 pointer dim',
          title: 'More actions',
          onclick: function() {
            $('ul#actions').toggle()
          }
        }),
        m('ul#actions', {
          class: [
            'absolute left-0 list pa1 dn pointer z-999',
            config.dark_mode ? 'bg-dark-gray ba b--gray' : 'bg-white shadow-5'
          ].join(' ')
        }, [
            m('li', {
              class: 'nowrap hover-blue',
              onclick: function() {
                $('#export-dialog').show()
                $('div.curtain').show()
                $('ul#actions').hide()
              }
            }, 'Export records ...'),
            m('li', {
              class: 'nowrap hover-blue',
              onclick: function() {
                $('#convert-dialog').show()
                $('div.curtain').show()
                $('ul#actions').hide()
              }
            }, 'Convert fields ...'),
            Object.keys(ds.table.actions).map(function(label, idx) {
              var action = ds.table.actions[label]

              var txt = action.communication != 'ajax'
                ? action.label + ' ...'
                : action.label

              return action.disabled ? '' : m('li', {
                class: 'nowrap hover-blue',
                title: action.description,
                onclick: function() {
                  Toolbar.run_action(action)
                  $('ul#actions').toggle()
                }
              }, '- ' + txt)
            })
          ])
      ]),
      // When single record is shown.
      !config.recordview || !ds.table.hidden ? '' : m('li.dib', {
        onclick: function(e) {
          // Toolbar.navigate(e.target.name)
        }
      }, [
          m('button[name="first"]', {
            class: [
              'icon nf nf-fa-angle_double_left ba b--light-silver br0 bg-white',
              Toolbar.button.disabled('first') ? 'moon-gray' : '',
            ].join(' '),
            disabled: Toolbar.button.disabled('first'),
            onclick: function() {
              if (ds.table.offset == 0) {
                Toolbar.set_url(0, 0)
              } else {
                Pagination.navigate('first', true)
              }
            }
          }),
          m('button[name=previous]', {
            class: [
              'icon nf nf-fa-angle_left bt br bl-0 bb b--light-silver br0 bg-white',
              Toolbar.button.disabled('previous') ? 'moon-gray' : ''
            ].join(' '),
            disabled: Toolbar.button.disabled('previous'),
            onclick: function() {
              var idx = ds.table.selection
              var prev = parseInt(idx) - 1
              if (prev == -1) {
                Pagination.navigate('previous', true)
              } else {
                Toolbar.set_url(prev)
              }
            }
          }),
          m('button[name=next]', {
            class: [
              'icon nf nf-fa-angle_right bt br bb bl-0 b--light-silver br0 bg-white',
              Toolbar.button.disabled('next') ? 'moon-gray' : '',
            ].join(' '),
            disabled: Toolbar.button.disabled('next'),
            onclick: function() {
              var idx = ds.table.selection
              var next = parseInt(idx) + 1
              if (next == ds.table.records.length) {
                Pagination.navigate('next', true)
              } else {
                Toolbar.set_url(next)
              }
            }
          }),
          m('button[name=last]', {
            class: [
              'icon nf nf-fa-angle_double_right bt br bb bl-0',
              'b--light-silver br0 bg-white',
              Toolbar.button.disabled('last') ? 'moon-gray' : '',
            ].join(' '),
            disabled: Toolbar.button.disabled('last'),
            onclick: function() {
              Pagination.navigate('last', true)
            }
          }),
        ]),

      /*
      !ds.table.help ? '' : m('i', {
          id: 'btn_help_table',
          class: 'nf nf-fa-question',
          title: 'Hjelp',
          style: 'margin-left: 10px; cursor: pointer',
          onclick: function() {
              // TODO: Se på hvordan dette skal implementeres
          }
      }),
      */
    ])
  }
}

export default Toolbar

import mousetrap from 'mousetrap'
import config from './config.js'
import Grid from './grid.js'
import Search from './search.js'
import Record from './record.js'
import Pagination from './pagination.js'
