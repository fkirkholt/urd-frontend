var mermaid
var config = require('./config')
var get = require('just-safe-get')

var Diagram = {
  def: "",
  root: "",
  type: "",

  // Show tooltip for boxes on mouseover when text is too small to read
  show_tooltip: function(evt) {
    let tooltip = document.getElementById("tooltip")
    var svg_width = $('svg').width()
    var max_width = parseInt($('svg').css('max-width'))
    var text = $(evt.target).next('text').text()
    if (max_width / svg_width > 2) {
      tooltip.innerHTML = text
      tooltip.style.display = "block"
      tooltip.style.left = evt.pageX + 10 + 'px'
      tooltip.style.top = evt.pageY + 10 + 'px'
    }
  },

  hide_tooltip: function() {
    var tooltip = document.getElementById("tooltip")
    tooltip.style.display = "none"
  },

  oninit: function(vnode) {
    import(/* webpackChunkName: "mermaid" */ 'mermaid').then(module => {
      mermaid = module.default

      // Show diagram for table when clicking on table box
      $('body').on('click', 'svg g', function() {
        var table_name = $(this).children('text').text()

        Diagram.type = 'table'
        Diagram.root = table_name

        m.redraw()
      })

      $('body')
        .on('mouseenter', '#mermaid svg g rect', Diagram.show_tooltip)
        .on('mouseout', '#mermaid svg g rect', Diagram.hide_tooltip)
    })
  },

  onbeforeupdate: function(vnode) {
    // Define diagram based on type before redraw
    // This makes the diagram respond to changes in threshold value
    var def = ['erDiagram']
    var root_table = ds.base.tables[Diagram.root]
    if (Diagram.type == 'module') {
      var subitems = ds.base.contents[Diagram.root].subitems
      Object.values(subitems).map(function(node) {
        Diagram.draw_fkeys_node(node, def)
      })
      Diagram.def = def.join("\n")
    } else if (Diagram.type == 'table') {
      Diagram.def = Diagram.get_table_def(root_table, [])
    }
  },

  onupdate: function(vnode) {
    if (this.def !== "") {
      // Redraw the graph if it's changed
      mermaid.mermaidAPI.initialize({
        securityLevel: 'loose',
        themeCSS: 'g.classGroup text{font-family: Consolas, monaco, monospace;}'
      })
      $('#mermaid').html(this.def).removeAttr('data-processed')
      mermaid.run({
        querySelector: '#mermaid',
        postRenderCallback: function() {
          $('#mermaid svg g').addClass('pointer')
          $('#mermaid svg').addClass('center')
        },
        suppressErrors: true,
      });

    }

    // Title for reference tables should be in italic
    $('svg g.classGroup text tspan.title').each(function(index) {
      var table_name = $(this).html()
      if (ds.base.tables[table_name].type == 'reference') {
        $(this).addClass('i')
      }
    })
  },

  // Define ER-diagram for table with relations. `tablenames` are used for
  // recursion to show not only the direct relations to the table, but all
  // relations connected to this table via other tables as well.
  get_table_def: function(table, tablenames) {
    tablenames.push(table.name)
    // array with definition strings
    var def = []
    // array with definition strings used with recursion
    var def_recur

    // definition for main table
    if (tablenames.length == 1) {
      def.push("erDiagram")
      def.push(table.name + ' {')
      if (table.fields) {
        var n = 0
        // defines first 10 columns (any more would take too much space)
        Object.keys(table.fields).map(function(alias) {
          var field = table.fields[alias];
          if (!field.hidden) {
            n++
            if (n > 10) {
              return
            }
            def.push(field.datatype + ' ' + field.name);
          }
        });
      }
      def.push('}')
    }

    var fk_tables = []
    Object.keys(table.fkeys).map(function(name) {
      var fkey = table.fkeys[name]
      if (fkey.referred_table != table.name) {
        fk_tables.push(fkey.referred_table)
      }
    })

    // Draw belongs-to relations from foreign keys
    Object.keys(table.fkeys).map(function(alias) {
      var fk = table.fkeys[alias]
      var field_name = fk.constrained_columns[fk.constrained_columns.length - 1]
      var field = table.fields ? table.fields[field_name] : null
      var fk_table = ds.base.tables[fk.table]
      var line = field && field.hidden ? '..' : '--'
      var symbol = field && field.nullable ? ' o|' : ' ||'
      var skip = false

      if (fk_table.hidden) {
        skip = true
      }

      if (field_name[0] == '_') {
        skip = true
      }

      // Removes relations that represents grand parents and up
      if (config.simplified_hierarchy) {
        Object.keys(fk_table.relations).map(function(name) {
          var rel_fk = fk_table.relations[name]
          if (fk_tables.includes(rel_fk.table)) {
            skip = true
          }
        })
      }

      if (skip) {
        return
      }

      def.push(fk.table + symbol + line + ' o{' + table.name +
        ' : ' + field_name)
      if (fk_table === undefined) return
      // def.push(fk.table + ' : pk(' + fk_table.pkey.join(', ') + ')')
      if (fk_table.rowcount && fk.table != table.name) {
        // def.push(fk.table + ' : count(' + fk_table.rowcount + ')')
      }


      // Draw relations recursively
      if (config.show_relations == 'all' && !tablenames.includes(fk.table)) {
        def_recur = Diagram.get_table_def(fk_table, tablenames)
        def = def.concat(def_recur)
      }
    })

    var rel_tables = []
    Object.keys(table.relations).map(function(alias) {
      var rel = table.relations[alias]
      if (rel.table != table.name) {
        rel_tables.push(rel.table)
      }
    })

    // Draw has-many relations
    Object.keys(table.relations).map(function(alias) {
      var rel = table.relations[alias]
      var rel_table = ds.base.tables[rel.table]
      var skip = false

      if (rel_table.hidden) {
        skip = true
      }

      // Removes relations that represents grand children and down
      if (config.simplified_hierarchy) {
        Object.keys(rel_table.fkeys).map(function(name) {
          var rel_fk = rel_table.fkeys[name]
          if (rel_tables.includes(rel_fk.table)) {
            skip = true
          }
        })
      }

      // Remove relations which are not used much
      if (rel.use && rel.use < config.threshold) {
        skip = true
      }


      if (skip) {
        return
      }

      var fk_field_name = rel.constrained_columns[rel.constrained_columns.length - 1]
      var fk_field = ds.base.tables[rel.table].fields
        ? ds.base.tables[rel.table].fields[fk_field_name]
        : null
      var symbol = fk_field && fk_field.nullable ? ' o|' : ' ||'
      if (rel.table == table.name) {
        return
      }

      var line = rel.hidden ? '..' : '--'
      def.push(table.name + symbol + line + 'o{ ' + rel.table +
        ' : ' + fk_field_name)

      // Draw relations recursively
      if (
        config.show_relations != 'nearest' &&
        !tablenames.includes(rel.table)
      ) {
        def_recur = Diagram.get_table_def(rel_table, tablenames)
        def = def.concat(def_recur)
      }
    })

    return def.join("\n")
  },

  // Draw foreign key relations for content node
  draw_fkeys_node: function(node, def) {
    var item = node.item ? node.item : node
    var object = get(ds.base, item, ds.base.tables[item])
    Diagram.draw_fkeys(object, def)

    if (!node.subitems) {
      return
    }

    Object.values(node.subitems).map(function(subnode) {
      Diagram.draw_fkeys_node(subnode, def)
    })
  },

  // Draw foreign key relatons
  draw_fkeys: function(table, def) {
    if (table.hidden) return
    Object.keys(table.fkeys).map(function(alias) {
      var fk = table.fkeys[alias]
      var field_name = fk.constrained_columns.slice(-1)[0]
      var field = table.fields[field_name]
      if (field.hidden) return
      var fk_table = ds.base.tables[fk.table]
      if (fk_table.hidden) return
      var symbol = field.nullable ? ' o|' : ' ||'
      def.push(fk.table + symbol + '--o{ ' + table.name + ' : ' + field.name)
    })
  },

  // Add path to specific table in existing diagram
  add_path: function(table) {
    var path = Diagram.get_path(table, [])

    if (path) {
      path = path.filter(function(line) {
        if (Diagram.def.indexOf(line) !== -1) return false
        // Check reversed relation
        if (
          Diagram.def.indexOf(line.replace('<--', '-->')
            .split(" ").reverse().join(" ")) !== -1
        ) {
          return false
        }

        return true
      })

      Diagram.def += "\n" + path.join("\n")
    }
  },


  // Get path from Diagram.root to table.
  // Self referencing function, with `path` accumulating
  get_path: function(table, path) {

    // TODO: Should maybe find another way than hardcoding this
    if (path.length > 3) {
      return false
    }

    var new_path
    var found_paths = []

    Object.keys(table.relations).map(function(fk_name) {

      // make a copy of path TODO: why
      new_path = path.slice()

      var fk = table.relations[fk_name]
      // name of last column in foreign key
      var fk_last_col = fk.constrained_columns[fk.constrained_columns.length - 1]
      var fk_field = ds.base.tables[fk.table].fields
        ? ds.base.tables[fk.table].fields[fk_last_col]
        : null
      var symbol = fk_field && fk_field.nullable ? ' |o' : ' ||'

      // continue if path already includes this relation
      if (
        path.includes(table.name + symbol + '--{o ' + fk.table +
          ' : ' + fk_last_col)
      ) {
        return
      }

      var fk_table = ds.base.tables[fk.table]
      // Don't make paths that goes through hidden tables or
      // reference tables
      if (fk_table.hidden || fk_table.type == 'list') {
        return
      }

      new_path.push(table.name + symbol + '--o{ ' + fk.table +
        ' : ' + fk_last_col)

      if (fk.table == Diagram.root) {
        found_paths.push(new_path)
      } else {
        // goes further in the path in search for Diagram.root
        new_path = Diagram.get_path(fk_table, new_path)
        if (new_path) {
          found_paths.push(new_path)
        }
      }
    })

    Object.keys(table.fkeys).map(function(fk_name) {
      new_path = path.slice()
      var fk = table.fkeys[fk_name]
      var fk_field_name = fk.constrained_columns[fk.constrained_columns.length - 1]
      var fk_field = table.fields ? table.fields[fk_field_name] : null
      var symbol = fk_field && fk_field.nullable ? ' |o' : ' ||'

      if (
        path.includes(fk.table + symbol + '--o{ ' + table.name +
          ' : ' + fk_field_name)
      ) {
        return
      }
      var fk_table = ds.base.tables[fk.table]

      if (fk_table.hidden || fk_table.type == 'list') {
        return
      }

      if (fk.table == Diagram.root) {
        found_paths.push(new_path)
      } else {
        if (fk_table.type == 'list') return

        new_path.push(fk.table + symbol + '--o{ ' + table.name +
          ' : ' + fk_field_name)

        new_path = Diagram.get_path(fk_table, new_path)
        if (new_path) {
          found_paths.push(new_path)
        }
      }
    })

    if (found_paths.length == 0) {
      return false
    }

    shortest_path = found_paths[0]
    $.each(found_paths, function(i, p) {
      if (p.length < shortest_path.length) {
        shortest_path = p
      }
    })

    return path.concat(shortest_path)
  },

  view: function() {
    if (!Diagram.def) {
      return
    }
    return m('div.mermaid', {
      id: "mermaid",
      class: "flex flex-grow flex-column overflow-auto w-100"
    }, Diagram.def)
  }
}

module.exports = Diagram
