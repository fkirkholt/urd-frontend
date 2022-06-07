var mermaid = require('mermaid').default
var _union = require('lodash/union')
var _repeat = require('lodash/repeat')

diagram = {
    def: "",
    main_table: "",

    show_tooltip: function(evt) {
        let tooltip = document.getElementById("tooltip")
        var svg_width = $('svg').width()
        var svg_height = $('svg').height()
        var max_width = parseInt($('svg').css('max-width'))
        var text = $(evt.target).parent().attr('id')
        console.log('viser tooltip')
        if (max_width/svg_width > 2) {
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
        $('body').on('click', 'svg g', function() {
            var table_name = $(this).attr('id')
            var table = ds.base.tables[table_name]

            diagram.draw(table)

            $('#mermaid').html(diagram.def).removeAttr('data-processed')
            mermaid.init(undefined, $("#mermaid"))
            $('#mermaid svg g').addClass('pointer')
            $('#mermaid svg').addClass('center')
        })
    },

    onupdate: function(vnode) {
        if (this.def !== "") {
            mermaid.mermaidAPI.initialize({
                securityLevel: 'loose',
                themeCSS: 'g.classGroup text{font-family: Consolas, monaco, monospace;}'
            })
            $('#mermaid').html(this.def).removeAttr('data-processed')
            mermaid.init(undefined, $("#mermaid"))

            console.log('legger til pointer')
            $('#mermaid svg g').addClass('pointer')
            console.log('legger til onmousénter')
            $('#mermaid svg g rect').attr('onmouseenter', "diagram.show_tooltip(evt);")
                .attr('onmouseout', "diagram.hide_tooltip()")
            $('#mermaid svg').addClass('center')
        }

        $('svg g.classGroup text tspan.title').each(function(index) {
            var table_name = $(this).html()
            if (ds.base.tables[table_name].type == 'reference') {
                $(this).addClass('i')
            }
        })
    },

    draw: function(table) {
        var def = ["erDiagram"]
        diagram.main_table = table.name

        def.push(table.name + ' {')
        if (table.fields) {
            Object.keys(table.fields).map(function(alias) {
                var field = table.fields[alias]
                var sign = ''
                def.push(sign + field.datatype + ' ' + field.name)
            })
        }
        def.push('}')

        Object.keys(table.foreign_keys).map(function(alias) {
            var fk = table.foreign_keys[alias]
            var field_name = fk.foreign[fk.foreign.length -1]
            var field = table.fields ? table.fields[field_name] : null
            var label = field && field.label ? field.label : alias
            var fk_table = ds.base.tables[fk.table]
            var line = field && field.hidden ? '..' : '--'
            var symbol = field && field.nullable ? ' o|' : ' ||'
            def.push(fk.table + symbol + line + ' o{' + table.name + ' : ' + field_name)
            if (fk_table === undefined) return
            // def.push(fk.table + ' : pk(' + fk_table.primary_key.join(', ') + ')')
            if (fk_table.rowcount && fk.table != table.name) {
                // def.push(fk.table + ' : count(' + fk_table.rowcount + ')')
            }
        })

        var rel_tables = []
        Object.keys(table.relations).map(function(alias) {
            var rel = table.relations[alias]
            rel_tables.push(rel.table)
        })

        Object.keys(table.relations).map(function(alias) {
            var rel = table.relations[alias]
            var rel_table = ds.base.tables[rel.table]
            var skip = false
            if (true) {
                Object.keys(rel_table.foreign_keys).map(function(alias) {
                    var rel_fk = rel_table.foreign_keys[alias]
                    if (rel_tables.includes(rel_fk.table)) {
                        skip = true
                    }
                })
            }
            if (skip) {
                return
            }
            var fk_field_name = rel.foreign[rel.foreign.length -1]
            var fk_field = ds.base.tables[rel.table].fields
                ? ds.base.tables[rel.table].fields[fk_field_name]
                : null
            var symbol = fk_field && fk_field.nullable ? ' o|' : ' ||'
            if (rel.table == table.name) return

            var line  = rel.hidden ? '..' : '--'
            def.push(table.name + symbol + line + 'o{ ' + rel.table + ' : ' + fk_field_name)

            if (rel_table.rowcount) {
                def.push(rel.table + ' : count(' + rel_table.rowcount + ')')
            }
        })

        this.def = def.join("\n")
    },

    draw_class: function(table) {
        var def = ["classDiagram"]
        def.push("class " + table.name)

        diagram.main_table = table.name

        if (table.rowcount) {
            def.push(table.name + ' : ' + 'count(' + table.rowcount+ ')')
        }

        Object.keys(table.fields).map(function(alias) {
            var field = table.fields[alias]
            var sign = field.hidden ? '# ' : field.nullable ? '- ' : '+ '
            // number of invicible spaces to align column names
            var count = 6 - field.datatype.length
            def.push(table.name + ' : ' + sign + field.datatype + _repeat('\u2000', count) + ' ' + field.name)
        })

        Object.keys(table.foreign_keys).map(function(alias) {
            var fk = table.foreign_keys[alias]
            var field = table.fields[alias]
            var label = field && field.label ? field.label : alias
            var fk_table = ds.base.tables[fk.table]
            var line = field && field.hidden ? '..' : '--'
            def.push(fk.table + ' <' + line + ' ' + table.name + ' : ' + label)
            if (def.includes('class ' + fk.table)) return
            if (fk_table === undefined) return
            def.push('class ' + fk.table)
            def.push(fk.table + ' : pk(' + fk_table.primary_key.join(', ') + ')')
            if (fk_table.rowcount && fk.table != table.name) {
                def.push(fk.table + ' : count(' + fk_table.rowcount + ')')
            }
        })

        Object.keys(table.relations).map(function(alias) {
            var rel = table.relations[alias]
            if (rel.table == table.name) return

            var line  = rel.hidden ? '..' : '--'
            def.push(table.name + ' <' + line + ' ' + rel.table)

            var rel_table = ds.base.tables[rel.table]
            if (def.includes('class ' + rel.table)) return
            def.push('class ' + rel.table)
            if (rel_table.rowcount) {
                def.push(rel.table + ' : count(' + rel_table.rowcount + ')')
            }
        })

        this.def = def.join("\n")
    },

    draw_foreign_keys: function(table, def, module) {
        if (table.hidden) return
        Object.keys(table.foreign_keys).map(function(alias) {
            var fk = table.foreign_keys[alias]
            var field_name = fk.foreign.slice(-1)[0]
            var field = table.fields[field_name]
            if (field.hidden) return
            var fk_table = ds.base.tables[fk.table]
            if (fk_table.hidden) return
            // if (Object.values(module.subitems).indexOf('tables.' + fk.table) == -1) return
            var symbol = field.nullable ? ' o|' : ' ||'
            def.push(fk.table + symbol + '--o{ ' + table.name + ' : ' + field.name)
        })
    },

    add_path: function(table) {
        var path = []
        var level = 0
        path = diagram.get_path(table, path)

        if (path) {
            path = path.filter(function(line) {
                if (diagram.def.indexOf(line) !== -1) return false
                // Check reversed relation
                if (diagram.def.indexOf(line.replace('<--', '-->').split(" ").reverse().join(" ")) !== -1) return false

                return true
            })

            this.def += "\n" + path.join("\n")
        }
    },


    get_path: function(table, path) {

        // TODO: Bør kanskje finne annen måte enn å hardkode dette
        if (path.length > 3) {
            return false
        }

        var new_path
        var found_path = []

        Object.keys(table.relations).map(function(fk_name) {

            // make a copy of path
            new_path = path.slice()

            var fk = table.relations[fk_name]
            var fk_field_name = fk.foreign[fk.foreign.length -1]
            var fk_field = ds.base.tables[fk.table].fields
                ? ds.base.tables[fk.table].fields[fk_field_name]
                : null
            var symbol = fk_field && fk_field.nullable ? ' |o' : ' ||'

            if (path.inculdes(table.name + symbol + '--{o ' + fk.table + ' : ' + fk_field_name)) {
                return
            }

            var fk_table = ds.base.tables[fk.table]
            if (fk_table.hidden) return

            new_path.push(table.name + symbol + '--o{ ' + fk.table + ' : ' + fk_field_name)

            if (fk.table == diagram.main_table) {
                found_path = _union(found_path, new_path)

                return
            } else {
                new_path = diagram.get_path(fk_table, new_path)
                if (new_path) {
                    found_path = _union(found_path, new_path)

                    return new_path
                }
            }
        })

        Object.keys(table.foreign_keys).map(function(fk_name) {
            new_path = path.slice()
            var fk = table.foreign_keys[fk_name]
            var fk_field_name = fk.foreign[fk.foreign.length -1]
            var fk_field = table.fields ? table.fields[fk_field_name] : null
            var symbol = fk_field && fk_field.nullable ? ' |o' : ' ||'

            if (path.includes(fk.table + symbol + '--o{ ' + table.name + ' : ' + fk_field_name)) {
                return
            }
            var fk_table = ds.base.tables[fk.table]

            if (fk_table.hidden) return

            if (fk.table == diagram.main_table) {
                found_path = found_path.concat(new_path)
                return new_path
            } else {
                if (fk_table.type == 'reference') return

                new_path.push(fk.table + symbol + '--o{ ' + table.name + ' : ' + fk_field_name)

                new_path = diagram.get_path(fk_table, new_path)
                if (new_path) {
                    found_path = _union(found_path, new_path)

                    return new_path
                }
            }
        })

        return (found_path.length) ? found_path : false
    },

    view: function() {
        return m('div.mermaid', {
            id: "mermaid",
            class: "flex flex-grow flex-column overflow-auto w-100"
        }, this.def)
    }
}

module.exports = diagram
