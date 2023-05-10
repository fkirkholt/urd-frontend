var config = require('./config')

var tabbar = {

    set_view: function(value) {
        config.edit_mode = value
    },

    set_hidden: function(value) {
        config.hide_empty = value
    },

    view: function(vnode) {
        return !m.route.param('base') ? '' : [
            m('ul', {
                class: 'di w-100'
            }, [
                m('li', {
                    class: [
                        'list di pl1 pr1 bl bt br b--gray pointer br1 br--top',
                        (!config.tab || config.tab == 'data')
                            ? 'bg-white' : 'bg-near-white'
                    ].join(' '),
                    style: (!config.tab || config.tab == 'data')
                        ? 'padding-bottom: 1px' : '',
                    onclick: function() {
                        config.tab = 'data'
                        m.route.set('/' + ds.base.name + '/data')
                    }
                }, 'Data'),
                m('li', {
                    title: 'Entity Relationship Diagram',
                    class: [
                        'list ml2 pl2 pt0 pr2 di bl bt br b--gray pointer',
                        'br1 br--top',
                        config.tab == 'diagram' ? 'bg-white' : 'bg-near-white'
                    ].join(' '),
                    style: config.tab == 'diagram' ? 'padding-bottom: 1px' : '',
                    onclick: function() {
                        config.tab = 'diagram'
                        m.route.set('/' + ds.base.name + '/diagram')
                    }
                }, [
                    m('i', {class: 'fa fa-sitemap'})
                ]),
                m('li', {
                    class: [
                        'list ml2 pl1 pr1 di bl bt br b--gray pointer',
                        'br1 br--top',
                        config.tab == 'sql' ? 'bg-white' : 'bg-near-white'
                    ].join(' '),
                    style: config.tab == 'sql' ? 'padding-bottom: 1px' : '',
                    onclick: function() {
                        config.tab = 'sql'
                        m.route.set('/' + ds.base.name + '/sql')
                    }
                }, 'SQL')
            ]),
            !ds.table || !(config.tab == 'data') ? '' : m('label', {
                class: 'fr mr3'
            }, [
                m('input#view_checkbox', {
                    class: 'mr1',
                    type: 'checkbox',
                    value: 1,
                    checked: config.edit_mode,
                    onclick: function(ev) {
                        tabbar.set_view(ev.target.checked)
                    }
                })
            ], 'Redigeringsmodus'),
            !ds.table || !(config.tab == 'data') ? '' : m('label', {
                class: 'fr mr3'
            }, [
                m('input', {
                    class: 'mr1',
                    type: 'checkbox',
                    value: 1,
                    checked: config.hide_empty,
                    onclick: function(ev) {
                        tabbar.set_hidden(ev.target.checked)
                    }
                })
            ], 'Skjul tomme felt'),
            (!ds.user.admin) || config.tab == 'sql' ? null : m('label', {
                class: 'fr mr3'
            }, [
                'Terskel ',
                m('input.threshold', {
                    type: "number",
                    class: "w3 v-top",
                    style: "height: 18px",
                    value: config.threshold * 100,
                    title: 'Terskel',
                    onchange: function(ev) {
                        config.threshold = ev.target.value/100
                    }
                }), ' %',
            ]),
            ds.table ? null : m('i',  {
                class: 'fa fa-file-text-o fr mr3 pt1',
                title: 'Eksporter',
                onclick: function() {
                    $('.curtain').show()
                    $('#export-dialog').show()
                }
            }),
            (!ds.user.admin) || config.tab != 'diagram' ? null : m('i', {
                class: 'fa fa-edit fr mr3 pt1',
                title: 'Oppdater cache',
                onclick: function () {
                    if (['oracle', 'sql server'].includes(ds.base.system)) {
                        alert('Cache not supported for ' + ds.base.system)
                        return
                    }
                    m.request({
                        url: 'urd/dialog_cache?version=1',
                        responseType: "text",
                    }).then(function(result) {
                        $('#action-dialog').append(result)
                    })
                    $('div.curtain').show()
                    $('#action-dialog').show()
                }
            }),
            (config.tab != 'diagram' ? null : m('label', {
                class: 'fr mr3',
                title: "Fjerner koblinger som går direkte til forfedre"
            }, [
                m('input', {
                    class: 'mr1',
                    type: 'checkbox',
                    value: 1,
                    checked: config.simplified_hierarchy,
                    onclick: function(ev) {
                        config.simplified_hierarchy = ev.target.checked
                    }
                })
            ], 'Forenklet hierarki')),
            (config.tab != 'diagram' ? null : m('label', {
                class: 'fr mr3',
                title: "Velg hvilke relasjoner som skal vises"
            }, [
                'Vis relasjoner:',
                Object.entries({
                    nearest: "nærmeste",
                    subordinate: "underordnede",
                    all: "alle"
                }).map(([key, value]) =>
                    m('label', m('input[type=radio]', {
                        class: 'ml2 mr1',
                        name: 'show_relations',
                        value: key,
                        checked: config.show_relations === key,
                        onchange: () => config.show_relations = key
                    }), value)
                ),
            ]))
        ]
    }
}

module.exports = tabbar
