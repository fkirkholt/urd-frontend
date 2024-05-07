var export_dialog = {

  type: 'sql',

  export_csv: function() {
    var param = {}
    param.base = ds.base.name
    param.table = ds.table.name
    param.filter = m.route.param('query')

    var fields = []
    $('input[name=field][type=checkbox]').each(function() {
      if ($(this).prop('checked')) {
        fields.push($(this).val())
      }
    })
    param.fields = JSON.stringify(fields)

    var params = Object.keys(param).map(function(k) {
      return k + '=' + param[k]
    }).join('&')
    window.open('/table_csv?' + params, '_blank')

  },

  export_sql: function(dialect, table_defs, list_recs, data_recs, select_recs) {
    var param = {}
    param.dialect = dialect
    param.table_defs = table_defs
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
    window.open('/table_sql?' + params, '_blank')
  },

  view: function() {
    return m('div', [
      m('h3', 'Export ' + (!ds.table ? 'database' : 'table')),
      m('div', [
        !ds.table ? null : m('select', {
          onchange: function(event) {
            this.type = event.target.value
          }.bind(this)
        }, [
          m('option', { value: 'sql' }, 'sql'),
          m('option', { value: 'csv' }, 'csv'),
        ]),
      ]),
      this.type !== 'csv' ? '' : m('div[name=valg]', {
        class: 'mt2 max-h5 overflow-y-auto'
      }, [
        'Velg felter:',
        m('ul', { class: 'list' }, [
          m('li', { class: 'mb2' }, [
            m('input[type=checkbox]', {
              onchange: function(e) {
                var checked = $(this).prop('checked')
                $('input[type=checkbox][name=field]').prop('checked', checked)
                e.redraw = false
              }
            }), ' (alle)',
          ]),
          Object.keys(ds.table.fields).map(function(fieldname, idx) {
            var field = ds.table.fields[fieldname]
            return m('li', {}, [
              m('input[type=checkbox]', {
                name: 'field',
                value: field.name
              }), ' ', field.label
            ])
          })
        ])
      ]),
      this.type == 'csv' ? '' : m('div[name=valg]', { class: "mt2" }, [
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
            if (this.type === 'csv') {
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
