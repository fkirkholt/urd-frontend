import config from './config.js'
import Breadcrumb from './breadcrumb.js'

var Header = {

  set_admin: function(value) {
    config.admin = value
    m.redraw()
  },

  onupdate: function() {
    var favicon
    var title
    var link = document.querySelector("link[rel~='icon']")
    if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
    }
    if (ds.type == 'login') {
      favicon = 'location.svg'
      title = 'login'
    } else if (ds.type == 'file' && ds.file && ds.file.type != 'dir') {
      favicon = 'file.svg'
      title = ds.file.name
    } else if (ds.type == 'file' && ds.file && ds.file.type == 'dir') {
      favicon = 'folder.svg'
      title = ds.file.path
    } else if (ds.type == 'dblist' && ['sqlite', 'duckdb'].includes(ds.base.system)) {
      favicon = 'folder.svg'
      title = ds.cnxn
    } else if (ds.type == 'dblist') {
      favicon = 'host.svg'
      title = ds.cnxn
    } else {
      favicon = 'database.svg'
      title = ds.base.name
    }
    document.title = title
    link.href = '/static/css/img/' + favicon
    if (config.dark_mode) {
      $('body').addClass('bg-dark bg-dark-gray white')
      $('body').removeClass('bg-light-gray')
      $('div.bg-moon-gray').removeClass('bg-moon-gray').addClass('bg-mid-gray')
    } else {
      $('body').addClass('bg-light-gray')
      $('body').removeClass('bg-dark bg-dark-gray white')
      $('div.bg-mid-gray').removeClass('bg-mid-gray').addClass('bg-moon-gray')
    }
  },

  view: function(vnode) {
    return [
      m(Breadcrumb),
      m('div#menu', {
        class: 'fr relative mt2'
      }, [
          m('div', {
            class: 'nf nf-fa-cog ml3 mr3',
            onclick: function() {
              $('div#menu ul').toggle()
            }
          }),
          m('ul', {
            class: 'fixed right-0 list dn pa1 shadow-5 pointer z-999 '
              + 'bg-white black mt0',
            onclick: function() {
              $('div#menu ul').hide()
            }
          }, [
              m('li', {
                onclick: function() {
                  $('#preferences').show()
                  $('div.curtain').show()
                }
              }, 'Preferences'),
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
              }, 'Keyboard shortcuts'),
              m('li', {
                // Don't display til it's working again
                class: 'dn',
                onclick: function() {
                  if ($('div.print-view').is(':visible')) {
                    $('div.print-view').hide()
                    $('#header').show()
                    $('#page-container').show()
                    $('#meny option[value="utskrift"]').html('Print view')
                  }
                  else {
                    m.request({
                      url: '/printable_table',
                      params: { cnxn: ds.cnxn },
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
                    url: '/logout',
                    params: { cnxn: ds.cnxn }
                  }).then(function(result) {
                    ds.base.system = result.cnxn.system
                    ds.base.server = result.cnxn.host
                    ds.base.name = result.cnxn.database
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
            Header.set_admin(ev.target.checked)
          }
        }),
      ], 'Admin mode'),
    ]
  }
}

export default Header
