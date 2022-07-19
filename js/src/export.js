var export_dialog = {

    type: 'sql',

    export_csv: function() {
        var param = {}
        param.base = ds.base.name
        param.table = ds.table.name
        param.filter = m.route.param('query')

        var fields = []
        $('input:checkbox[name=field]:checked').each(function() {
            fields.push($(this).val())
        })
        param.fields = JSON.stringify(fields)

        params = Object.keys(param).map(function(k) {
            return k + '=' + param[k]
        }).join('&')
        window.open('/table_csv?' + params, '_blank')

    },

    export_sql: function(dialect, include_recs) {
        var param = {}
        param.dialect = dialect
        param.include_recs = include_recs
        param.base = ds.base.name
        if (ds.table) {
            param.table = ds.table.name
        }
        params = Object.keys(param).map(function(k) {
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
                    m('option', {value: 'sql'}, 'sql'),
                    m('option', {value: 'csv'}, 'csv'),
                ]),
            ]),
            this.type !== 'csv' ? '' : m('div[name=valg]', {class: 'mt2 max-h5 overflow-y-auto'}, [
                'Velg felter:',
                m('ul', {class: 'list'}, [
                    m('li', {class: 'mb2'}, [
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
            this.type == 'csv' ? '' : m('div[name=valg]', {class: "mt2"}, [
                m('label', [m('input[type=radio]', {name: 'dialect', value: 'mysql'})], ' MySQL'),
                m('br'),
                m('label', [m('input[type=radio]', {name: 'dialect', value: 'oracle'})], ' Oracle'),
                m('br'),
                m('label', [m('input[type=radio]', {name: 'dialect', value: 'postgres'})], ' PostgreSQL'),
                m('br'),
                m('label', [m('input[type=radio]', {name: 'dialect', value: 'sqlite3'})], ' SQLite'),
                m('br'), m('br'),
                m('label', [m('input[type=checkbox]', {name: 'records'})], ' Export records'), m('br')
            ]),
            m('div[name=buttons]', {class: "bottom-0 max-w8 mt2"}, [
                m('input[type=button]', {
                    value: 'OK',
                    class: 'fr',
                    onclick: function() {
                        if (this.type === 'csv') {
                            this.export_csv()
                        } else {
                            var dialect = $('#export-dialog input[name="dialect"]:checked').val()
                            var include_records = $('#export-dialog input[name="records"]').prop('checked')
                            export_dialog.export_sql(dialect, include_records)
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
