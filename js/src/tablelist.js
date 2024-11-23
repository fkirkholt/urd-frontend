var Tablelist = {
  view: function(vnode) {
    if (!ds.base.tables) {
      return
    }

    return [
      m('ul#tablelist-context', {
        class: 'absolute left-0 bg-white list pa1 shadow-5 dn '
          + 'pointer z-999'
      }, [
          m('li', {
            class: 'hover-blue',
            onclick: function() {
              var sql = 'alter table ' + Tablelist.context_table +
                ' rename to new_table_name'
              Codefield.set_value('query', sql)
              $('#tablelist-context').hide()
            }
          }, 'Rename'),
          m('li', {
            class: 'hover-blue',
            onclick: function() {
              var sql = 'alter table ' + Tablelist.context_table +
                ' add column column_def'
              Codefield.set_value('query', sql)
              $('#tablelist-context').hide()
            }
          }, 'Add column'),
          m('li', {
            class: 'hover-blue',
            onclick: function() {
              var sql = 'alter table ' + Tablelist.context_table +
                ' drop column column_name'
              Codefield.set_value('query', sql)
              $('#tablelist-context').hide()
            }
          }, 'Drop column'),
          m('li', {
            class: 'hover-blue',
            onclick: function() {
              var sql = 'alter table ' + Tablelist.context_table +
                ' rename column column_name to new_column_name'
              Codefield.set_value('query', sql)
              $('#tablelist-context').hide()
            }
          }, 'Rename column'),
          m('li', {
            class: 'hover-blue',
            onclick: function() {
              var sql
              if (ds.base.system == 'sqlite') {
                sql = "select sql "
                  + "from sqlite_master "
                  + "where name = '" + Tablelist.context_table + "'"
              } else if (ds.base.system == 'mysql') {
                sql = "show columns from " + Tablelist.context_table
              } else {
                sql = "select column_name, data_type, "
                sql += "character_maximum_length,\n"
                sql += "column_default, is_nullable\n"
                sql += "from INFORMATION_SCHEMA.COLUMNS\n"
                sql += "where table_name = '" + Tablelist.context_table + "';"
              }
              Codefield.set_value('query', sql)
              $('#tablelist-context').hide()
            }
          }, 'Describe table')
        ]),
      m('ul', {
        class: 'list flex flex-column pl2 mt0'
      }, [
          m('li', [m('input', {
            id: 'filter_tables',
            placeholder: 'filter tables',
            onkeydown: function() {
              // triggers redraw on keydown
              return
            }
          })]),
          Object.keys(ds.base.tables).sort().map(function(item, i) {
            var filter = $('#filter_tables').val()
            return (
              filter !== undefined && 
              !item.toLowerCase().includes(filter.toLowerCase())
            ) ? '' : m('li', {
              class: 'pointer',
              onclick: function(ev) {
                Codefield.set_value('query', 'select * from ' + item)
                $('#run_sql').trigger('click')
              },
              oncontextmenu: function(event) {
                var top
                $('#tablelist-context').toggle()
                var height = $('#tablelist-context').height()
                Tablelist.context_table = item
                if (window.innerHeight - event.clientY < height) {
                  top = event.clientY - 20 - height
                } else {
                  top = event.clientY - 20
                  }
                $('ul#tablelist-context').css({
                  top: top,
                  left: event.clientX
                })
                return false
              }
            }, item)
          })
        ])
    ]
  }
}

export default Tablelist

import Codefield from './codefield.js'
