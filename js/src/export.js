import Cookies from 'js-cookie'

var Export_dialog = {

  type: 'sql',
  cnxn_name: '',
  msg: '',
  progress: 0,
  running: false,

  export_csv: function() {
    var param = {}
    param.base = ds.base.name

    if (ds.table) {
      param.table = ds.table.name
      param.filter = ds.table.query
    }

    param.folder = Export_dialog.cnxn_name

    var objects = []
    $('input[name=object][type=checkbox]').each(function() {
      if ($(this).prop('checked')) {
        objects.push($(this).val())
      }
    })
    param.dest = $('input[name=dest]:checked').val() || 'download'
    param.objects = JSON.stringify(objects)

    var params = Object.keys(param).map(function(k) {
      return k + '=' + param[k]
    }).join('&')
    let eventSource = new EventSource('/export_tsv?' + params);

    eventSource.onmessage = function(event) {
      var data = JSON.parse(event.data)
      Export_dialog.msg = data.msg
      Export_dialog.progress = data.progress
      m.redraw()
      if (data.msg == "done") {
        eventSource.close();
        Export_dialog.running = false
        Export_dialog.msg = ''
        $('div.curtain').hide()
        $('#export-dialog').hide()

        if (param.dest == 'download') {
          var media_type = param.table ? 'text/tab-separated-values' : 'application/zip'
          window.open('/download?path=' + data.path + '&media_type=' + media_type, '_blank')
        }
      }
    }
  },

  export_sql: function(dialect, table_defs, no_fkeys, list_recs = false, 
                       data_recs = false, select_recs) {
    var param = {}
    param.dest = $('input[name=dest]:checked').val() || 'download'
    param.dialect = dialect
    param.table_defs = table_defs
    param.no_fkeys = no_fkeys
    param.list_recs = list_recs
    param.data_recs = data_recs
    param.select_recs = select_recs
    param.base = ds.base.name
    if (ds.table) {
      param.table = ds.table.name
    }
    var params = Object.keys(param).map(function(k) {
      return k + '=' + param[k]
    }).join('&')
    let eventSource = new EventSource('/export_sql?' + params);

    eventSource.onmessage = function(event) {
      var data = JSON.parse(event.data)
      Export_dialog.msg = data.msg
      Export_dialog.progress = data.progress
      m.redraw()
      if (data.msg == "done") {
        eventSource.close();
        Export_dialog.running = false
        Export_dialog.msg = ''
        $('div.curtain').hide()
        $('#export-dialog').hide()

        if (param.dest == 'download') {
          var media_type = param.table ? 'text/tab-separated-values' : 'application/zip'
          window.open('/download?path=' + data.path + '&media_type=' + media_type, '_blank')
        }
      }
    };
  },

  view: function() {
    if (!ds.config) {
      return
    }
    Export_dialog.cnxn_name = Cookies.get('urdr-cnxn') 
    ? Cookies.get('urdr-cnxn').toLowerCase().replace('urdr-cnxn-', '').replace(' ', '-')
    .replace('sqlite', '').replace('mysql', '').replace('mssql', '')
    .replace('duckdb', '').replace('oracle', '').replace('pgsql', '').replace('--', '-')
    .replace(/-$/g, '')
    : ds.base.system
    var exportdir = Export_dialog.cnxn_name
    ? ds.config.exportdir + '/' + Export_dialog.cnxn_name
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
            return tbl.type == 'view' ? '' :  m('li', {}, [
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
          name: 'no_fkeys',
          class: 'ml3'
        })], ' Exclude foreign keys'),
        m('br'),
        ds.table && ds.table.type == 'data' ? '' : [
          m('label', [m('input[type=checkbox]', {
            name: 'list-records'
          })], ds.table ? ' Export records' 
          : ' Export records from lookup tables'),
          m('br'),
        ],
        ds.table && ds.table.type == 'list' ? '' : [
          m('label', [m('input[type=checkbox]', {
            name: 'data-records'
          })], ds.table ? ' Export records'
          : ' Export records from data tables'),
          m('br'),
        ],
        m('label', [m('input[type=checkbox]', {
          name: 'select'
        })], ' Export as select'),
        m('br')
      ]),
      m('div[name=buttons]', { class: "bottom-0 mt2" }, [
        m('div', Export_dialog.msg),
        m('input[type=button]', {
          value: 'OK',
          class: 'fr',
          disabled: Export_dialog.running,
          onclick: function() {
            Export_dialog.running = true
            if (this.type === 'tsv') {
              this.export_csv()
            } else {
              var dialect = $('#export-dialog input[name="dialect"]:checked')
                .val()
              var table_defs = $('#export-dialog input[name="table-defs"]')
                .prop('checked')
              var no_fkeys = $('#export-dialog input[name="no_fkeys"]')
                .prop('checked')
              var list_records = $('#export-dialog input[name="list-records"]')
                .prop('checked') || false
              var data_records = $('#export-dialog input[name="data-records"]')
                .prop('checked') || false
              var select_records = $('#export-dialog input[name="select"]')
                .prop('checked')
              Export_dialog.export_sql(dialect, table_defs, no_fkeys, list_records, 
                                       data_records, select_records)
            }
          }.bind(this)
        }),
        m('input[type=button]', {
          value: 'Avbryt',
          class: 'fr',
          disabled: Export_dialog.running,
          onclick: function() {
            $('div.curtain').hide()
            $('#export-dialog').hide()
          }
        }),
        m('div', {class: 'fl'}, [
          !Export_dialog.msg ? null : m('progress', {
            value: Export_dialog.progress,
            max: '100',
          })
        ])
      ])
    ])
  }
}

export default Export_dialog

import Login from './login.js'
