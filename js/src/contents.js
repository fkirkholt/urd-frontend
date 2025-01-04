import get from 'just-safe-get'
import config from './config.js'
import Diagram from './diagram.js'
import Relation from './relation.js'

var Contents = {

  oninit: function() {
    $('#right_content').hide()
  },

  // Get display property for heading
  // If all underlying tables should be hidden, then the
  // returned display property is 'none', and the heading
  // isn't shown
  display_header: function(node, display) {
    display = display || 'none'
    Object.keys(node.subitems).map(function(label) {
      var subitem = node.subitems[label]
      if (typeof (subitem) == 'object') {
        display = Contents.display_header(subitem, display)
      } else {
        var object = get(ds.base, subitem, ds.base.tables[subitem])
        if (ds.table_filter && !object.name.toLowerCase().includes(ds.table_filter.toLowerCase())) {
          return
        }
        if (
          (object.hidden != true && object.type != 'list') || config.admin) {
          display = 'block'
        }
      }
    })

    return display
  },

  draw_heading: function(label, heading) {
      var display = heading.expanded ? 'block' : 'none'
      // Decides if the header should be shown or not
      var display_header = Contents.display_header(heading)
      return m('.module', {
        class: heading.class_module,
        style: 'display:' + display_header
      }, [
          m('span.nowrap', [
            // Draw expansion icons
            m('i', {
              class: [
                heading.expanded
                  ? 'fa fa-angle-down'
                  : 'fa fa-angle-right',
                heading.class_label,
                'w1 tc',
                'light-silver'
              ].join(' '),
              onclick: function() {
                heading.expanded = !heading.expanded
              }
            }),
            // Draw label
            m('.label', {
              class: [
                heading.class_label,
                'di b pointer'
              ].join(' '),
              onclick: function() {
                heading.expanded = !heading.expanded
              },
              oncontextmenu: function(event) {
                Contents.context_module = label
                $('ul#context-module')
                  .css({ top: event.clientY, left: event.clientX })
                  .toggle()
                return false
              }
            }, label),
            // Draw table count if in admin mode
            !heading.count || !config.admin ? '' : m('span', {
              class: 'ml2 light-silver'
            }, '(' + heading.count + ')'),
          ]),
          // Draw tables in group if group is expanded
          m('.content', {
            class: heading.class_content,
            style: 'display: ' + display
          }, [
              Object.keys(heading.subitems).map(function(label) {
                var subitem = heading.subitems[label]
                if (Array.isArray(heading.subitems)) {
                  var obj = get(ds.base, subitem)
                  if (obj === undefined) return
                  label = obj.label
                }
                return Contents.draw_table_node(label, subitem)
              })
            ])
        ])
  },

  // draw_node: function(label, node) {
  //   // If the node is just a heading
  //   if (typeof node == 'object' && !node.item) {
  //   } else {
  draw_table_node: function(label, node) {
    var subitems
    var item
    // If this is a table with subordinate tables
    if (typeof node == 'object') {
      subitems = node.subitems
      item = node.item
      var display_chevron = Contents.display_header(node)
    } else {
      subitems = false
      item = node
    }
    // For now only tables are accepted in contents
    var table = get(ds.base, item, ds.base.tables[item])
    if (item.indexOf('.') == -1) item = 'tables.' + item
    if (
      ((table.hidden || table.type == 'list') && !config.admin) ||
      (ds.table_filter && !table.name.toLowerCase().includes(ds.table_filter.toLowerCase()))
    ) {
      return
    }
    var icon = table.type && (table.type == 'list') 
      ? 'fa-list'
      : 'fa-table'
    var icon_color = table.hidden ? 'moon-gray' : 'silver'

    return m('div', {
      class: ds.table && ds.table.name == table.name
        ? 'bg-light-gray nowrap'
        : 'nowrap',
    }, [
        // Draw expansion icon for tables having subordinate tables
        typeof node != 'object' ? '' : m('i', {
          class: [
            'w1 tc light-silver fa',
            node.expanded ? 'fa-angle-down' : 'fa-angle-right',
          ].join(' '),
          style: display_chevron == 'none' ? 'display: none' : '',
          onclick: function() {
            node.expanded = !node.expanded
          }
        }),
        // Draw icon indicating table type
        m('i', {
          class: [
            icon_color + ' mr1 fa ' + icon,
            // Indent icon correctly when there is no expansjon icon
            (typeof node == 'object' && display_chevron == 'block')
              ? ''
              : 'ml3'
          ].join(' '),
        }),
        // Draw table name as link
        m('a', {
          class: [
            'black underline-hover nowrap',
            table.description ? 'dot' : 'link',
            table.type == 'view' ? 'i' : ''
          ].join(' '),
          title: table.description ? table.description : '',
          href: '#/' + ds.base.name + '/' + (config.tab || 'data') +
            '/' + table.name,
          onclick: function() {
            Diagram.type = 'table'
            Diagram.root = table.name
          },
          oncontextmenu: function(event) {
            Contents.context_table = table

            var hidden_txt = table.hidden
              ? 'Show table'
              : 'Hide table'
            $('ul#context-table li.hide').html(hidden_txt)

            var type_txt = table.type == 'list'
              ? 'Set as data table'
              : 'Set as looup table'
            $('ul#context-table li.type').html(type_txt)

            $('ul#context-table')
              .css({ top: event.clientY, left: event.clientX })
              .toggle()

            return false
          }
        }, label),
        // Draw rowcount if in admin mode
        !table.rowcount || !config.admin ? '' : m('span', {
          class: 'ml2 light-silver',
        }, '(' + table.rowcount + ')'),
        // Draw subordinate tables for expanded main table
        !subitems || !node.expanded ? '' : m('.content', {
          style: 'margin-left:' + 18 + 'px',
        }, [
            Object.keys(subitems).map(function(label) {
              var subitem = subitems[label]
              var subitem_name
              if (typeof subitem == 'object') {
                subitem_name = subitem.item
              } else {
                subitem_name = subitem
              }
              var rel = get(ds.base, subitem_name, ds.base.tables[item]) 

              // find the fkey defining the relation
              var rel_fkey_name
              Object.keys(rel.fkeys).map(function(fkey_name) {
                var fkey = rel.fkeys[fkey_name]
                if (fkey.referred_table == table.name) {
                  rel_fkey_name = fkey_name
                }
              })

              if (!config.show_all_descendants && !Relation.is_direct(rel.name, rel_fkey_name)) {
                return
              }
              return Contents.draw_table_node(label, subitem)
            })
          ])
      ])
  },

  view: function() {
    if (!ds.base.contents && !ds.base.tables) return

    if (!ds && !ds.base.contents) return

    return [
      m('.contents', { class: "flex" }, [
        // Context menu for modules (table groups)
        m('ul#context-module', {
          class: 'absolute left-0 bg-white list pa1 shadow-5 dn pointer z-999'
        }, [
            m('li', {
              class: 'hover-blue',
              onclick: function() {
                Diagram.type = 'module'
                Diagram.root = Contents.context_module
                $('ul#context-module').hide()
              }
            }, 'Show diagram')
          ]),
        // Context menu for single tables
        m('ul#context-table', {
          class: 'absolute left-0 bg-white list pa1 shadow-5 dn pointer z-999'
        }, [
            // Show links to this table
            config.tab == 'data' ? '' : m('li', {
              class: 'hover-blue',
              onclick: function() {
                Diagram.added_tables.push(Contents.context_table)
                $('ul#context-table').hide()
              }
            }, 'Show links to this table'),
            // Hide table
            m('li.hide', {
              class: 'hover-blue',
              onclick: function() {
                var tbl = Contents.context_table
                tbl.hidden = !tbl.hidden
                $('ul#context-table').hide()

                ds.set_cfg_value(tbl, 'hidden', tbl.hidden)
              }
            }, 'Skjul tabell'),
            // Set table to list (i.e. lookup table)
            m('li.type', {
              class: 'hover-blue',
              onclick: function() {
                var tbl = Contents.context_table
                tbl.type = tbl.type == 'table'
                  ? 'list'
                  : 'table'
                $('ul#context-table').hide()

                ds.set_cfg_value(tbl, 'type', tbl.type)
              }
            }, 'Set to lookup table')
          ]),
        // Draw select box for choosing schema within database.
        // Postgres has this structure.
        m('.list', { class: "flex flex-column overflow-auto min-w4" }, [
          !ds.base.schemata || ds.base.schemata.length < 2
            ? '' : m('select', {
              name: 'schemata',
              class: 'mb2',
              onchange: function() {
                var schema = $(this).val()
                db_name = ds.base.name.split('.')[0]
                adr = ['postgresql', 'mssql'].includes(ds.base.system)
                  ? '/' + db_name + (['dbo', 'public'].includes(schema) ? '' : '.' + schema)
                  : '/' + schema
                m.route.set(adr)
              }
            }, [
                ds.base.schemata.map(function(schema) {
                  var selected = (schema.split('.').at(-1) == ds.base.schema)
                  return m('option', {
                    value: schema,
                    selected: selected
                  }, schema.split('.').at(-1))
                })
              ]),
          !config.admin ? '' : m('input', {
            id: 'filter_tables',
            placeholder: 'filter tables',
            onkeydown: function() {
              ds.table_filter = $(this).val()
            }
          }),
          ds.base.contents && Object.keys(ds.base.contents).length
            // Draw contents from ds.base.contents
            ? Object.keys(ds.base.contents).sort().map(function(label) {
              var item = ds.base.contents[label]
              if (typeof item == 'object' && !item.item) {
                var retur = Contents.draw_heading(label, item, 3)
              } else {
                var retur = Contents.draw_table_node(label, item)
              }
              return retur
            })
            // Draw contents from ds.base.tables
            // NOTE: This never happens, because ds.base.contents is always set
            : Object.keys(ds.base.tables).map(function(name) {
              var table = ds.base.tables[name]
              return Contents.draw_node(table.label, 'tables.' + name, 3)
            }),
        ]),
      ]),
      // Show database description to the right of the contents
      ds.type != 'contents' || !ds.base.description ? '' : m('div', { class: 'pl5' }, [
        m('b', 'Description'),
        m('br'),
        m('p', ds.base.description)
      ])
    ]
  }
}

export default Contents
