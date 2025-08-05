
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
      icon: "nf-md-crosshairs_gps",
      text: '<img class="h1 v-mid" style="margin-left: -3px; margin-bottom: 3px;" src="/static/css/img/urdr.png">',
      addr: '/',
      branch: ds.branch
    })

    if (ds.cnxn) {
      items.push({
        icon: ['sqlite', 'duckdb'].includes(ds.base.system) ? "nf-md-folder_outline" : "nf-fa-server",
        text: ds.cnxn,
        addr: '/' + ds.cnxn
      })
    }

    if (ds.path || param.base) {
      dirs = param.base && !ds.file ? param.base.split('/').slice(0, -1) 
        : ds.path ? ds.path.split('/')
        : []
      path = [ds.cnxn] 
      for (const dir of dirs) {
        path.push(dir)
        items.push({
          icon: 'nf-md-folder_outline',
          text: dir,
          addr: '/' + path.join('/')
        })
      }
    }

    if (ds.file && ds.file.type == 'file') {
      items.push({
        icon: "nf-fa-file",
        text: ds.file.name,
        addr: '/' + ds.cnxn + '/' + ds.file.path
      })
    } else if (ds.base && ds.base.name && ds.type != 'file' && ds.type != 'dblist') {
      items.push({
        icon: "nf-md-database_outline",
        text: ds.base.name.split('/').at(-1),
        addr: '/' + ds.cnxn + '/' + ds.base.name
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
            class: 'fw3 white no-underline underline-hover f4 pointer',
            href: item.addr,
            onclick: function(e) {
              m.route.set(item.addr)
              e.preventDefault
            }
          }, [m('i', {
            class: [
              'relative nf ' + item.icon,
              idx === 0 ? 'f4 white' : 'f6 mr2 white',
            ].join(' '),
            style: item.icon == 'nf-md-crosshairs_gps' ? 'bottom: 0.75px'
              : item.icon !== 'table' ? 'bottom: 2px;' : ''
          }), m.trust(item.text)]),
          !item.branch || item.branch == 'master'
            ? ''
            : m('span', { class: 'light-silver' }, [
              m('i', { class: 'nf nf-fa-code_fork ml2' }),
              ds.branch,
            ]),
          idx == sti.length - 1
            ? ''
            : m('i', { class: 'nf nf-oct-chevron_right f5 fw3 ml1 mr1' })
        ]
      }),
    ])
  }
}

export default Breadcrumb
