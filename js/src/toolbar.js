var Toolbar = {

    oninit: function() {
        mousetrap(document.body).bind('mod+s', function(e) {
            Grid.save()
            return false
        })
        mousetrap(document.body).bind('mod+n', function(e) {
            Record.create(ds.table)
            return false
        })
        mousetrap(document.body).bind('mod+f', function(e) {
            Filterpanel.expanded = !Filterpanel.expanded
            m.redraw()
            return false
        })
        mousetrap(document.body).bind('esc', function(e) {
            $('#urdgrid tr.focus').trigger('focus')
        })
    },

    onremove: function() {
        mousetrap.reset()
    },

    track_progress: function() {
        m.request({
            method: "get",
            url: "track_progress",
            background: true
        }).then(function(response) {
            $('#progress [name="percent"]').text(response.progress + '%')
            if (response.progress < 100) {
                $('#progress [value="OK"]').hide()
                setTimeout(Toolbar.track_progress, 1000)
            }
        })
    },

    run_action: function(action) {
        var rec_idx = ds.table.selection
        var prim_key = ds.table.records[rec_idx].pkey
        var prim_nokler_json = JSON.stringify(prim_key)
        var address = ds.base.schema + (action.url[0] === '/' ? '' : '/') + action.url
        var kommunikasjon = action.communication

        var $form = $('form#action')
        $form.find(':input[name="pkey"]').val(prim_nokler_json)

        if (ds.table.dirty) {
            alert("Du må lagre før du kan utføre handling")
            return
        }

        if (kommunikasjon == 'submit') {
            $form.attr('action', address).attr('method', 'post').submit()
        } else if (kommunikasjon == 'ajax') {
            $.ajax({
                url: address,
                method: action.method ? action.method : 'get',
                dataType: 'json',
                contentType: "application/json",
                data: JSON.stringify({
                    base: ds.base.name,
                    table: ds.table.name,
                    pkey: prim_nokler_json
                }),
                background: true
            }).done(function(result) {
                if (action.update_field) {
                    var field = ds.table.records[rec_idx].fields[action.update_field]
                    Field.update(result.value, field.name, ds.table.records[rec_idx])
                    m.redraw()
                }
                if (result.msg) {
                    $('#progress').show().children('[name=message]').text(result.msg)
                    $btn = $('#progress [value="OK"]')
                    $btn.show("fast", function() {
                        $btn[0].trigger('focus')
                    })
                }
                if (result.warn && result.warn.length) {
                    txt = $('#progress').show().children('[name=message]').text()
                    txt += '<br><br><b>Advarsler:</b><ul class="tl"><li>'
                    txt += result.warn.join('</li><li>')
                    txt += '</li></ul>'
                    $('#progress').show().children('[name=message]').html(txt)
                }
            }).fail(function(jqXHR, textStatus, error) {
                alert(jqXHR.responseText)
            })

            // show progress bar
            if (action.track_progress) {
                $('div.curtain').show()
                $('#progress').show().children('[name="percent"]').text('0%')
                this.track_progress()
            }
        } else if (kommunikasjon == 'dialog') {
            m.request({
                url: address + '?version=1',
                responseType: "text",
            }).then(function(result) {
                $('#action-dialog').append(result)
            })
            $('div.curtain').show()
            $('#action-dialog').show()
        }
    },

    button: {
        disabled: function(name) {
            if (name == 'first' || name == 'previous') {
                return ds.table.offset == 0 && ds.table.selection == 0 ? true : false
            } else {
                return ds.table.count_records - ds.table.offset <= ds.table.limit && ds.table.selection == ds.table.count_records - ds.table.offset - 1
                    ? true
                    : false
            }
        }
    },

    delete_record: function() {
        var idx = ds.table.selection
        var rec = ds.table.records[idx]
        var deletable = true
        $.each(rec.relations, function(idx, rel) {
            var count_local = rel.count_records - rel.count_inherited
            if (count_local && rel.delete_rule != "cascade") {
                deletable = false
            }
        })
        if (ds.table.privilege.delete != true || !deletable) return

        var r = true
        if (config.autosave || !config.edit_mode) {
            var r = confirm('Er du sikker på at du vil slette posten?')
        }

        if (r === true) {
            if (rec.new) {
                ds.table.records.splice(idx, 1)
            } else {
                Record.delete(rec)
            }

            if (!config.edit_mode) {
                Grid.save()
            }
        }
    },

    view: function(vnode) {
        var search_params

        if (!ds.table || !ds.table.records || ds.type === 'dblist') return

        var param = m.route.param()
        var search = param['query'] ? param['query'] : null
        if (!('query' in param) && !('where' in param)) {
            search_params = []
            $.each(param, function(key, value) {
                if (['base', 'table'].indexOf(key) >= 0) return
                search_params.push(key + ' = ' + value)
            })
            search = search_params.join(' AND ')
        }
        var idx = ds.table.selection
        var rec = ds.table.records[idx]
        var deletable = rec && rec.relations ? true : false

        // Table can just hold one row if last pkey column starts with 'const_'
        var single_rec = ds.table.pkey.slice(-1)[0].substr(0,6) == 'const_'
        var full = single_rec && ds.table.records.length

        if (rec && rec.relations) {
            $.each(rec.relations, function(idx, rel) {
                var count_local = rel.count_records - rel.count_inherited
                if (count_local && rel.delete_rule != "cascade") {
                    deletable = false
                }
            })
        }

        return m('ul', {target: '_blank', class: 'f6 list pl1 mt1 mb1'}, [
            m('li', [
                m('form#action', [
                    m('input', {type: 'hidden', name: 'base', value: ds.base.name}),
                    m('input', {type: 'hidden', name: 'table', value: ds.table.name}),
                    m('input', {type: 'hidden', name: 'pkey'}),
                ]),
            ]),
            ds.table.hide  ? '' : m('i', {
                class: 'ml1 mr2 fa pointer ' + (config.compressed ? 'fa-expand' : 'fa-compress'),
                title: config.compressed ? 'Ekspander' : 'Komprimer',
                onclick: function() {
                    config.compressed = !config.compressed
                }
            }),
            config.std_search == 'simple' ? '' : m('li', {class: 'dib'}, [
                m('i', {
                    class: 'fa fa-filter ml1 mr2 pointer dim',
                    title: 'Filtrer tabell',
                    onclick: function() {
                        config.filter = true
                        ds.table.filters = Filterpanel.parse_query(ds.table.query)
                        Filterpanel.expanded = !Filterpanel.expanded
                    }
                }),
            ]),
            config.std_search == 'advanced' ? '' : m('i', {
                class: 'fa fa-search ml1 mr2 pointer dim',
                title: 'Søk',
                onclick: function() {
                    config.filter = false
                    ds.table.filters = Filterpanel.parse_query(ds.table.query)
                    ds.table.search = !ds.table.search
                }
            }),
            ds.table.hide ? '' : m('input[type=text]', {
                placeholder: "Søk i alle tekstfelter",
                value: search,
                style: 'width: 10em',
                onfocus: function(event) {
                    event.target.select()
                },
                onchange: function(event) {
                    m.route.set('/' + ds.base.name + '/data/' + ds.table.name +
                                '?query=' + event.target.value.replace(/=/g, '%3D'))

                }
            }),
            ds.table.hide ? '' : m('select', {
                class: 'ml1 mr2 dn',
                name: 'btn_saved_searches',
                title: 'Lagrede søk',

                onupdate: function(vnode) {
                    if ($(vnode.dom).val() != 'custom') {
                        $(vnode.dom).find('option[value="custom"]').hide()
                        $(vnode.dom).find('option[value="save_search"]').hide()
                        if ($(vnode.dom).val() == 'alle') {
                            $(vnode.dom).find('option[value="separator_save"]').hide()
                        }
                    } else {
                        $(vnode.dom).find('option[value="custom"]').show()
                    }

                    if ($(vnode.dom).val() == 'alle' || $(vnode.dom).val() == 'custom' || $(vnode.dom).val() == 'delete_search') {
                        if ($(vnode.dom).val() == 'delete_search') {
                            $(vnode.dom).val('custom')
                        }
                        $(vnode.dom).find('option[value="delete_search"]').hide()
                    } else {
                        $(vnode.dom).find('option[value="delete_search"]').show()
                    }
                },
                onchange: function(vnode) {
                    var id = $(this).val()

                    var filter = ds.table.saved_filters.find(function(row) {
                        return row.id == id
                    })
                    var query

                    if (id == 'save_search') {
                        Filterpanel.save_filter(ds.table)
                        return
                    }

                    if (id == 'delete_search') {
                        $(vnode.dom).find('option[value="custom"]').show()
                        $(vnode.dom).val('custom')
                        Filterpanel.delete_filter()
                        return
                    }

                    if (id == 'alle') {
                        query = 'query='
                    } else if (filter.advanced == 0) {
                        query = 'query=' + filter.expression.replace(/=/g, '%3D')
                    } else {
                        query = 'where=' + filter.expression.replace(/=/g, '%3D')
                    }
                    m.route.set('/' + ds.base.name + '/tables/' + ds.table.name + '?' + query)
                }
            }, [
                m('option', {value: 'alle'}, 'Alle'),
                m('option', {disabled: true}, '—————'),

                (param.query || param.where) ? [
                    m('option', {value: 'custom', selected: true}, 'Søkeresultat'),
                    m('option', {value: 'save_search'}, 'Lagre søk …'),
                    m('option', {value: 'delete_search'}, 'Slett søk …'),
                    m('option', {value: 'separator_save', disabled: true}, '—————'),
                ] : '',

                ds.table.saved_filters.map(function(filter, idx) {
                    var selected = (
                        param.query && param.query === filter.expression ||
                            m.route.param('where') == filter.expression
                    )
                    if (selected) {
                        ds.table.delete_search = true
                    }

                    return m('option', {
                        value: filter.id,
                        selected: selected
                    }, filter.label)
                }),


            ]),
            m('li', {class: 'dib'}, [
                config.button_view != 'text' ? [
                    m('i', {
                        class: [
                            'fa fa-file-o ml3 mr1',
                            ds.table.privilege.insert == true && !full
                                ? 'dim pointer'
                                : 'moon-gray'
                        ].join(' '),
                        title: 'Ny post',
                        onclick: function() {
                            if (ds.table.privilege.insert != true || full) return
                            Record.create(ds.table)

                            // Focus first input in new record
                            setTimeout(function() {
                                $('form[name=record] > table').find('input,select,textarea').first().trigger('focus')
                            }, 100)

                            if (!config.edit_mode) {
                                ds.table.edit = true
                                config.edit_mode = true
                            }
                        }
                    }),
                    config.button_view == 'both' ? m('span', {
                        class: (ds.table.privilege.insert == true && !full)
                            ? 'dim pointer' : 'moon-gray',
                        onclick: function() {
                            if (ds.table.privilege.insert != true || full) return
                            Record.create(ds.table)
                            if (!config.edit_mode) {
                                ds.table.edit = true
                                config.edit_mode = true
                            }
                        }
                    }, 'Ny') : ''
                ]
                : (config.button_view == 'text') ? m('input[type=button]', {
                    value: 'Ny',
                    disabled: ds.table.privilege.insert || full == false,
                    onclick: function() {
                        if (ds.table.privilege.insert != true || full) return
                        Record.create(ds.table)
                        if (!config.edit_mode) {
                            ds.table.edit = true
                            config.edit_mode = true
                        }
                    }
                })
                : ''
            ]),
            m('li', {class: 'dib'}, [
                config.button_view != 'text' ? [
                    m('i', {
                        class: [
                            'fa fa-copy ml2 mr1 f6',
                            ds.table.privilege.insert == true && !full
                                ? 'dim pointer' : 'moon-gray'
                        ].join(' '),
                        title: 'Kopier post',
                        onclick: function() {
                            if (ds.table.privilege.insert != true || full) return
                            Record.copy()
                            if (!config.edit_mode) {
                                ds.table.edit = true
                                config.edit_mode = true
                            }
                        }
                    }),
                    config.button_view == 'both' ? m('span', {
                        class: ds.table.privilege.insert == true && !full
                            ? 'dim pointer' : 'moon-gray',
                        onclick: function() {
                            if (ds.table.privilege.insert != true || full) return
                            Record.copy()
                            if (!config.edit_mode) {
                                ds.table.edit = true
                                config.edit_mode = true
                            }
                        }

                    }, 'Kopier') : ''
                ]
                : (config.button_view == 'text') ? m('input[type=button]', {
                    value: 'Kopier',
                    disabled: ds.table.privilege.insert == false || full,
                    onclick: function() {
                        if (ds.table.privilege.insert != true || full) return
                        Record.copy()
                        if (!config.edit_mode) {
                            ds.table.edit = true
                            config.edit_mode = true
                        }
                    }
                })
                : ''
            ]),
            !config.edit_mode ? m('li', {class: 'dib'}, [
                config.button_view != 'text' ? [
                    m('i', {
                        class: [
                            'fa fa-edit ml2 mr1 pointer f6',
                            ds.table.privilege.update == true ? 'dim pointer' : 'moon-gray'
                        ].join(' '),
                        title: 'Rediger post',
                        onclick: function() {
                            ds.table.edit = true
                            config.edit_mode = true
                        }
                    }),
                    config.button_view == 'both' ? m('span', {
                        class: ds.table.privilege.update == true ? 'dim pointer' : 'moon-gray',
                        onclick: function() {
                            ds.table.edit = true
                            config.edit_mode = true
                        }
                    }, 'Rediger') : ''
                ]
                : (config.button_view == 'text') ? m('input[type=button]', {
                    value: 'Rediger',
                    disabled: ds.table.privilege.update == false,
                    onclick: function() {
                        ds.table.edit = true
                        config.edit_mode = true
                    }
                }) : ''
            ]) : '',
            m('li', {class: 'dib'}, [
                config.autosave || !config.edit_mode ? '' : [
                    config.button_view != 'text' ? [
                        m('i', {
                            class: [
                                'fa fa-save ml2 mr1',
                                ds.table.dirty ? 'dim pointer' : 'moon-gray'
                            ].join(' '),
                            title: 'Lagre endringer',
                            onclick: function() {
                                if (!ds.table.dirty) return
                                Grid.save()
                            }
                        }),
                        config.button_view == 'both' ? m('span', {
                            class: ds.table.dirty ? 'dim pointer' : 'moon-gray',
                            onclick: function() {
                                if (!ds.table.dirty) return
                                Grid.save()
                            }
                        }, 'Lagre') : ''
                    ]
                    : (config.button_view == 'text') ? m('input[type=button]', {
                        value: 'Lagre',
                        disabled: ds.table.dirty == false,
                        onclick: function() {
                            if (!ds.table.dirty) return
                            Grid.save()
                        }
                    }) : ''
                ]
            ]),
            ds.table.hide ? '' : m('li', {class: 'dib'}, [
                config.button_view != 'text' ? [
                    m('i', {
                        class: [
                            'fa fa-trash-o ml2 mr1',
                            (ds.table.privilege.delete == true && deletable) ? 'dim pointer' : 'moon-gray'
                        ].join(' '),
                        title: 'Slett post',
                        onclick: Toolbar.delete_record
                    }),
                    config.button_view == 'both' ? m('span', {
                        class: (ds.table.privilege.delete == true && deletable) ? 'dim pointer' : 'moon-gray',
                        onclick: Toolbar.delete_record
                    }, 'Slett') : ''
                ]
                : (config.button_view == 'text') ? m('input[type=button]', {
                    value: 'Slett',
                    disabled: ds.table.privilege.delete == false || !deletable,
                    onclick: Toolbar.delete_record
                }) : ''
            ]),
            m('li', {class: 'dib'}, [
                m('i', {
                    class: 'fa fa-print ml1 mr2 pointer dim',
                    onclick: function() {
                        print()
                    }
                })
            ]),
            m('li', {class: 'dib relative'}, [
                m('i', {
                    class: 'fa fa-cog ml2 mr1 pointer dim',
                    title: 'Flere handlinger',
                    onclick: function() {
                        $('ul#actions').toggle()
                    }
                }),
                m('ul#actions', {
                    class: 'absolute left-0 bg-white list pa1 shadow-5 dn pointer z-999'
                }, [
                    m('li', {
                        class: 'nowrap hover-blue',
                        onclick: function() {
                            $('#export-dialog').show()
                            $('div.curtain').show()
                            $('ul#actions').hide()
                        }
                    }, 'Eksporter poster ...'),
                    m('li', {
                        class: 'nowrap hover-blue',
                        onclick: function() {
                            $('#convert-dialog').show()
                            $('div.curtain').show()
                            $('ul#actions').hide()
                        }
                    }, 'Konverter felter ...'),
                    Object.keys(ds.table.actions).map(function(label, idx) {
                        var action = ds.table.actions[label]

                        var txt = action.communication != 'ajax'
                            ? action.label + ' ...'
                            : action.label

                        return action.disabled ? '' : m('li', {
                            class: 'nowrap hover-blue',
                            title: action.description,
                            onclick: function() {
                                Toolbar.run_action(action)
                                $('ul#actions').toggle()
                            }
                        }, '- ' + txt)
                    })
                ])
            ]),
            m('li.dib', m('i.reload', {
                hidden: true,
                onclick: function() {
                    Grid.update(ds.table, {})
                }
            })),
            // When single record is shown.
            // NOTE: show_record is never set, so this never shows
            !config.show_record ? '' : m('li.dib', {
                onclick: function(e) {
                    // Toolbar.navigate(e.target.name)
                }
            }, [
                m('button[name="first"]', {
                    class: [
                        'icon fa fa-angle-double-left ba b--light-silver br0 bg-white',
                        Toolbar.button.disabled('first') ? 'moon-gray' : '',
                    ].join(' '),
                    disabled: Toolbar.button.disabled('first'),
                    onclick: function() {
                        if (ds.table.offset == 0) {
                            Record.select(ds.table, 0, true)
                        } else {
                            Pagination.navigate('first')
                        }
                    }
                }),
                m('button[name=previous]', {
                    class: [
                        'icon fa fa-angle-left bt br bl-0 bb b--light-silver br0 bg-white',
                        Toolbar.button.disabled('previous') ? 'moon-gray' : ''
                    ].join(' '),
                    disabled: Toolbar.button.disabled('previous'),
                    onclick: function() {
                        var idx = ds.table.selection
                        var prev = idx - 1
                        if (prev == -1) {
                            Pagination.navigate('previous')
                        } else {
                            Record.select(ds.table, prev, true)
                        }
                    }
                }),
                m('button[name=next]', {
                    class: [
                        'icon fa fa-angle-right bt br bb bl-0 b--light-silver br0 bg-white',
                        Toolbar.button.disabled('next') ? 'moon-gray' : '',
                    ].join(' '),
                    disabled: Toolbar.button.disabled('next'),
                    onclick: function() {
                        var idx = ds.table.selection
                        var next = idx + 1
                        if (next == ds.table.records.length) {
                            Pagination.navigate('next')
                        } else {
                            Record.select(ds.table, next, true)
                        }
                    }
                }),
                m('button[name=last]', {
                    class: [
                        'icon fa fa-angle-double-right bt br bb bl-0 b--light-silver br0 bg-white',
                        Toolbar.button.disabled('last') ? 'moon-gray' : '',
                    ].join(' '),
                    disabled: Toolbar.button.disabled('last'),
                    onclick: function() {
                        Pagination.navigate('last')
                    }
                }),
            ]),

            /*
            !ds.table.help ? '' : m('i', {
                id: 'btn_help_table',
                class: 'fa fa-question',
                title: 'Hjelp',
                style: 'margin-left: 10px; cursor: pointer',
                onclick: function() {
                    // TODO: Se på hvordan dette skal implementeres
                }
            }),
            m('br'),
            m('input', {
                id: 'advanced_search',
                type: 'text',
                style: 'display:none',
                value: decodeURI(m.route.param('query')),
                onkeypress: function(e) {
                    if (e.which == 13) {
                        m.route.set('/' + ds.table.base.name + '/' + ds.table.name + '?query=' + encodeURI($(this).val()))
                    }
                }
            })
            */


        ])
    }
}

module.exports = Toolbar

var mousetrap = require('mousetrap')
var config = require('./config')
var Grid = require('./grid')
var Filterpanel = require('./filterpanel')
var Record = require('./record')
var Pagination = require('./pagination')
var Cookies = require('js-cookie')
var Diagram = require('./diagram')
