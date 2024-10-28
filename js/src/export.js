var Cookies = require('js-cookie')

var export_dialog = {

  type: 'sql',
  cnxn_name: '',

  export_csv: function() {
    var param = {}
    param.base = ds.base.name

    if (ds.table) {
      param.table = ds.table.name
      param.filter = ds.table.query
    }

    param.folder = export_dialog.cnxn_name

    var objects = []
    $('input[name=object][type=checkbox]').each(function() {
      if ($(this).prop('checked')) {
        objects.push($(this).val())
      }
    })
    param.dest = $('input[name=dest]:checked').val() || 'download'
    param.objects = JSON.stringify(objects)

    if (param.dest == 'download') {
      var params = Object.keys(param).map(function(k) {
        return k + '=' + param[k]
      }).join('&')
      window.open('/export_tsv?' + params, '_blank')
    } else {
      m.request({
        method: "get",
        url: "export_tsv",
        params: param
      }).then(function(result) {
        alert("Export finished")
      })
    }

  },

  export_sql: function(dialect, table_defs, list_recs, data_recs, select_recs) {
    var param = {}
    param.dest = $('input[name=dest]:checked').val() || 'download'
    param.dialect = dialect
    param.table_defs = table_defs
    param.list_recs = list_recs
    param.data_recs = data_recs
    param.select_recs = select_recs
    param.base = ds.base.name
    if (ds.table) {
      param.table = ds.table.name
    }
    if (param.dest == 'download') {
      var params = Object.keys(param).map(function(k) {
        return k + '=' + param[k]
      }).join('&')
      window.open('/export_sql?' + params, '_blank')
    } else {
      m.request({
        method: "get",
        url: "export_sql",
        params: param
      }).then(function(result) {
        alert("Export finished")
      })
    }
  },

  view: function() {
    if (!ds.config) {
      return
    }
    export_dialog.cnxn_name = Cookies.get('urdr-cnxn') 
    ? Cookies.get('urdr-cnxn').toLowerCase().replace('urdr-cnxn-', '').replace(' ', '-')
    .replace('sqlite', '').replace('mysql', '').replace('mssql', '')
    .replace('duckdb', '').replace('oracle', '').replace('pgsql', '').replace('--', '-')
    .replace(/-$/g, '')
    : ds.base.system
    var exportdir = export_dialog.cnxn_name
    ? ds.config.exportdir + '/' + export_dialog.cnxn_name
    : ds.config.exportdir
    return m('div', [
      m('h3', 'Export ' + (!ds.table ? 'database' : 'table')),
      !ds.config.exportdir ? '' :  m('div[name=dest]', { class: "mt2" }, [
        m('label', [m('input[type=radio]', {
          name: 'dest',
          value: exportdir
        })], ' ' + exportdir),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dest',
          value: exportdir + '/' + ds.base.name
        })], ' ' + exportdir + '/' + ds.base.name),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dest',
          value: 'download'
        })], ' Download')
      ]),
      m('div', [
        m('select', {
          onchange: function(event) {
            this.type = event.target.value
          }.bind(this)
        }, [
          m('option', { value: 'sql' }, 'sql'),
          m('option', { value: 'tsv' }, 'tsv'),
        ]),
      ]),
      this.type !== 'tsv' ? '' : m('div[name=valg]', {
        class: 'mt2 max-h5 overflow-y-auto'
      }, [
        ds.table ? 'Choose columns:' : 'Choose tables:',
        m('ul', { class: 'list' }, [
          m('li', { class: 'mb2' }, [
            m('input[type=checkbox]', {
              onchange: function(e) {
                var checked = $(this).prop('checked')
                $('input[type=checkbox][name=object]').prop('checked', checked)
                e.redraw = false
              }
            }), ' (All)',
          ]),
          !ds.table ? '' : Object.keys(ds.table.fields).map(function(fieldname, idx) {
            var field = ds.table.fields[fieldname]
            if (field.virtual) {
              return
            }
            return m('li', {}, [
              m('input[type=checkbox]', {
                name: 'object',
                value: field.name
              }), ' ', field.label
            ])
          }),
          ds.table ? '' : Object.keys(ds.base.tables).sort().map(function(tblname, idx) {
            var tbl = ds.base.tables[tblname]
            return m('li', {}, [
              m('input[type=checkbox]', {
                name: 'object',
                value: tblname
              }), ' ', tblname
            ])
          })
        ])
      ]),
      this.type == 'tsv' ? '' : m('div[name=valg]', { class: "mt2" }, [
        m('label', [m('input[type=radio]', {
          name: 'dialect',
          value: 'mysql'
        })], ' MySQL'),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dialect',
          value: 'oracle'
        })], ' Oracle'),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dialect',
          value: 'postgresql'
        })], ' PostgreSQL'),
        m('br'),
        m('label', [m('input[type=radio]', {
          name: 'dialect',
          value: 'sqlite'
        })], ' SQLite'),
        m('br'), m('br'),
        m('label', [m('input[type=checkbox]', {
          name: 'table-defs'
        })], ' Export table definitions'),
        m('br'),
        m('label', [m('input[type=checkbox]', {
          name: 'list-records'
        })], ' Export records from lookup tables'),
        m('br'),
        m('label', [m('input[type=checkbox]', {
          name: 'data-records'
        })], ' Export records from data tables'),
        m('br'),
        m('label', [m('input[type=checkbox]', {
          name: 'select'
        })], ' Export as select'),
        m('br')
      ]),
      m('div[name=buttons]', { class: "bottom-0 mt2" }, [
        m('input[type=button]', {
          value: 'OK',
          class: 'fr',
          onclick: function() {
            if (this.type === 'tsv') {
              this.export_csv()
            } else {
              var dialect = $('#export-dialog input[name="dialect"]:checked')
                .val()
              var table_defs = $('#export-dialog input[name="table-defs"]')
                .prop('checked')
              var list_records = $('#export-dialog input[name="list-records"]')
                .prop('checked')
              var data_records = $('#export-dialog input[name="data-records"]')
                .prop('checked')
              var select_records = $('#export-dialog input[name="select"]')
                .prop('checked')
              export_dialog.export_sql(dialect, table_defs, list_records, 
                                       data_records, select_records)
            }
            $('div.curtain').hide()
            $('#export-dialog').hide()
          }.bind(this)
        }),
        m('input[type=button]', {
          value: 'Avbryt',
          class: 'fr',
          onclick: function() {
            $('div.curtain').hide()
            $('#export-dialog').hide()
          }
        }),
      ])
    ])
  }
}

module.exports = export_dialog

var login = require('./login.js')
