import Cookies from 'js-cookie'

var Export_dialog = {

  type: 'sql',
  cnxn_name: '',
  msg: 'Counting records ...',
  progress: 0,
  running: false,
  view_as_table: false,

  export_csv: function(clobs_as_files, limit) {
    var param = {}
    param.cnxn = ds.cnxn
    param.base = ds.base.name
    param.clobs_as_files = clobs_as_files
    if (limit) {
      param.limit = limit
    }

    var tables = []
    if (config.tab == 'data') {
      tables.push(ds.table.name)
      param.filter = ds.table.query
      param.columns = []
      $('input[name=object][type=checkbox]').each(function() {
        if ($(this).prop('checked')) {
          param.columns.push($(this).val())
        }
      })
    } else {
      $('input[name=object][type=checkbox]').each(function() {
        if ($(this).prop('checked')) {
          tables.push($(this).val())
        }
      })
    }

    param.folder = Export_dialog.cnxn_name
    param.tables = JSON.stringify(tables)
    if (param.columns) {
      param.columns = JSON.stringify(param.columns)
    }

    var objects = []
    param.dest = $('input[name=dest]:checked').val() || 'download'

    var params = Object.keys(param).map(function(k) {
      return k + '=' + param[k]
    }).join('&')
    let eventSource = new EventSource('/export_tsv?' + params)

    eventSource.onmessage = function(event) {
      var data = JSON.parse(event.data)
      Export_dialog.msg = data.msg
      Export_dialog.progress = data.progress
      m.redraw()
      if (data.msg == "done") {
        eventSource.close();
        Export_dialog.running = false
        Export_dialog.msg = 'Export finished'

        if (param.dest == 'download') {
          var media_type = param.table ? 'text/tab-separated-values' : 'application/zip'
          window.open('/download?cnxn=' + ds.cnxn + '&path=' + data.path + '&media_type=' + media_type, '_blank')
        }
      }
    }
  },

  export_sql: function(dialect, table_defs, no_fkeys, view_as_table, list_recs = false, 
                       data_recs = false, select_recs) {
    var param = {}
    param.dest = $('input[name=dest]:checked').val() || 'download'
    param.dialect = dialect
    param.table_defs = table_defs
    param.no_fkeys = no_fkeys
    param.view_as_table = view_as_table
    param.list_recs = list_recs
    param.data_recs = data_recs
    param.select_recs = select_recs
    param.base = ds.base.name
    param.cnxn = ds.cnxn
    if (config.tab == 'data') {
      param.table = ds.table.name
    }
    var params = Object.keys(param).map(function(k) {
      return k + '=' + param[k]
    }).join('&')
    let eventSource = new EventSource('/export_sql?' + params)

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
          window.open('/download?cnxn=' + ds.cnxn + '&path=' + data.path + '&media_type=' + media_type, '_blank')
        }
      }
    }

    eventSource.onerror = (error) => {
      eventSource.close()
      $('div.curtain').hide()
      $('#export-dialog').hide()
      alert('Export failed')
      Export_dialog.running = false
      Export_dialog.msg = ''
    }


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
    var exportdir = Export_dialog.cnxn_name && ['sqlite', 'duckdb'].includes(ds.base.system)
    ? ds.config.exportdir + '/' + ds.path
    : ds.config.exportdir + '/' + Export_dialog.cnxn_name
    return m('div', [
      m('h3', 'Export ' + (config.tab != 'data' ? 'database' : 'table')),
      !ds.config.exportdir ? '' :  m('div[name=dest]', { class: "mt2" }, [
        m('label', [m('input[type=radio]', {
          name: 'dest',
          value: exportdir
        })], ' ' + exportdir),
        ['sqlite', 'duckdb'].includes(ds.base.system) ? '' 
        : m('label', [m('input[type=radio]', {
          name: 'dest',
          value: exportdir + '/' + ds.base.name.split('.')[0]
        })], ' ' + exportdir + '/' + ds.base.name.split('.')[0]),
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
        m('label', [m('input[type=checkbox]', {
          name: 'clobs_to_files'
        })], ' Export clobs to separate files'),
        m('br'),
        m('label', [m('input[type=checkbox]', {
          name: 'view-as-table',
          checked: Export_dialog.view_as_table,
          onchange: function() {
            Export_dialog.view_as_table = $(this).prop('checked')
          }
        })], ' Export records from views'),
        m('br'),
        m('label', [
          'Limit',
          m('input', {
            type: 'number',
            name: 'limit',
            class: 'ml2 w3' 
          })
        ]),
        m('br'),
        config.tab == 'data' ? 'Choose columns:' : 'Choose tables:',
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
          config.tab != 'data' ? '' : Object.keys(ds.table.fields).map(function(fieldname, idx) {
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
          config.tab == 'data' ? '' : Object.keys(ds.base.tables).sort().map(function(tblname, idx) {
            var show_views = $('#export-dialog input[name=view-as-table]').prop('checked')
            var tbl = ds.base.tables[tblname]
            return (tbl.type == 'view' && !show_views) ? '' :  m('li', {}, [
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
        m('label', [m('input[type=checkbox]', {
          name: 'view-as-table'
        })], ' Export views as tables'),
        m('br'),
        config.tab == 'data' && ds.table.type != 'list' ? '' : [
          m('label', [m('input[type=checkbox]', {
            name: 'list-records'
          })], config.tab == 'data' ? ' Export records' 
          : ' Export records from lookup tables'),
          m('br'),
        ],
        config.tab == 'data' && ds.table.type == 'list' ? '' : [
          m('label', [m('input[type=checkbox]', {
            name: 'data-records'
          })], config.tab == 'data' ? ' Export records'
          : ' Export records from data tables'),
          m('br'),
        ],
        m('label', [m('input[type=checkbox]', {
          name: 'select'
        })], ' Export as select'),
        m('br')
      ]),
      m('div[name=buttons]', { class: "bottom-0 mt2" }, [
        Export_dialog.progress == 0 && !Export_dialog.running ? '' 
        : m('div', Export_dialog.progress + ' % | ' + Export_dialog.msg),
        m('input[type=button]', {
          value: 'OK',
          class: 'fr',
          disabled: Export_dialog.running,
          onclick: function() {
            if (Export_dialog.msg == 'Export finished') {
              Export_dialog.progress = 0
              Export_dialog.msg = 'Counting records ...'
              $('div.curtain').hide()
              $('#export-dialog').hide()
              return
            }
            Export_dialog.running = true
            if (this.type === 'tsv') {
              var clobs_as_files = $('#export-dialog input[name="clobs_to_files"]')
                .prop('checked')
              var limit = $('#export-dialog input[name=limit]').val()
              this.export_csv(clobs_as_files, limit)
            } else {
              var dialect = $('#export-dialog input[name="dialect"]:checked')
                .val()
              var table_defs = $('#export-dialog input[name="table-defs"]')
                .prop('checked')
              var no_fkeys = $('#export-dialog input[name="no_fkeys"]')
                .prop('checked')
              var view_as_table = $('#export-dialog input[name=view-as-table]')
                .prop('checked')
              var list_records = $('#export-dialog input[name="list-records"]')
                .prop('checked') || false
              var data_records = $('#export-dialog input[name="data-records"]')
                .prop('checked') || false
              var select_records = $('#export-dialog input[name="select"]')
                .prop('checked')
              Export_dialog.export_sql(dialect, table_defs, no_fkeys, view_as_table,
                                       list_records, data_records, select_records, 
                                       clobs_as_files)
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
import config from './config.js'
