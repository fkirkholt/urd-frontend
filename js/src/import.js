var Cookies = require('js-cookie')

var import_dialog = {

  import_tsv: function() {
    params = {}
    params.base = ds.base.name
    params.dir = $('input[name=dir]:checked').val()
    m.request({
      method: 'put',
      url: 'import_tsv',
      params: params
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
          onclick: function() {
            this.import_tsv()
          }.bind(this)
        }),
        m('input[type=button]', {
          value: 'Avbryt',
          class: 'fr',
          onclick: function() {
            $('div.curtain').hide()
            $('#import-dialog').hide()
          }
        }),
      ])
    ])
  }
}

module.exports = import_dialog
