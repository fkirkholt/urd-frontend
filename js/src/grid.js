
var Grid = {

  url: '',

  align_thead: function() {
    var $table = $('#urdgrid')
    var $head_cells = $table.find('thead tr').children()
    var $body_cells = $table.find('tbody tr').first().children()
    var $foot_cells = $table.find('tfoot tr').children()
    var col_widths, head_col_widths, body_col_widths, foot_col_widths

    // Remove existing width attributes
    $head_cells.each(function(i, v) {
      $(v).css('width', '')
    })
    $body_cells.each(function(i, v) {
      $(v).children('div').css('width', '')
    })
    $foot_cells.each(function(i, v) {
      $(v).css('width', '')
    })

    // Get column widths
    head_col_widths = $head_cells.map(function() {
      return $(this).width()
    }).get()
    body_col_widths = $body_cells.map(function() {
      return $(this).width()
    }).get()
    foot_col_widths = $foot_cells.map(function() {
      return $(this).width()
    }).get()

    var col_widths = []
    // for (let idx in head_col_widths) {
    if (!config.compressed || body_col_widths.length == 0) {
      head_col_widths.forEach(function (value, idx) {
        col_widths[idx] = Math.max(...[
          value, 
          body_col_widths[idx] || 0,
          foot_col_widths[idx] || 0
        ])
      })
    } else {
      col_widths = body_col_widths
    }

    // Set width of tbody columns
    if (!config.compressed) {
      $.each(col_widths, function(idx, width) {
        $col = $table.find('tbody tr').first()
          .find('td:nth-child(' + (idx + 1) + ') div').width(width)
      })
    }

    // Set the width of thead columns
    $table.find('thead tr').children().each(function(i, v) {
      // Add 0,8 to th width because of margin width
      if (col_widths[i] != head_col_widths[i]) {
        $(v).width(col_widths[i] + 0.6)
      }
    })

    // Set the width of tfoot columns
    $table.find('tfoot tr').children().each(function(i, v) {
      if (col_widths[i] != foot_col_widths[i])
      $(v).width(col_widths[i] + 0.8)
    })
  },

  oncreate: function() {
    Grid.align_thead()
    // Adjust the width of thead cells when window resizes
    var align
    window.onresize = function() {
      clearTimeout(align)
      align = setTimeout(Grid.align_thead, 100)
    }
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
    return ds.table.grid.sort_columns[col]
      ? ds.table.grid.sort_columns[col]['dir'].toLowerCase()
      : ''
  },

  sort: function(col) {
    var list = ds.table
    var sort_cols = {}
    var order
    if (list.grid.sort_columns[col] && list.grid.sort_columns[col]['idx'] == 0) {
      order = list.grid.sort_columns[col]['dir'] == 'ASC' ? 'DESC' : 'ASC'
    } else {
      order = 'ASC'
    }
    sort_cols[col] = {col: col, dir: order, idx: 0}
    var data = {
      base: ds.base.name,
      table: list.name,
      filter: m.route.param('query')
        ? decodeURI(m.route.param('query'))
        : null,
      condition: m.route.param('where')
        ? decodeURI(m.route.param('where'))
        : null,
      sort: JSON.stringify(sort_cols),
      offset: list.offset,
      compressed: config.compressed
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

      ds.table.query = data.filter

      ds.table.filters = Search.parse_query(data.filter)

      if (data.index) {
        ds.table.selection = data.index
      }

      // Show first record
      if (ds.table.pkey) {
        Record.select(ds.table, ds.table.selection || 0, true)
      }
      $('#urdgrid tr.focus').trigger('focus')
    })
    .catch(function(e) {
      if (e.code === 401) {
        ds.base.system = e.response.detail.system
        ds.base.server = e.response.detail.host
        ds.base.name = e.response.detail.database
        $('div.curtain').show()
        $('#login').show()
        $('#brukernavn').trigger('focus')
      } else {
        alert(e.response ? e.response.detail : 'An error has occurred.')
      }
    })
  },

  get_filter: function(params) {
    var param = Object.assign({}, params)
    var filter = ''
    if (!('query' in param) && !('where' in param)) {
      delete param.base
      delete param.table
      delete param.index
      delete param.offset
      delete param.limit
      var search_params = []
      $.each(param, function(key, value) {
        expr = value ? key + '=' + value : key
        search_params.push(expr)
      })
      filter = search_params.join('; ')
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
    var messages = []
    var msg

    $.each(ds.table.records, function(idx, rec) {
      if (!rec.dirty && !rec.new) return

      Record.validate(rec)

      if (rec.invalid) {
        invalid = true
        messages.push(rec.messages.join("\n"))
        return
      }

      var changes = Record.get_changes(rec, true)
      if (idx == ds.table.selection) changes.selected = true
      data.records.push(changes)
    })

    if (invalid) {
      msg = messages.join("\n- ")
      alert('Rett feil før lagring:\n- ' + msg)
      return
    }

    m.request({
      method: 'put',
      url: 'table',
      body: data
    }).then(function(result) {
      $('#message').show().html('Saved')

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

  load: function(params) {
    var index = 0
    var query = params.query ? params.query : Grid.get_filter(params)

    if (ds.base.name != params.base) {
      ds.load_database(params.base)
    }

    if ('index' in params) {
      index = params.index
    }
    
    Grid.get({
      base: params.base, table: params.table, filter: query, 
      index: index, show_all_levels: config.show_all_levels || false,
      limit: config.limit, offset: params.offset || 0, 
    })


    $('div[name="vis"]').removeClass('inactive')
    $('div[name="sok"]').addClass('inactive')
  },

  view: function() {

    if (ds.table.search) return

    return [m('table#urdgrid.tbl', {
      'data-name': ds.table.name,
      class: 'bt b--moon-gray flex flex-column overflow-auto collapse',
      style: 'background: #f9f9f9',
    }, [
        m('thead', { class: 'db' }, [
          m('tr', { class: 'cursor-default bb b-moon-gray flex' }, [
            m('th', {
              class: 'tl br b--moon-gray bg-light-gray normal f6 pa0'
            }, ''),
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
                id: col,
                class: [
                  'tl br b--moon-gray bg-light-gray f6 pa1 pb0 nowrap dib',
                  config.compressed ? 'truncate' : '',
                ].join(' '),
                'data-sort': Grid.column_order(col) ? Grid.column_order(col) : false,
                onclick: Grid.sort.bind(Grid, col)
              }, [
              label, m('i', {
                class: [
                  'fr ml2',
                  Grid.column_order(col) == 'asc' ? 'fa fa-angle-up'
                    : Grid.column_order(col) == 'desc' ? 'fa fa-angle-down'
                    : ''
                ].join(' ')
              })])
            }),
            !ds.table.grid.actions.length
              ? ''
              : m('th', {
                class: 'br bb b--moon-gray bg-light-gray f6 pa0'
              })
          ])
        ]),
        m('tbody', { class: 'db overflow-y-auto overflow-x-hidden' }, [
          ds.table.records.map(function(record, idx) {
            record.base_name = ds.base.name
            record.table_name = ds.table.name
            if (record.dirty) Record.validate(record)

            return record.hidden
              ? ''
              : m(Row, { list: ds.table, record: record, idx: idx })
          })
        ]),
        (!Object.keys(ds.table.grid.sums).length) ? null : m('tfoot', [
          m('tr', { class: 'bg--light-gray' }, [
            m('td', {
              class: 'tc bt b--moon-gray pb0 bg-light-gray'
            }),
            Object.keys(ds.table.grid.columns).map(function(label) {
              var col = ds.table.grid.columns[label]
              return m('td', {
                class: 'tr bl bt b--moon-gray bg-light-gray f6 pa1 pb0 nowrap dib'
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
