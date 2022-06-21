var mermaid
var config = require('./config')
var get = require('just-safe-get')

var Diagram = {
    def: "",
    root: "",
    type: "",

    show_tooltip: function(evt) {
        let tooltip = document.getElementById("tooltip")
        var svg_width = $('svg').width()
        var svg_height = $('svg').height()
        var max_width = parseInt($('svg').css('max-width'))
        var text = $(evt.target).parent().attr('id')
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
        import(/* webpackChunkName: "mermaid" */ 'mermaid').then(module => {
            mermaid = module.default
            $('body').on('click', 'svg g', function() {
                var table_name = $(this).attr('id')

                Diagram.type = 'table'
                Diagram.root = table_name

                $('#mermaid').html(Diagram.def).removeAttr('data-processed')
                mermaid.init(undefined, $("#mermaid"))
                $('#mermaid svg g').addClass('pointer')
                $('#mermaid svg').addClass('center')

                m.redraw()
            })
            $('body').on('mouseenter', '#mermaid svg g rect', Diagram.show_tooltip)
                .on('mouseout', '#mermaid svg g rect', Diagram.hide_tooltip)
        })
    },

    onbeforeupdate: function(vnode) {
        if (Diagram.type == 'module') {
            var def = ['erDiagram']
            Object.values(ds.base.contents[Diagram.root].subitems).map(function(node) {
                Diagram.draw_foreign_keys_node(node, def)
            })
            Diagram.def = def.join("\n")
        } else if (Diagram.type == 'table') {
            Diagram.def = Diagram.get_table_def(ds.base.tables[Diagram.root])
        } else if (Diagram.type == 'descendants') {
            Diagram.def = Diagram.get_table_def(ds.base.tables[Diagram.root], [])
        }
    },

    onupdate: function(vnode) {
        if (this.def !== "") {
            mermaid.mermaidAPI.initialize({
                securityLevel: 'loose',
                themeCSS: 'g.classGroup text{font-family: Consolas, monaco, monospace;}'
            })
            $('#mermaid').html(this.def).removeAttr('data-processed')
            mermaid.init(undefined, $("#mermaid"))

            $('#mermaid svg g').addClass('pointer')
            $('#mermaid svg').addClass('center')
        }

        $('svg g.classGroup text tspan.title').each(function(index) {
            var table_name = $(this).html()
            if (ds.base.tables[table_name].type == 'reference') {
                $(this).addClass('i')
            }
        })
    },

    get_table_def: function(table, tablenames) {
        var recursive = false
        if (typeof tablenames == 'object') {
            recursive = true
            tablenames.push(table.name)
        }
        var def = []
        var def2

        if (!recursive || tablenames.length == 1) {
            def.push("erDiagram")
            def.push(table.name + ' {')
            if (table.fields) {
                var n = 0
                Object.keys(table.fields).map(function(alias) {
                    var field = table.fields[alias];
                    if (!field.hidden) {
                        n++
                        if (n>10) {
                            return
                        }
                        def.push(field.datatype + ' ' + field.name);
                    }
                });
            }
            def.push('}')
        }

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
            if (false && recursive && !tablenames.includes(fk.table)) {
                def2 = Diagram.get_table_def(fk_table, tablenames)
                def = def.concat(def2)
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
            if (rel.use && rel.use < config.threshold) {
                skip = true
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
            if (recursive && !tablenames.includes(rel.table)) {
                def2 = Diagram.get_table_def(rel_table, tablenames)
                def = def.concat(def2)
            }
        })

        return def.join("\n")
    },

    draw_class: function(table) {
        var def = ["classDiagram"]
        def.push("class " + table.name)

        if (table.rowcount) {
            def.push(table.name + ' : ' + 'count(' + table.rowcount+ ')')
        }

        Object.keys(table.fields).map(function(alias) {
            var field = table.fields[alias]
            var sign = field.hidden ? '# ' : field.nullable ? '- ' : '+ '
            // number of invicible spaces to align column names
            var count = 6 - field.datatype.length
            def.push(table.name + ' : ' + sign + field.datatype + '\u2000'.repeat(count) + ' ' + field.name)
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

    draw_foreign_keys_node: function(node, def) {
        var item = node.item ? node.item : node
        var object = get(ds.base, item, ds.base.tables[item])
        Diagram.draw_foreign_keys(object, def, ds.base.contents[module])

        if (!node.subitems) {
            return
        }

        Object.values(node.subitems).map(function(subnode) {
            Diagram.draw_foreign_keys_node(subnode, def)
        })
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
        path = Diagram.get_path(table, path)

        if (path) {
            path = path.filter(function(line) {
                if (Diagram.def.indexOf(line) !== -1) return false
                // Check reversed relation
                if (Diagram.def.indexOf(line.replace('<--', '-->').split(" ").reverse().join(" ")) !== -1) return false

                return true
            })

            Diagram.def += "\n" + path.join("\n")
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

            if (path.includes(table.name + symbol + '--{o ' + fk.table + ' : ' + fk_field_name)) {
                return
            }

            var fk_table = ds.base.tables[fk.table]
            if (fk_table.hidden) return

            new_path.push(table.name + symbol + '--o{ ' + fk.table + ' : ' + fk_field_name)

            if (fk.table == Diagram.root) {
                // merge found_path and new_path and remove duplicates
                found_path = Array.from(new Set(found_path.concat(new_path)))

                return
            } else {
                new_path = Diagram.get_path(fk_table, new_path)
                if (new_path) {
                    found_path = Array.from(new Set(found_path.concat(new_path)))

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

            if (fk.table == Diagram.root) {
                found_path = found_path.concat(new_path)
                return new_path
            } else {
                if (fk_table.type == 'reference') return

                new_path.push(fk.table + symbol + '--o{ ' + table.name + ' : ' + fk_field_name)

                new_path = Diagram.get_path(fk_table, new_path)
                if (new_path) {
                    found_path = Array.from(new Set(found_path.concat(new_path)))

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
        }, Diagram.def)
    }
}

module.exports = Diagram
