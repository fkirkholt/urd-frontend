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
import Diagrampanel from './diagrampanel.js'
import Diagram from './diagram'
import SQLpanel from './sqlpanel'
import KDRS_dialog from './kdrs.js'
import Export_dialog from './export.js'
import Import_dialog from './import.js'
import Convert_dialog from './convert.js'
import Pwd_dialog from './password.js'
import config from './config'
import login from './login.js'
import Grid from './grid.js'
import Record from './record.js'


m.route.prefix = "#"
m.route($('#main')[0], '/', {
  "/": {
    onmatch: function(args, requestedPath) {
      return home
    }
  },
  "/:cnxn": {
    onmatch: function(args, requestedPath) {
      ds.type = 'dblist'
      ds.cnxn = args.cnxn
      config.tab = 'databases'
      ds.path = null
      ds.file = null
      home.load_databases()
      return home
    }
  },
  "/:cnxn/:base.../!data": {
    onmatch: function(args, requestedPath) {
      ds.cnxn = args.cnxn
      Grid.url = ''
      var base_name = args.base
      ds.path = base_name.substring(0, base_name.lastIndexOf('/'))
      if (ds.table && ds.table.dirty) {
        if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
          m.route.set(Grid.url)
        }
      }

      config.tab = 'data'
      ds.type = 'data'
      ds.load_database(base_name)

      return Contents
    }
  },
  "/:cnxn/:base.../!data/:table": {
    onmatch: function(args, path) {
      ds.cnxn = args.cnxn
      config.tab = 'data'
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
  },
  "/:cnxn/:base.../!diagram": {
    onmatch: function(args, requestedPath) {
      config.tab = 'diagram'
      ds.type = 'diagram'
      if (args.base != ds.base.name) {
        ds.load_database(args.base)
      }
      delete ds.table
      Diagram.def = ""

      return Diagrampanel
    }
  },
  "/:cnxn/:base.../!diagram/:table": {
    onmatch: function(args, requestedPath) {
      var base_name = args.base
      config.tab = 'diagram'
      ds.type = 'diagram'
      if (base_name != ds.base.name) {
        ds.load_database(base_name)
      }
      Diagram.def = ""
      config.tab = 'diagram'

      return Diagrampanel
    }
  },
  "/:cnxn/:base.../!sql": {
    onmatch: function(args, requestedPath) {
      var base_name = args.base
      config.tab = 'sql'
      ds.type = 'sql'
      ds.load_database(base_name)
      config.tab = 'sql'
      return SQLpanel
    }
  },
  "/:cnxn/:base...": {
    onmatch: function(args, requestedPath) {
      ds.cnxn = args.cnxn
      ds.type = 'file'
      Grid.url = ''
      var base_name = args.base
      if (ds.table && ds.table.dirty) {
        if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
          m.route.set(Grid.url)
        }
      }

      m.request({
        method: 'get',
        url: 'file',
        params: {
          cnxn: args.cnxn,
          path: base_name,
        }
      }).then(function(result) {
        if (result.type == 'dir') {
          if (args.base != ds.path) {
            ds.path = base_name
            ds.file = result
            home.load_databases()
          }
        } else {
          if (ds.file && ds.file.dirty) {
            alert('Ikke lagret')
            return false
          }
          var dir = base_name.substring(0, base_name.lastIndexOf('/'))
          if (ds.path != dir) {
            ds.path = dir
            home.load_databases()
          }
          ds.file = result
        }
      })

      return home
    }
  },
})

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
