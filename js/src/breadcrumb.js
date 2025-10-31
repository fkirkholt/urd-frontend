
var Breadcrumb = {

  get_items: function() {
    var items = []
    var param = m.route.param()
    var dirs
    var path
    var system = ds.dblist ? ds.dblist.system : ds.base.system
    var plug_img = ds.cnxn ? 'plug-connected.png' : 'plug-connect.png'
    var urdr_img = ds.cnxn ? 'urdr-glow-blue.png' : 'urdr.png'
    var urdr_class = ds.cnxn ? '' : 'invert-03' 

    items.push({
      icon: "",
      text: '<img class="invert-03" width="29px" style="margin-bottom: -3.9px" src="/static/css/img/' + plug_img + '"><img class="v-mid ' + urdr_class + '" style="margin-left: -5px; margin-bottom: 3px; height: 1.25em" src="/static/css/img/' + urdr_img + '">',
      addr: '/',
      branch: ds.branch
    })

    if (ds.cnxn) {
      items.push({
        icon: ['sqlite', 'duckdb'].includes(system) ? "nf-md-folder_outline" : "nf-fa-server",
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

    if (ds.dblist && ds.dblist.grep) {
      items.push({
        icon: "nf-fa-search",
        text: ds.dblist.grep,
        addr: '/' + ds.cnxn + (ds.path ? '/' + ds.path : '') + '?grep=' + ds.dblist.grep
      })
    }

    if (ds.file && ds.file.type != 'dir') {
      items.push({
        icon: "nf-fa-file",
        text: ds.file.name,
        addr: '/' + ds.cnxn + '/' + ds.file.path
      })
    }
    
    if (ds.base && ds.base.name && ds.type != 'file' && ds.type != 'dblist') {
      items.push({
        icon: "nf-md-database_outline",
        text: ds.base.name.split('/').at(-1),
        addr: '/' + ds.cnxn + '/' + ds.base.name
      })
    }

    if (param.table && ds.table) {
      items.push({
        icon: ds.table.type == 'list' ? "nf-fa-list" : "nf-md-table",
        text: ds.table.label,
        addr: '/' + ds.cnxn + '/' + ds.base.name + '?table=' + ds.table.name
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
