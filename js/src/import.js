var Cookies = require('js-cookie')

var import_dialog = {

  import_started: false,
  msg: '',

  import_tsv: function() {
    params = {}
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
      import_dialog.msg = e.response.detail
      import_dialog.import_started = false
      m.redraw()
      $('div.curtain').hide()
      $('#import-dialog').hide()
    })
  },

  view: function() {
    if (!ds.config) {
      return
    }

    import_dialog.cnxn_name = Cookies.get('urdr-cnxn') 
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
          value: ds.config.exportdir + '/' + import_dialog.cnxn_name + '/data/'
        })], ' ' + ds.config.exportdir + '/' + import_dialog.cnxn_name + '/data/'),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dir',
          value: ds.config.exportdir + '/' + import_dialog.cnxn_name + '/' + ds.base.name + '/data/'
        })], ' ' + ds.config.exportdir + '/' + import_dialog.cnxn_name + '/' + ds.base.name + '/data/')
      ]),
      m('div[name=buttons]', { class: "bottom-0 mt2" }, [
        m('input[type=button]', {
          value: 'OK',
          class: 'fr',
          disabled: import_dialog.import_started,
          onclick: function() {
            import_dialog.import_tsv()
            import_dialog.import_started = true
            import_dialog.msg = 'Importing ...'
          }
        }),
        m('input[type=button]', {
          value: 'Avbryt',
          class: 'fr',
          disabled: import_dialog.import_started,
          onclick: function() {
            $('div.curtain').hide()
            $('#import-dialog').hide()
          }
        }),
        m('span', import_dialog.msg)
      ])
    ])
  } 
}

module.exports = import_dialog