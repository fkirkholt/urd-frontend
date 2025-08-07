import Cookies from 'js-cookie'

var Import_dialog = {

  import_started: false,
  msg: '',
  progress: 0,

  import_tsv: function() {
    var params = {}
    params.cnxn = ds.cnxn
    params.base = ds.base.name
    params.dir = $('input[name=dir]:checked').val()
    var params = Object.keys(params).map(function(k) {
      return k + '=' + params[k]
    }).join('&')
    let eventSource = new EventSource('/import_tsv?' + params);

    eventSource.onmessage = function(event) {
      var data = JSON.parse(event.data)
      Import_dialog.msg = data.msg
      Import_dialog.progress = data.progress
      m.redraw()
      if (data.msg == "done") {
        eventSource.close()
        Import_dialog.msg = ''
        $('div.curtain').hide()
        $('#import-dialog').hide()
      }
    }
  },

  view: function() {
    if (!ds.config) {
      return
    }

    var basename = ds.base.name.substring(0, ds.base.name.lastIndexOf("."));

    return m('div', [
      m('H3', 'Import tsv-files from'),
      !ds.config.exportdir ? '' :  m('div[name=dest]', { class: "mt2" }, [
        m('label', [m('input[type=radio]', {
          name: 'dir',
          value: ds.config.exportdir + '/' + ds.path + '/data'
        })], ' ' + ds.config.exportdir + '/' + ds.path + '/data'),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dir',
          value: ds.config.exportdir + '/' + ds.path + '/' + basename + '-data/'
        })], ' ' + ds.config.exportdir + '/' + ds.path + '/' + basename + '-data/')
      ]),
      m('div[name=buttons]', { class: "bottom-0 mt2" }, [
        m('div', Import_dialog.msg),
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
        m('div', {class: 'fl'}, [
          !Import_dialog.msg ? null : m('progress', {
            value: Import_dialog.progress,
            max: '100',
          })
        ])
      ])
    ])
  } 
}

export default Import_dialog
