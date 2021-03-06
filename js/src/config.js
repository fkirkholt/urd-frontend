var Cookies = require('js-cookie')

var config = {

    limit: Cookies.get('limit') ? Cookies.get('limit') : 20,
    autosave: Cookies.get('autosave') === 'true' ? 1 : 0,
    std_search: Cookies.get('std_search') ? Cookies.get('std_search') : 'simple',
    edit_search: Cookies.get('edit_search') === 'true' ? 1 : 0,
    select: Cookies.get('select') ? Cookies.get('select') : 'native',
    theme: Cookies.get('theme') ? Cookies.get('theme') : 'standard',
    compressed: Cookies.get('compressed') ? Cookies.get('compressed') : false,
    button_view: Cookies.get('button_view') ? Cookies.get('button_view') : 'icon',
    expand_headings: Cookies.get('expand_headings') === 'true' ? 1 : 0,
    threshold: Cookies.get('threshold') ? Cookies.get('threshold') : 0,

    admin: false,
    edit_mode: false,
    hide_empty: false,
    tab: 'data',
    limit: 1000,

    save: function() {
        var autosave = $('#preferences [name="autosave"]').prop('checked')
        if (autosave) {
            Grid.save()
        }
        var limit = $('#limit').val()
        var search = $('#preferences [name="std_search"]').val()
        var select = $('#preferences [name="select"]').val()
        var theme = $('#preferences [name="theme"]').val()
        var button_view = $('#preferences [name="button_view"]').val()
        var expand_headings = $('#preferences [name="expand_headings"]').prop('checked')
        var threshold = $('#preferences [name="threshold"]').val()/100
        if (
            limit != config.limit
            || select != config.select
            || autosave != config.autosave
            || search != config.std_search
            || theme != config.theme
            || button_view != config.button_view
            || expand_headings != config.expand_headings
            || threshold != config.threshold
        ) {
            config.limit = limit ? limit : config.limit
            config.select = select
            config.autosave = autosave
            config.std_search = search
            config.theme = theme
            config.button_view = button_view
            config.expand_headings = expand_headings
            config.threshold = threshold
            // TODO: Update grid
        }
        $('#preferences').hide()
        $('div.curtain').hide()
        Cookies.set('limit', parseInt(limit), {expires:14})
        Cookies.set('select', select, {expires:14})
        Cookies.set('autosave', autosave, {expires:14})
        Cookies.set('std_search', search, {expires:14})
        Cookies.set('theme', theme, {expires:14})
        Cookies.set('button_view', button_view, {expires:14})
        Cookies.set('expand_headings', expand_headings, {expires:14})
        Cookies.set('threshold', threshold, {expires:14})
        m.redraw()
    },

    view: function() {
        return m('div', [
            m('table', [
                m('tr', [
                    m('td', 'Autolagring'),
                    m('td', [
                        m('input[type=checkbox]', {
                            name: 'autosave',
                            checked: config.autosave
                        })
                    ])
                ]),
                m('tr', [
                    m('td', 'Ant. poster'),
                    m('td', [
                        m('input#limit', {
                            value: config.limit
                        })
                    ])
                ]),
                m('tr', [
                    m('td', 'Standards??k'),
                    m('td', m('select[name=std_search]', {value: config.std_search}, [
                        m('option', {value: 'simple'}, 'Enkelt'),
                        m('option', {value: 'advanced'}, 'Avansert'),
                    ]))
                ]),
                m('tr', [
                    m('td', 'Knappevisning'),
                    m('td', m('select[name=button_view]', {value: config.button_view}, [
                        m('option', {value: 'icon'}, 'Ikon'),
                        m('option', {value: 'text'}, 'Tekst'),
                        m('option', {value: 'both'}, 'Begge')
                    ]))
                ]),
                m('tr', [
                    m('td', 'Ekspander overskrifter'),
                    m('td', [
                        m('input[type=checkbox]', {
                            name: 'expand_headings',
                            checked: config.expand_headings
                        })
                    ])
                ]),
                m('tr', [
                    m('td', 'Visningsterskel'),
                    m('td', [
                        m('input[type=text]', {
                            name: 'threshold',
                            value: config.threshold * 100,
                            title: 'Terskel for at feltet skal vises',
                            class: 'w3'
                        }), ' %'
                    ])
                ])
            ]),
            m('div', {class: 'pa2'}, [
                m('input[type=button]', {
                    class: 'fr',
                    value: 'OK',
                    onclick: function() {
                        config.save()
                        $('#preferences').hide()
                        $('div.curtain').hide()

                    }
                }),
                m('input[type=button]', {
                    class: 'fr',
                    value: 'Avbryt',
                    onclick: function() {
                        $('#preferences').hide()
                        $('div.curtain').hide()
                    }
                })
            ])
        ])
    }
}

module.exports = config

// Placed here to avoid problems with circular inclusion
var Grid = require('./grid')
