var config = require('./config.js')
var breadcrumb = require('./breadcrumb.js')

var header = {

  set_admin: function(value) {
    config.admin = value
    m.redraw()
  },

  view: function(vnode) {
    return [
      m(breadcrumb),
      m('div#menu', {
        class: 'fr relative mt2'
      }, [
          m('div', {
            class: 'fa fa-cog ml3 mr3',
            onclick: function() {
              $('div#menu ul').toggle()
            }
          }),
          m('ul', {
            class: 'fixed right-0 list dn pa1 shadow-5 pointer '
              + 'bg-white black mt0',
            onclick: function() {
              $('div#menu ul').hide()
            }
          }, [
              m('li', {
                onclick: function() {
                  $('#preferences').show()
                  $('#preferences [name=autosave]').prop('checked', config.autosave)
                  $('div.curtain').show()
                }
              }, 'Innstillinger'),
              m('li', {
                class: 'dn',
                onclick: function() {
                  if ($('#keyboard-shortcuts').css('visibility') == 'visible') {
                    $('#keyboard-shortcuts').css('visibility', 'hidden')
                    $(this).html('Show keyboard shortcuts')
                  }
                  else {
                    $('#keyboard-shortcuts').css('visibility', 'visible')
                    $(this).html('Hide keyboard shortcuts')
                  }
                }
              }, 'Hurtigtaster'),
              m('li', {
                class: '',
                onclick: function() {
                  if ($('div.print-view').is(':visible')) {
                    $('div.print-view').hide()
                    $('#header').show()
                    $('#page-container').show()
                    $('#meny option[value="utskrift"]').html('Print view')
                  }
                  else {
                    m.request({
                      url: 'printable_table',
                      responseType: "text",
                    }).then(function(result) {
                        $('#print-view .content').append(result)
                      })

                    $('#header').hide()
                    $('#page-container').hide()
                    $('#print-view').show()
                    $('#meny option[value="utskrift"]')
                      .html('Hide print view')
                  }
                }
              }, 'Print'),
              m('li', {
                onclick: function() {
                  m.request({
                    url: 'logout'
                  }).then(function() {
                    ds.base.server = null
                    ds.base.name = null
                    m.route.set('')
                    $('div.curtain').show()
                    $('#login').show()
                    $('#brukernavn').trigger('focus')
                  })
                }
              }, 'Log out'),
            ])
        ]),
      m('div#user', { 
        class: 'fr mr1 mt2 cursor-default',
        onclick: function() {
          $('.curtain').show()
          $('#pwd-dialog').show()
          $('#old_pwd').val('')
          $('#new_pwd').val('')
          $('#rep_pwd').val('')
        }
      }, ds.user.name),
      (!ds.user.admin) ? null : m('label', { class: 'fr mr3 mt2' }, [
        m('input#admin_checkbox', {
          class: 'mr1',
          type: "checkbox",
          value: 1,
          checked: config.admin,
          onclick: function(ev) {
            header.set_admin(ev.target.checked)
          }
        }),
      ], 'Admin mode'),
    ]
  }
}

module.exports = header
