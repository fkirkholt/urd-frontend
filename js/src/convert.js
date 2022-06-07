var Grid = require('./grid')

var Convert_dialog = {

    convert: function() {
        var param = {}
        param.base = ds.base.name
        param.table = ds.table.name
        param.from_format = $('#from_format').val()
        param.to_format = $('#to_format').val()

        var fields = []
        $('input:checkbox[name=field]:checked').each(function() {
            fields.push($(this).val())
        })
        param.fields = JSON.stringify(fields)

        m.request({
            method: 'POST',
            params: param,
            url: '/convert'
        }).then(function(data) {
            Grid.update(ds.table, {})
        })
    },

    view: function() {
        if (!ds.table || !ds.table.fields) return
        return m('div', [
            m('label', {
                class: 'mr2'
            }, 'Fra:'),
            m('select', {
                id: 'from_format',
                onchange: function(event) {
                    this.from = event.target.value
                }.bind(this)
            }, [
                m('option', {value: 'markdown'}, 'Markdown'),
                m('option', {value: 'rtf'}, 'RTF'),
            ]),
            m('label', {
                class: 'ml2 mr2'
            }, 'Til:'),
            m('select', {
                id: 'to_format',
                onchange: function(event) {
                    this.to = event.target.value
                }.bind(this)
            }, [
                m('option', {value: 'markdown'}, 'Markdown'),
                m('option', {value: 'rtf'}, 'RTF'),
            ]),
            m('div[name=valg]', {class: 'mt2 max-h5 overflow-y-auto'}, [
                'Velg felter:',
                m('ul', {class: 'list'}, [
                    Object.keys(ds.table.fields).map(function(fieldname, idx) {
                        var field = ds.table.fields[fieldname]
                        if (field.datatype != 'string' || (field.size != 0 && field.size < 256)) {
                            return
                        }
                        return m('li', {}, [
                            m('input[type=checkbox]', {
                                name: 'field',
                                value: field.name
                            }), ' ', field.label
                        ])
                    })
                ])
            ]),
            m('div[name=buttons]', {class: "bottom-0 max-w8 mt2"}, [
                m('input[type=button]', {
                    value: 'OK',
                    class: 'fr',
                    onclick: function() {
                        this.convert()
                        $('div.curtain').hide()
                        $('#convert-dialog').hide()
                    }.bind(this)
                }),
                m('input[type=button]', {
                    value: 'Avbryt',
                    class: 'fr',
                    onclick: function() {
                        $('div.curtain').hide()
                        $('#convert-dialog').hide()
                    }
                }),
            ])
        ])
    }

}

module.exports = Convert_dialog
