
var Grid = {

  url: '',

  onupdate: function() {
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
    ds.table.grid.sort_columns = sort_cols
    Toolbar.set_url(0)
  },

  /**
   * Get table data from server
   *
   * @param {object} data  ajax data: base, table, limit, offset 
   *                                  sort, filter, prim_key
   *
   */
  get: function(data, index=0) {

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

      ds.base.name = data.base

      if (!config.recordview) {
        Toolbar.set_url(ds.table.selection || index, ds.table.offset, true)
      } else {
        Toolbar.set_url(null, ds.table.offset)
      }
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
    delete param.cnxn
    delete param.base
    delete param.table
    delete param.index
    delete param.offset
    delete param.limit
    delete param.order
    var search_params = []
    $.each(param, function(key, value) {
      var expr = value ? key + '=' + value : key
      search_params.push(expr)
    })
    filter = search_params.join('; ')

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

    p.cnxn = ds.cnxn
    p.base = ds.base.name
    p.table = list.name
    p.filter = ds.table.query
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
      params: { cnxn: ds.cnxn },
      body: data
    }).then(function(result) {
      $('#message').removeClass('bg-red').addClass('bg-light-green').show().html('Saved')

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
    var query = Grid.get_filter(params)

    if (ds.base.name != params.base) {
      ds.load_database(params.base)
    }

    if ('index' in params) {
      index = params.index
    }

    if ('order' in params) {
      var sort = params.order.split(' ')
      var sort_cols = {}
      sort_cols[sort[0]] = {col: sort[0], dir: sort[1], idx: 0}
    }
    
    Grid.get({
      cnxn: ds.cnxn,
      base: params.base, table: params.table, filter: query, 
      limit: config.limit, offset: params.offset || 0, 
      sort: JSON.stringify(sort_cols),
    }, index)


    $('div[name="vis"]').removeClass('inactive')
    $('div[name="sok"]').addClass('inactive')
  },

  get_chart_data: function() {
    var is_chart = false
    var chart_columns = []

    ds.table.grid.columns.forEach(function(colname) {
      var field = ds.table.fields[colname]
      var is_char
      if (
        ['int', 'float', 'Decimal'].includes(field.datatype) && 
        !field.fkey && ds.table.pkey && !ds.table.pkey.includes(colname)
      ) {
        is_chart = true
        chart_columns.push(colname)
      }
      if (field.datatype == 'unknown' && !isNaN(ds.table.records[0].columns[colname].value)) {
        field.datatype = 'Decimal'
        is_chart = true
      }
    })

    var unique_cols
    for (let key in ds.table.indexes) {
      let idx = ds.table.indexes[key]
      if (idx.unique && JSON.stringify(idx.columns) !== JSON.stringify(ds.table.pkey)) {
        unique_cols = idx.columns
      }
    }
    if (!unique_cols && ds.table.pkey && ds.table.pkey[0] != 'rowid') {
      unique_cols = ds.table.pkey
    }

    if (!is_chart || chart_columns.length == 0) {
      return []
    }
    var chart_data = ds.table.records.map(function(item) {
      var new_item = {}
      if (unique_cols) {
        var values = []
        unique_cols.map(function(colname) {
          if (!(colname in item.columns)) {
            return false
          }
          if (config.compressed) {
            values.push(item.columns[colname].value)
          } else {
            values.push(item.columns[colname].text)
          }
        })
        new_item.x = values.join(', ')
      } 
      chart_columns.map(function(colname) {
        if (config.compressed) {
          new_item[colname] = item.columns[colname].value
        } else {
          new_item[colname] = item.columns[colname].text
        }
      })

      return new_item || false
    })

    return chart_data
  },

  view: function() {

    if (ds.table.search) return
    var chart_data = Grid.get_chart_data()
    ds.table.is_chart = chart_data.length > 0

    return [
      ds.table.tab == 'chart' ? '' : m('div', { 
        class: 'bottom-0, overflow-y-auto'
      }, [m('table#urdgrid.tbl', {
        'data-name': ds.table.name,
        class: [
          'bt overflow-auto collapse w-100',
          config.dark_mode ? 'b-mid-gray b--gray' : 'b-light-gray b--moon-gray'
        ].join(' '),
      }, [
          m('thead', { class: '' }, [
            m('tr', { class: 'cursor-default' }, [
              m('th', {
                class: [
                  'tl normal f6 pa0',
                  config.dark_mode ? 'bg-mid-gray b--gray' : 'bg-light-gray b--moon-gray'
                ].join(' ')
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
                    ['int', 'Decimal', 'float'].includes(field.datatype) ? 'tr' : 'tl',
                    'f6 pa1 pb0 nowrap ba',
                    config.dark_mode ? 'bg-mid-gray b--gray' : 'bg-light-gray b--moon-gray',
                    config.compressed ? 'truncate' : '',
                  ].join(' '),
                  'data-sort': Grid.column_order(col) ? Grid.column_order(col) : false,
                  onclick: Grid.sort.bind(Grid, col)
                }, [
                label, m('i', {
                  class: [
                    'ml2',
                    Grid.column_order(col) == 'asc' ? 'nf nf-fa-angle_up'
                      : Grid.column_order(col) == 'desc' ? 'nf nf-fa-angle_down'
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
          m('tbody', { class: 'overflow-y-auto overflow-x-hidden' }, [
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
            m('tr', { class: 'bg--light-gray bb br' }, [
              m('td', {
                class: 'tc bt b--moon-gray pb0'
              }),
              Object.keys(ds.table.grid.columns).map(function(label) {
                var col = ds.table.grid.columns[label]
                return m('td', {
                  class: 'tr bl bt b--moon-gray bg-white f6 pa1 pb0 nowrap'
                }, (col in ds.table.grid.sums)
                    ? m.trust(String(ds.table.grid.sums[col]))
                    : m.trust('&nbsp'))
              })
            ])
          ])
      ]),
      !ds.table.tab || ds.table.tab == 'data' ? '' : m(Chart, { 
        data: chart_data,
        class: [
          'bb bt b--gray',
          config.dark_mode ? 'bg-near-black' : 'bg-white'
        ].join(' ')
      })])
    ]
  }
}

export default Grid

// Place here modules which requires grid (circular reference)
import Search from './search.js'
import Record from './record.js'
import Row from './row.js'
import Chart from './chart.js'
import config from './config.js'
import Toolbar from './toolbar.js'
