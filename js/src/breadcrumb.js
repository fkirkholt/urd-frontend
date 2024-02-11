
module.exports = {

  get_items: function() {
    var items = []
    var param = m.route.param()
    var systems = {
      mariadb: 'MariaDB',
      mysql: 'MySQL',
      mssql: 'SQL Server',
      postgresql: 'PostgreSQL',
      sqlite: 'SQLite',
      duckdb: 'DuckDB'
    }

    items.push({
      icon: "icon-crosshairs",
      text: ds.base.system ? systems[ds.base.system] : "Urðr",
      addr: '',
      branch: ds.branch
    })

    if (param.base) {
      items.push({
        icon: "fa-database",
        text: ds.base.label,
        addr: ds.base.name + '/data'
      })
    }

    if (param.table && ds.table) {
      items.push({
        icon: "fa-table",
        text: ds.table.label,
        addr: ds.base.name + '/data/' + ds.table.name
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
              'relative fa ' + item.icon,
              idx === 0 ? 'f4 white' : 'f6 mr2 white',
            ].join(' '),
            style: item.icon !== 'table' ? 'bottom: 2px;' : ''
          }), item.text]),
          !item.branch || item.branch == 'master'
            ? ''
            : m('span', { class: 'light-silver' }, [
              m('i', { class: 'fa fa-code-fork ml2' }),
              ds.branch,
            ]),
          idx == sti.length - 1
            ? ''
            : m('i', { class: 'fa fa-angle-right f3 fw3 ml2 mr2' })
        ]
      }),
    ])
  }
}
