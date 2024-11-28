import Cookies from 'js-cookie'

var Import_dialog = {

  import_started: false,
  msg: '',

  import_tsv: function() {
    var params = {}
    params.base = ds.base.name
    params.dir = $('input[name=dir]:checked').val()
    m.request({
      method: 'put',
      url: 'import_tsv',
      params: params
    }).then(function(data) {
      this.import_started = false
      $('div.curtain').hide()
      $('#import-dialog').hide()
    }).catch(function(e) {
      alert(e.response.detail)
      Import_dialog.msg = e.response.detail
      Import_dialog.import_started = false
      m.redraw()
      $('div.curtain').hide()
      $('#import-dialog').hide()
    })
  },

  view: function() {
    if (!ds.config) {
      return
    }

    Import_dialog.cnxn_name = Cookies.get('urdr-cnxn') 
    ? Cookies.get('urdr-cnxn').toLowerCase().replace('urdr-cnxn-', '').replace(' ', '-')
    .replace('sqlite', '').replace('mysql', '').replace('mssql', '')
    .replace('duckdb', '').replace('oracle', '').replace('pgsql', '').replace('--', '-')
    .replace(/-$/g, '')
    : ds.base.system

    return m('div', [
      m('H3', 'Import tsv-files from'),
      !ds.config.exportdir ? '' :  m('div[name=dest]', { class: "mt2" }, [
        m('label', [m('input[type=radio]', {
          name: 'dir',
          value: ds.config.exportdir + '/' + Import_dialog.cnxn_name + '/data/'
        })], ' ' + ds.config.exportdir + '/' + Import_dialog.cnxn_name + '/data/'),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dir',
          value: ds.config.exportdir + '/' + Import_dialog.cnxn_name + '/' + ds.base.name + '/data/'
        })], ' ' + ds.config.exportdir + '/' + Import_dialog.cnxn_name + '/' + ds.base.name + '/data/')
      ]),
      m('div[name=buttons]', { class: "bottom-0 mt2" }, [
        m('input[type=button]', {
          value: 'OK',
          class: 'fr',
          disabled: Import_dialog.import_started,
          onclick: function() {
            Import_dialog.import_tsv()
            Import_dialog.import_started = true
            Import_dialog.msg = 'Importing ...'
          }
        }),
        m('input[type=button]', {
          value: 'Avbryt',
          class: 'fr',
          disabled: Import_dialog.import_started,
          onclick: function() {
            $('div.curtain').hide()
            $('#import-dialog').hide()
          }
        }),
        m('span', Import_dialog.msg)
      ])
    ])
  } 
}

export default Import_dialog
