
var Grid = {

    url: '',

    align_thead: function() {
        var $table = $('#urdgrid')
        var $headCells = $table.find('thead tr').children()
        var $bodyCells = $table.find('tbody tr').first().children()
        var $footCells = $table.find('tfoot tr').children()
        var colWidth, colWidthHead, colWidthBody, colWidthFoot


        // Remove existing width attributes
        $headCells.each(function(i, v) {
            $(v).css('width', '')
        })
        $bodyCells.each(function(i, v) {
            $(v).children('div').css('width', '')
        })
        $footCells.each(function(i, v) {
            $(v).css('width', '')
        })

        // Get column widths

        colWidthHead = $headCells.map(function() {
            return $(this).width() + 1
        })

        colWidthBody = $bodyCells.map(function() {
            return $(this).width()
        }).get()

        colWidthFoot = $footCells.map(function() {
            return $(this).width()
        }).get()

        if (colWidthFoot.length > 0 && colWidthBody.length > 0) {
            $.each(colWidthFoot, function(idx, width) {
                if (width > colWidthBody[idx]) {
                    $table.find('tbody tr').first()
                          .find('td:nth-child(' + (idx+1) + ')').width(width)
                }
            })
        }

        if (!config.compressed) {
            $.each(colWidthHead, function(idx, width) {
                if (width > colWidthBody[idx]) {
                    $col = $table.find('tbody tr').first()
                                 .find('td:nth-child(' + (idx+1) + ') div' )
                    $col.width(width)
                }
            })
        }

        colWidthBody = $bodyCells.map(function() {
            return $(this).width()
        })

        if (colWidthBody.length === 0) {
            colWidth = colWidthHead
        } else {
            colWidth = colWidthBody
        }

        // Set the width of thead columns
        $table.find('thead tr').children().each(function(i, v) {
            $(v).width(colWidth[i])
        })


        // Set the width of tfoot columns
        $table.find('tfoot tr').children().each(function(i, v) {
            $(v).width(colWidth[i])
        })
    },

    oncreate: function() {
        Grid.align_thead()
        // Adjust the width of thead cells when window resizes
        window.onresize = Grid.align_thead
    },

    onupdate: function() {
        Grid.align_thead()

        // Ensure scrolling to bottom for new records
        if ((ds.table.selection + 1) == ds.table.records.length) {
            var height = $('#urdgrid tbody')[0].scrollHeight
            $('#urdgrid tbody').get().pageYOffset = height //.scrollTop(height)
        }
    },

    column_order: function(col) {
        return ds.table.sort_fields[col]
            ? ds.table.sort_fields[col]['order'].toLowerCase()
            : ''
    },

    sort: function(col) {
        var list = ds.table
        var sort = []
        var order
        if (list.sort_fields[col] && list.sort_fields[col]['idx'] == 0) {
            order = list.sort_fields[col]['order'] == 'ASC' ? 'DESC' : 'ASC'
        } else {
            order = 'ASC'
        }
        sort.push(col + ' ' + order)
        var data = {
            base: ds.base.name,
            table: list.name,
            filter: m.route.param('query') 
                ? decodeURI(m.route.param('query')) 
                : null,
            condition: m.route.param('where') 
                ? decodeURI(m.route.param('where')) 
                : null,
            sort: JSON.stringify(sort),
            offset: list.offset
        }
        this.get(data)
    },

    /**
     * Get table data from server
     *
     * @param {object} data  ajax data: base, table, condition, limit, 
     *                                  offset, sort, filter, prim_key
     *
     */
    get: function(data) {

        m.request({
            method: "get",
            url: "table",
            params: data
        }).then(function(result) {
            ds.table = result.data
            ds.table.dirty = false
            ds.table.ismain = true // represents main grid, and not relations

            // Parses sort data
            // TODO: Virker rart å måtte gjøre dette
            var sort_fields = {}
            $.each(ds.table.grid.sort_columns, function(i, value) {
                // splits the value into field and sort order
                var sort_order
                var value_parts = value !== null ? value.split(' ') : []
                var key = value_parts[0]
                if (value_parts[1] !== undefined) {
                    sort_order = value_parts[1]
                } else {
                    sort_order = 'ASC'
                }
                sort_fields[key] = {}
                sort_fields[key]['order'] = sort_order
                // idx angir her hvilken prioritet dette feltet 
                // har i sorteringen
                sort_fields[key]['idx'] = i
            })
            ds.table.sort_fields = sort_fields

            ds.type = 'table'

            ds.table.query = data.filter

            ds.table.filters = Search.parse_query(data.filter)

            if (ds.table.selection === null) ds.table.selection = 0

            // Show first record
            if (ds.table.type != 'view') {
                Record.select(ds.table, ds.table.selection, true)
            }
            $('#urdgrid tr.focus').trigger('focus')
        }).catch(function(e) {
            console.log('error:', e)
            if (e.code === 401) {
                $('div.curtain').show()
                $('#login').show()
                $('#brukernavn').trigger('focus')
            } else {
                alert(e.response.detail)
            }
        })
    },

    get_filter: function() {
        var param = Object.assign({}, m.route.param())
        var filter = ''

        if (!('query' in param) && !('where' in param)) {
            delete param.base
            delete param.table
            var search_params = []
            $.each(param, function(key, value) {
                search_params.push(key + ' = ' + value)
            })
            filter = search_params.join(' AND ')
        }

        return filter
    },

    /**
     * Reloads table after save
     *
     * @param {object} list - The list that is shown
     * @param {object} data - Data returned from ajax save
     */
    update: function(list, data) {
        var p = {}
        var idx = list.selection
        var post = list.records[idx]

        // Updates primary key for selected record from save response
        if (data.selected) {
            post.pkey = data.selected
        }

        p.base = ds.base.name
        p.table = list.name
        p.filter = m.route.param('query') 
            ? decodeURI(m.route.param('query')) 
            : null
        p.condition = m.route.param('where') 
            ? decodeURI(m.route.param('where')) 
            : null
        if (!p.filter) {
            p.filter = Grid.get_filter()
        }
        p.sort = JSON.stringify(list.grid.sort_columns)
        p.limit = list.limit
        p.offset = list.offset
        if (!post.delete) {
            p.prim_key = JSON.stringify(post.pkey)
        } else {
            p.prim_key = null
        }
        Grid.get(p)
    },

    save: function() {
        var data = {
            base_name: ds.base.name,
            table_name: ds.table.name,
            records: []
        }

        var invalid = false

        $.each(ds.table.records, function(idx, rec) {
            if (!rec.dirty && !rec.new) return

            Record.validate(rec, true)

            if (rec.invalid) {
                invalid = true
                return
            }

            var changes = Record.get_changes(rec, true)
            if (idx == ds.table.selection) changes.selected = true
            data.records.push(changes)
        })

        if (invalid) {
            alert('Rett feil før lagring')
            return
        }

        m.request({
            method: 'put',
            url: 'table',
            body: data
        }).then(function(result) {
            $('#message').show().html('Lagring vellykket')

            setTimeout(function() {
                $('#message').hide()
            }, 2000)

            Grid.update(ds.table, result.data)
        })

        return true
    },

    check_dirty: function() {
        var txt = "Er du sikker på at du vil oppdatere innhold på siden?\n\n"
        var r // Skal holde returverdi
        if (ds.table.dirty) {
            txt += "Du har foretatt endringer i listen. "
            txt += "Endringene vil ikke bli lagret hvis du fortsetter.\n\n"
            txt += "Trykk OK for å fortsette, eller Avbryt for å bli stående."
            r = confirm(txt)
            return r
        }
        else return true
    },

    load: function() {
        var params = Object.assign({}, m.route.param())
        var base_name = params['base'] ? params['base'] : ds.urd_base
        var table_name = params['table'] ? params['table'] : 'database_'
        var search = params['query'] ? params['query'] : null
        if (!search) {
            search = Grid.get_filter()
        }

        if (ds.base.name != base_name) {
            ds.load_database(base_name)
        }
        Grid.get({ base: base_name, table: table_name, filter: search,
                   limit: config.limit })


        $('div[name="vis"]').removeClass('inactive')
        $('div[name="sok"]').addClass('inactive')
    },

    onremove: function(vnode) {
        // Make table load again after navigation
        // grid.url is used in datapanel.view to check if table should be loaded
        if (m.route.get() !== Grid.url) {
            Grid.url = ''
        }
    },

    view: function(vnode) {

        if (ds.table.search) return

        return [m('table#urdgrid.tbl', {
            class: 'max-w10 bt b--moon-gray flex flex-column overflow-auto '
                 + 'collapse',
            style: 'background: #f9f9f9',
        }, [
            m('thead', {class: 'db'}, [
                m('tr', {class: 'cursor-default bb b-moon-gray'}, [
                    m('th', {class: 'tl br b--moon-gray bg-light-gray normal f6'
                                  + 'pa0 w1'}, ''),
                    Object.keys(ds.table.grid.columns).map(function(label) {
                        var col = ds.table.grid.columns[label]

                        var field = ds.table.fields[col]

                        // If this is for instance an action
                        if (field === undefined) {
                            return m('th', '')
                        }

                        if (field.hidden) return

                        var label = isNaN(parseInt(label))
                            ? label : ds.table.fields[col].label 
                            ? ds.table.fields[col].label : col
                        return m('th', {
                            class: 'tl br b--moon-gray bg-light-gray f6 pa1 pb0'                                  + 'nowrap truncate dib',
                            onclick: Grid.sort.bind(Grid, col)
                        }, m('div', {class: 'flex'}, [
                            m('span', {
                                class: "flex-auto truncate",
                                title: label
                            }, label), [
                                !Grid.column_order(col) ? '' : m('i', {
                                    class: 'pl1 di fa fa-angle-' 
                                        + (Grid.column_order(col) === 'asc' 
                                                ? 'down' : 'up')
                                })
                            ]
                        ]))
                    }),
                    !ds.table.grid.actions.length 
                        ? '' 
                        : m('th', {
                            class: 'br bb b--moon-gray bg-light-gray f6 pa0'
                        })
                ])
            ]),
            m('tbody', {class: 'db overflow-y-auto overflow-x-hidden'}, [
                ds.table.records.map(function(record, idx) {
                    record.base_name = ds.base.name
                    record.table_name = ds.table.name
                    if (record.dirty) Record.validate(record)

                    return record.hidden 
                            ? '' 
                            : m(Row, {list: ds.table, record: record, idx: idx})
                })
            ]),
            (!Object.keys(ds.table.grid.sums).length) ? null : m('tfoot', [
                m('tr', {class: 'bg--light-gray'}, [
                    m('td', {
                        class: 'tc bt b--moon-gray pb0 bg-light-gray'
                    }, m.trust('Σ')),
                    Object.keys(ds.table.grid.columns).map(function(label, idx) {                        var col = ds.table.grid.columns[label]
                        return m('td', {
                            class: 'tr bl bt b--moon-gray bg-light-gray f6 pa1' 
                                +  'pb0 nowrap dib'
                        }, (col in ds.table.grid.sums) 
                                ? m.trust(String(ds.table.grid.sums[col])) 
                                : m.trust('&nbsp'))
                    })
                ])
            ])
        ])]
    }
}

module.exports = Grid

// Place here modules which requires grid (circular reference)
var Search = require('./search')
var Record = require('./record')
var Row = require('./row')
var config = require('./config')
var ds = require('./datastore')
