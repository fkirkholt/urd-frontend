import { deepmerge } from './utils.js'
import Convert from 'ansi-to-html'

const Filetree = {

  context_file: null,

  buildTree: function(recs, path='') {
    const tree = { name: "root", children: {} }
    // output from ripgrep has ansi codes
    const convert = new Convert()
  
    recs.forEach(rec => {
      const filepath = (path ? path + '/' : '') + convert.toHtml(rec.columns.label)
      const parts = filepath.split('/')
      const desc = rec.columns.description
      let currentLevel = tree.children
  
      parts.forEach((part, idx) => {
        const lastpart = idx == parts.length - 1
        if (!currentLevel[part]) {
          currentLevel[part] = { 
            name: part, 
            path: parts.slice(0, idx + 1).join('/'),
            type: lastpart ? rec.columns.type : 'dir',
            size: lastpart ? rec.columns.size : null,
            desc: lastpart && desc ? convert.toHtml(desc) : null,
            children: {}
          }
        }
        // Move pointer deeper in tree
        currentLevel = currentLevel[part].children
      })
    })

    return tree
  },

  collapseTree: function(node) {
    const childKeys = Object.keys(node.children)
  
    childKeys.forEach(key => {
      this.collapseTree(node.children[key])
    })
  
    if (childKeys.length === 1) {
      const childKey = childKeys[0]
      const child = node.children[childKey]
  
      // Check if child is a folder
      if (Object.keys(child.children).length > 0) {
        node.name = `${node.name}/${child.name}`
        node.children = child.children
        node.path = child.path
  
        // Run check again to see if next level also can be collapsed
        this.collapseTree(node)
      }
    }
    return node
  },

  view: (vnode) => {
    const node = vnode.attrs.node
    const children = Object.values(node.children || {})
    node.expanded = node.expanded || false

    if (node.deleted) return

    if (
      Object.keys(node.children).length == 1 && 
      Object.keys(Object.values(node.children)[0].children).length)
    {
      const subnode = Object.values(node.children)[0]
      subnode.name = node.name + '/' + subnode.name
      return
    }

    return m("li", {
      style: node.desc ? 'max-width: 500px' : ''
    }, [
      m('i.nf.f7', {
        class: node.type == 'dir' && node.expanded ? "nf-oct-chevron_down mr1"
          : node.type == 'dir' ? "nf-oct-chevron_right mr1" : '',
        style: "margin-left: -40px",
        onclick: function() {
          node.expanded = !node.expanded
          if (Object.keys(node.children).length == 0) {
            return m.request({
              method: 'get',
              url: '/file_list',
              params: {cnxn: ds.cnxn, path: node.path} 
            })
            .then(function(result) {
              const tree = home.buildTree(result.data.records, node.path)
              home.treeData = deepmerge(home.treeData, tree)
            })
          }
        }
      }),
      m('i.nf', { 
        class: node.type == 'dir' ? "nf-md-folder_outline" 
          : node.type == 'database' ? "nf-oct-database ml3"
          : "nf-oct-file ml3"
      }),
      node.rename ? m('input', {
        value: node.name,
        class: 'ml1 pl1',
        style: "width:" + node.width + 'px;',
        oncreate: (vnode) => {
          vnode.dom.focus()
        },
        onkeydown: (e) => {
          if (e.key === 'Escape') {
            node.rename = false
          }
        },
        onchange: function(event) {
          var orig = { name: node.name, path: node.path }
          var from = node.path
          var to = from.replace(node.name, '') + event.target.value
          
          node.rename = false
          node.name = event.target.value
          node.path = to
          m.request({
            method: 'put',
            url: '/file_rename',
            params: {
              cnxn: ds.cnxn,
              src: from,
              dst: to
            },
          })
          .then(function(result) {
            if (result.success && ds.file && ds.file.path == from) {
              m.route.set('/' + ds.cnxn + '/' +  to)
            }
          })
          .catch(function() {
            node.name = orig.name
            node.path = orig.path
          })
        }
      })
      : m("span.ml2", {
        class: [
          "pointer",
          node.size > 100000000 ? 'gray' : '',
          node.type == 'dir' ? 'blue' : '',
          node.type == 'database' ? 'dark-pink' : ''
        ].join(' '),
        onclick: function() {
          const path = ds.dblist.path ? (ds.dblist.path + '/') : ''
          m.route.set('/' + ds.cnxn + '/' + path + node.path)
        },
        oncontextmenu: function(event) {
          var top
          $('#filelist-context').toggle()
          var height = $('#filelist-context').height()
          Filetree.context_file = node
          node.width = event.target.parentNode.offsetWidth - 10
          if (window.innerHeight - event.clientY < height) {
            top = event.clientY - 20 - height
          } else {
            top = event.clientY - 20
          }
          $('ul#filelist-context').css({
            top: top,
            left: event.clientX
          })
          return false
        }
      }, m.trust(node.name.replaceAll('_', '_<wbr>'))),
      node.type == 'dir' ? m("ul.list", {
        class: node.expanded ? '' : 'dn'
      }, children.flatMap(function(child, idx) {
        if (idx == 100 && node.trunc !== false) {
          return m('span', {
            class: 'underline pointer',
            onclick: function() {
              node.trunc = false
            }
          }, 'Show all')
        } else if (idx > 100 && node.trunc !== false) {
          return []
        }
        return m(Filetree, { node: child })
      }))
      : null,
      !node.desc || (ds.file && ds.file.type != 'dir') ? null : m('p.mt1.mb1', {
        class: "mt1 mb1 ml4 pl2"
      }, m.trust(node.desc))
    ])
  }
  
}

export default Filetree
