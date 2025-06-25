
var Breadcrumb = {

  get_items: function() {
    var items = []
    var param = m.route.param()
    var dirs
    var path
    var systems = {
      mariadb: 'MariaDB',
      mysql: 'MySQL',
      mssql: 'SQL Server',
      oracle: 'Oracle',
      postgresql: 'PostgreSQL',
      sqlite: 'SQLite',
      duckdb: 'DuckDB'
    }

    items.push({
      icon: "ml2",
      text: " URÐR",
      addr: '',
      branch: ds.branch
    })

    items.push({
      icon: ['sqlite', 'duckdb'].includes(ds.base.system) ? "nf-md-folder_outline" : "nf-fa-server",
      text: ds.cnxn,
      addr: ds.cnxn
    })

    if (ds.path || param.base) {
      dirs = param.base && !ds.file ? param.base.split('/').slice(0, -1) 
        : ds.path ? ds.path.split('/')
        : []
      path = [] 
      for (const dir of dirs) {
        path.push(dir)
        items.push({
          icon: 'nf-md-folder_outline',
          text: dir,
          addr: path.join('/')
        })
      }
    }

    if (ds.file && ds.file.type == 'file') {
      items.push({
        icon: "nf-fa-file",
        text: ds.file.name,
        addr: ds.file.path
      })
    } else if (ds.base && ds.base.name && ds.type != 'file' && ds.type != 'dblist') {
      items.push({
        icon: "nf-md-database_outline",
        text: ds.base.name.split('/').at(-1),
        addr: ds.base.name + '/!data'
      })
    }

    if (param.table && ds.table) {
      items.push({
        icon: ds.table.type == 'list' ? "nf-fa-list" : "nf-md-table",
        text: ds.table.label,
        addr: ds.base.name + '/!data/' + ds.table.name
      })
    }

    return items

  },

  view: function(vnode) {
    var param = m.route.param()
    if (!param) return
    var sti = this.get_items()

    return m('div', { class: 'fl' }, [
      sti.map(function(item, idx) {
        return [
          m('a', {
            href: "#/" + item.addr,
            class: 'fw3 white no-underline underline-hover f4'
          }, [m('i', {
            class: [
              'relative nf ' + item.icon,
              idx === 0 ? 'f4 white' : 'f6 mr2 white',
            ].join(' '),
            style: item.icon !== 'table' ? 'bottom: 2px;' : ''
          }), item.text]),
          !item.branch || item.branch == 'master'
            ? ''
            : m('span', { class: 'light-silver' }, [
              m('i', { class: 'nf nf-fa-code_fork ml2' }),
              ds.branch,
            ]),
          idx == sti.length - 1
            ? ''
            : m('i', { class: 'nf nf-oct-chevron_right f3 fw3 ml2 mr2' })
        ]
      }),
    ])
  }
}

export default Breadcrumb
