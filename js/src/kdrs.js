var KDRS_dialog = {

  export_xml: function(version, descr) {
    var param = {}
    param.base = ds.base.name
    param.version = version
    param.descr = descr

    var params = Object.keys(param).map(function(k) {
      return k + '=' + param[k]
    }).join('&')
    window.open('/kdrs_xml?' + params, '_blank')
  },

  view: function() {
    return m('div', [
      m('h3', 'Export to KDRS xml schema'),
      m('label', 'Version'),
      m('br'),
      m('input', {
        name: 'version',
        class: 'w4'
      }),
      m('br'),
      m('label', 'Description'),
      m('textarea', {
        name: 'description',
        class: 'w-100'
      }),
      m('input[type=button]', {
        value: 'Make XML',
        onclick: function() {
          var version = $('#kdrs-dialog input[name="version"]').val()
          var descr = $('#kdrs-dialog textarea[name="description"]').val()
          KDRS_dialog.export_xml(version, descr)
          $('div.curtain').hide()
          $('#kdrs-dialog').hide()
        }
      }),
      m('input[type=button]', {
        value: 'Avbryt',
        class: 'fr',
        onclick: function() {
          $('div.curtain').hide() // gjemme
          $('#kdrs-dialog').hide()
        }
      }),
    ])
  }
}

export default KDRS_dialog
