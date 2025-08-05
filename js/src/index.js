import m from 'mithril'
window.m = m
import $ from 'cash-dom'
$(function () {
  $('html').addClass ( 'dom-loaded' );
});
window.$ = $
import { default as ds } from './datastore.js'
window.ds = ds
window.fix_circular = function () {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
}

import Contents from './contents.js'
import header from './header.js'
import home from './home.js'
import Tabbar from './tabbar.js'
import Datapanel from './datapanel.js'
import KDRS_dialog from './kdrs.js'
import Export_dialog from './export.js'
import Import_dialog from './import.js'
import Convert_dialog from './convert.js'
import Pwd_dialog from './password.js'
import config from './config'
import login from './login.js'
import Grid from './grid.js'
import Record from './record.js'


m.route.prefix = ""
m.route($('#main')[0], '/', {
  "/": {
    onmatch: function(args, requestedPath) {
      check_dirty()
      ds.cnxn = null
      ds.dblist = null
      ds.table = null      
      ds.file = null
      ds.type = 'login'
      $('#login').show()
      return home
    }
  },
  "/:cnxn": {
    onmatch: function(args, requestedPath) {
      check_dirty()
      ds.type = 'dblist'
      ds.cnxn = args.cnxn
      config.tab = 'databases'
      ds.path = null
      ds.file = null
      home.load_databases()
      return home
    }
  },
  "/:cnxn/:base...": {
    onmatch: function(args, path) {
      var base_name = args.base
      var query = m.parsePathname(path)
      ds.cnxn = args.cnxn
      ds.type = 'file'
      // Grid.url = ''
      check_dirty()

      if ('table' in query.params) {
        config.tab = config.tab || 'data'
        ds.type = 'table'

        var grid_path = path
        var query = m.parsePathname(path)

        // remove `index` from grid_path so that grid is not
        // reloaded because of change in url when another record is shown
        if ('index' in query.params) {
          delete query.params.index
          grid_path = query.path
          if (Object.keys(query.params).length) {
            grid_path += '?' + m.buildQueryString(query.params)
          }
        }

        if (
          ds.table && ds.table.dirty && Grid.url !== grid_path &&
          !confirm('You have unsaved data. Continue?')
        ) {
          m.route.set(Grid.url)
        } else {
          console.log('Grid.url', Grid.url)
          console.log('grid_path', grid_path)
          if (Grid.url != grid_path) {
            if (ds.table) {
              ds.table.records = []
              ds.table.grid.columns = []
              m.redraw()
            }
            Grid.load(args)
            Grid.url = grid_path
          } else {
            // Load correct record when index parameter changes
            if ('index' in args) {
              let index = Number(args.index)
              Record.select(ds.table, index)
            }
          }

          return Datapanel
        }
      }

      return m.request({
        method: 'get',
        url: '/file',
        params: {
          cnxn: args.cnxn,
          path: base_name,
        }
      }).then(function(result) {
        if (['sqlite', 'duckdb', 'server'].includes(result.type)) {
          ds.cnxn = args.cnxn
          Grid.url = ''
          ds.path = base_name.substring(0, base_name.lastIndexOf('/'))
          if (ds.table && ds.table.dirty) {
            if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
              m.route.set(Grid.url)
            }
          }

          config.tab = 'data'
          ds.type = 'database'
          ds.load_database(base_name)

          return Contents

        } else if (result.type == 'dir') {
          config.tab = 'databases'
          if (args.base != ds.path || ds.dblist.grep) {
            ds.path = base_name
            ds.file = result
            home.load_databases()

            return home
          }
        } else {
          if (result.type == null) {
            if (confirm("File doesn't exist. Create it?")) {
              home.save_file(base_name, '')
              ds.file = {
                path: base_name,
                name: base_name.substring(base_name.lastIndexOf('/')),
                content: '',
                type: 'file'
              }
            } else {
              history.back();
            }
          } else {
            ds.file = result
          }
          config.tab = 'databases'
          var dir = base_name.substring(0, base_name.lastIndexOf('/'))
          if (!ds.dblist || ((ds.path || '') != dir)) {
            ds.path = dir
            home.load_databases()
          }

          if (ds.file.path.endsWith('.md')) {
            m.request({
              method: 'get',
              url: '/backlinks',
              params: {
                cnxn: args.cnxn,
                path: ds.file.path,
              }
            }).then(function(result) {
              ds.file.backlinks = result
            })
          }

          return home
        }
      })
    }
  },
})

function check_dirty() {
  if ((ds.table && ds.table.dirty) || (ds.file && ds.file.dirty)) {
    if (config.autosave || confirm('Du har ulagrede data. Vil du lagre?')) {
      if (ds.file && ds.file.dirty) {
        if (home.editor) {
          home.save_file(ds.file.path, home.editor.get_value())
        }
      } else {
        Grid.save()
      }
    }
  }
}

window.onbeforeunload = function(event) {
  if (ds.table && ds.table.dirty) {
    event.returnValue = "Du har ulagrede endringer i listen din"
  }
}

var $header = $('#header')
m.mount($header[0], header)

var $kdrs = $('#kdrs-dialog')
m.mount($kdrs[0], KDRS_dialog)

var $export = $('#export-dialog')
m.mount($export[0], Export_dialog)

var $import = $('#import-dialog')
m.mount($import[0], Import_dialog)

var $convert = $('#convert-dialog')
m.mount($convert[0], Convert_dialog)

var $password = $('#pwd-dialog')
m.mount($password[0], Pwd_dialog)

var $config = $('#preferences')
m.mount($config[0], config)

var $login = $('#login')
m.mount($login[0], login)

var $tabbar = $('#tabbar')
m.mount($tabbar[0], Tabbar)
