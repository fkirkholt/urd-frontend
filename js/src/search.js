var Search = {

  oninit: function(vnode) {
    var table = vnode.attrs.table ? vnode.attrs.table : ds.table
    if (!config.edit_search) {
      table.filters = {}
    }
  },

  toggle_relation: function(field) {

    m.request({
      method: "GET",
      url: "table",
      params: {
        base: field.fkey.base,
        table: field.fkey.referred_table,
        limit: 0
      }
    }).then(function(result) {
      field.relation = result.data
      field.relation.alias = field.name
      // mark the relation so that we don't expand more
      // than one level deep
      field.relation.sublevel = true

      if (field.expanded) {
        field.expanded = false
        return
      } else if (field.fkey) {
        field.expanded = true
      }
    })
  },

  search: function() {
    var query = {}
    var search_criterias = Search.parse_search()
    query.key = 'query'
    query.value = search_criterias.join(' AND ')

    m.route.set('/' + ds.base.name + '/data/' + ds.table.name +
      '?' + query.key + '=' + query.value)
  },

  parse_search: function() {
    var search_criterias = []

    Object.keys(ds.table.filters).map(function(label, idx) {
      var filter = ds.table.filters[label]
      if (
        filter.value ||
        ['IS NULL', 'IS NOT NULL'].includes(filter.operator)
      ) {
        var value = filter.value
        var operator = filter.operator
        if (filter.operator === 'LIKE' || filter.operator === 'NOT LIKE') {
          value = '*' + value + '*'
        } else if (filter.operator === 'start') {
          value = value + '*'
          operator = 'LIKE'
        } else if (filter.operator === 'slutt') {
          value = '*' + value
          operator = 'LIKE'
        } else if (filter.operator.search('=') !== -1) {
          operator = filter.operator.replace('=', '%3D')
        }
        search_criterias
          .push((filter.field + ' ' + operator + ' ' + (value || ''))
            .trim())
      }

    })

    return search_criterias
  },

  /**
   * Returns an object with field, operator and value from where expression
   */
  parse_query: function(expr) {
    var conditions = expr !== null ? expr.split(' AND ') : []
    var search = {}
    $.each(conditions, function(i, cond) {
      var parts = cond.split(/\s*([=<>]|!=|IN|LIKE|NOT LIKE|IS NULL|IS NOT NULL)\s*/)
      if (parts.length > 1) {
        var val = parts[2].replace(/(^'\*)|(^')|(\*'$)|('$)/g, '')
        var operator = parts[1]

        if (val.charAt(0) === '*' && val.slice(-1) === '*') {
          val = val.substr(1, val.length - 2)
        } else if (val.charAt(0) === '*') {
          val = val.substr(1, val.length)
          operator = 'slutt'
        } else if (val.slice(-1) === '*') {
          val = val.substr(0, val.length - 1)
          operator = 'start'
        }

        if (operator === 'IN') {
          val = val.replace(', ', ',').split(',')
          val = val.map(function(value) {
            return value == parseInt(value)
              ? parseInt(value)
              : value
          })
        }

        var field = parts[0]
        var item = {
          field: field,
          operator: operator,
          value: val
        }

        search[field] = item
      }
    })

    return search
  },

  draw_field: function(table, item, label) {

    // If this is a heading
    if (typeof item === 'object') {
      label = item.label ? item.label : label

      return [
        m('tr', [
          // Draw expansion icon
          m('td', { class: 'tc' }, [
            item.inline && !item.expandable ? '' : m('i.fa', {
              class: item.expanded ? 'fa-angle-down' : 'fa-angle-right',
              onclick: function() {
                if (item.expandable === false) return

                item.expanded = !item.expanded
              }
            })
          ]),
          // Draw label
          m('td.label', {
            class: [
              'f6 nowrap pr2',
              !item.inline || item.expandable ? 'b' : ''
            ].join(' '),
            colspan: item.inline ? 1 : 3,
            onclick: function() {
              item.expanded = !item.expanded
            }
          }, label),
        ]),
        // Draw fields if expanded
        !item.expanded ? null : m('tr', [
          m('td'),
          m('td', { colspan: 3 }, [
            m('table', [
              Object.keys(item.items).map(function(label, idx) {
                var col = item.items[label]
                return Search.draw_field(table, col, label)
              })
            ]),
          ])
        ])
      ]
    }

    // If this is a field
    if (
      typeof item === 'string' &&
      !item.includes('relations') &&
      !item.includes('actions.')
    ) {
      var field = table.fields[item]


      label = isNaN(parseInt(label)) ? label : field.label
      var operators = Search.get_operators(field)

      if (table.alias === undefined) table.alias = table.name
      var filtername = table.alias == ds.table.name
        ? field.name
        : (table.alias || table.name) + '.' + field.name

      if (!ds.table.filters[filtername]) {
        ds.table.filters[filtername] = {
          field: filtername,
          operator: field.element == 'textarea' || (
            field.element == 'input' && field.attrs.type == 'text' &&
            !['int', 'Decimal', 'float'].includes(field.datatype)
          ) ? 'LIKE' : '='
        }
      }

      var filter = ds.table.filters[filtername]
      field.value = filter.value

      return [
        m('tr', [
          // expansion icon
          m('td', { class: 'tc v-top' }, [
            !field.fkey || !field.expandable || table.sublevel
              ? null
              : m('i.fa', {
                class: !field.expanded
                  ? 'fa-angle-right'
                  : field.expandable ? 'fa-angle-down' : '',
                onclick: function() {
                  Search.toggle_relation(field)
                }
              })
          ]),
          // label
          m('td.label', {
            class: 'f6 nowrap pr1 v-top mw4 truncate',
            title: label
          }, label),
          // operator
          m(Select, {
            class: 'mr2 w5',
            options: operators,
            required: true,
            value: filter.operator,
            width: '100px',
            onchange: function(e) {
              filter.operator = e.target['value']

              // This code recreates the value field,
              // to run oncreate again
              // with attributes for the new field
              filter.disabled = true
              m.redraw()
              filter.disabled = false
            }
          }),
          // input
          m('td', {
            class: 'mw5 w-100'
          }, Search.draw_value_field(table, field, filter))
        ]),
        !field.expanded ? null : m('tr', [
          m('td'),
          m('td', { colspan: 3 }, m(Search, { table: field.relation }))
        ])
      ]
    }
  },

  /** Draws a value field for the search parameter
   *
   * @param {object} field - The field to search on
   * @param {object} filter - The filter to apply
   *
   */
  draw_value_field: function(table, field, filter) {
    var has_idx = false
    var key
    var width
    $.each(table.indexes, function(i, idx) {
      if (idx.columns[0] === field.name) {
        has_idx = true
      }
    })

    if (filter.disabled) {
      return null
    } else if (['IS NULL', 'IS NOT NULL'].includes(filter.operator)) {
      return null
    } else if (
      ((field.element == 'select' && field.options &&
        filter.operator !== 'IN') ||
        (field.element == 'input' &&
          field.attrs.type == 'checkbox')) &&
      filter.operator !== ''
    ) {
      return m(Select, {
        name: filter.field,
        options: field.options,
        valueField: 'value',
        value: filter.value,
        label: filter.label,
        style: 'flex: 2;',
        onchange: function(e) {
          filter.value = e.target['value']
          filter.label = e.target['textContent']
        }
      })
    } else if (
      (field.element === 'select' &&
        !['', 'LIKE', 'start', 'slutt', '>', '<'].includes(filter.operator)) ||
      (field.element === 'input' && field.attrs.type == 'text' &&
        has_idx &&
        ['=', '!='].includes(filter.operator))
    ) {
      key = field.fkey ? field.fkey.referred_columns : [field.name]

      return m(Autocomplete, {
        name: filter.field,
        item: filter,
        placeholder: 'Velg',
        multiple: filter.operator === 'IN' ? true : false,
        options: field.options ? field.options : null,
        value: filter.value,
        text: filter.text,
        class: 'w-100',
        style: 'flex: 2;',
        ajax: field.options ? null : {
          url: 'options',
          data: {
            schema: ds.base.schema,
            base: ds.base.name,
            table: table.name,
            column: field.name,
            condition: null
          }
        },
        onchange: function(e) {
          filter.value = $(e.target).data('value')
          filter.text = e.target['value']
        },
        onclick: function(e) {
          if (e.target.value === '') {
            $(e.target).autocomplete('search', '')
          }
        }
      })
    } else if (field.element == 'input' && field.attrs.type == 'radio') {
      return [
        field.options.map(function(filter, idx) {
          return [m('input[type="radio"]', {
            value: filter.value
          }), filter.label]
        })
      ]
    } else if (field.element == 'input' && field.attrs.type == 'date') {
      return m('input[type=date]', {
        name: filter.field,
        value: filter.value,
        style: 'flex: 2;',
        onchange: function() {
          filter.value = e.target['value']
        }
      })
    } else {
      width = (field.size === null || field.size == 0 || field.size > 20)
        ? '100%'
        : field.size + 'em'
      return m('input', {
        name: filter.field,
        value: filter.value !== undefined ? filter.value : '',
        style: 'width: ' + width,
        disabled: filter.operator === '' ? true : false,
        onchange: function(e) {
          filter.value = e.target['value']
        },
        onkeydown: function(e) {
          if (e.keyCode == 13) {
            filter.value = e.target.value
            Search.search(ds.table.filter)
            e.preventDefault()
          }
          e.redraw = false
        }
      })
    }

  },

  get_operators: function(field) {
    var operators = [
      { value: 'IN', label: 'blant' },
      { value: 'LIKE', label: 'inneholder' },
      { value: 'NOT LIKE', label: 'inneholder ikke' },
      { value: 'start', label: 'starter på' },
      { value: 'slutt', label: 'slutter på' },
      { value: '=', label: '=' },
      { value: '!=', label: '!=' },
      { value: '>', label: '>' },
      { value: '<', label: '<' },
      { value: 'IS NULL', label: 'er tom' },
      { value: 'IS NOT NULL', label: 'er ikke tom' },
    ]
    operators = operators.filter(function(operator) {

      if (
        ((field.element == 'select' &&
          (field.fkey && field.fkey.referred_table !== field.table)) ||
          (field.element == 'input' && field.attrs.type == 'radio')) &&
        ['LIKE', 'NOT LIKE', 'start', 'slutt', '>', '<']
          .includes(operator.value)
      ) {
        return false
      } else if (
        field.datatype == 'bool' &&
        ['IN', 'LIKE', 'NOT LIKE', 'start', 'slutt', '>', '<']
          .includes(operator.value)
      ) {
        return false
      } else if (
        ((field.element == 'input' & field.attrs.type == 'text' &&
          field.datatype == 'int') ||
          (field.element == 'input' &&
            (field.attrs.type == 'date' ||
              field.datatype == 'int'))) &&
        ['LIKE', 'NOT LIKE', 'start', 'slutt'].includes(operator.value)
      ) {
        return false
      } else if (
        (field.datatype == 'str' &&
          (field.element == 'textarea' ||
            (field.element == 'input' && field.attrs.type == 'text') ||
            (field.element == 'input' &&
              field.attrs.type == 'text'))) &&
        ['IN'].includes(operator.value)
      ) {
        return false
      } else {
        return true
      }
    })

    return operators
  },

  view: function(vnode) {

    var table = vnode.attrs.table ? vnode.attrs.table : ds.table

    return [
      m('div', { class: 'ml3' }, [vnode.attrs.table ? '' : m('div', [
        m('input[type=button]', {
          value: 'Search',
          onclick: function() {
            Search.search()
          }
        }),
        m('input[type=button]', {
          value: 'Cancel',
          onclick: function() {
            ds.table.search = !ds.table.search
            m.redraw()
          }
        }),
        m('input[type=button]', {
          value: 'Reset form',
          disabled: Object.keys(ds.table.filters).filter(function(key) {
            var filter = ds.table.filters[key]
            return filter.value ||
              ['IS NULL', 'IS NOT NULL'].includes(filter.operator)
          }).length === 0,
          onclick: function() {
            ds.table.filters = {}
          }
        }),
        m('input[type=checkbox]', {
          class: 'ml2',
          checked: config.edit_search,
          onchange: function() {
            config.edit_search = !config.edit_search
            Cookies.set('edit_search', config.edit_search, { expires: 14 })
            if (config.edit_search) {
              ds.table.filters = Search.parse_query(ds.table.query)
            }
          }
        }), ' Show active search criteria']),
      m('form[name="search"]', {
        class: 'flex flex-column',
        style: 'flex: 0 0 550px;'
      }, m('table[name=search]', {
        class: 'pt1 pl1 pr2 flex flex-column',
        style: '-ms-overflow-style:-ms-autohiding-scrollbar'
      }, m('tbody', [
        Object.keys(table.form.items).map(function(label, idx) {
          var item = table.form.items[label]

          if (
            typeof item !== 'object' &&
            item.indexOf('.') === -1 &&
            table.fields[item].defines_relaton
          ) {
            return
          }

          return Search.draw_field(table, item, label)
        })
      ])))])
    ]
  }
}

module.exports = Search

var Select = require('./select')
var Autocomplete = require('./seeker')
var config = require('./config')
var Cookies = require('js-cookie')
