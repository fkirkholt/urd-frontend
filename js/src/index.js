window.m = require('mithril')
window.$ = require('cash-dom')
window.ds = require('./datastore.js')

var contents = require('./contents.js')
var header = require('./header.js')
var home = require('./home.js')
var tabbar = require('./tabbar.js')
var datapanel = require('./datapanel.js')
var diagrampanel = require('./diagrampanel.js')
var Diagram = require('./diagram')
var SQLpanel = require('./sqlpanel')
var export_dialog = require('./export.js')
var convert_dialog = require('./convert.js')
var config = require('./config.js')
var login = require('./login.js')
var Grid = require('./grid.js')
var Record = require('./record')


m.route.prefix = "#"
m.route($('#main')[0], '/', {
  "/": {
    onmatch: function(args, requestedPath) {
      ds.type = 'dblist'
      return home
    }
  },
  "/:base": {
    onmatch: function(args, requestedPath) {
      var base_name = args.base
      if (ds.table && ds.table.dirty) {
        if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
          m.route.set(Grid.url)
        }
      }

      ds.type = 'contents'
      delete ds.table
      ds.load_database(base_name)

      return contents
    }
  },
  "/:base/data": {
    onmatch: function(args, requestedPath) {
      var base_name = args.base
      if (ds.table && ds.table.dirty) {
        if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
          m.route.set(Grid.url)
        }
      }

      config.tab = 'data'
      ds.type = 'contents'
      delete ds.table
      ds.load_database(base_name)

      return contents
    }
  },
  "/:base/data/:table": {
    onmatch: function(args, path) {
      config.tab = 'data'
      ds.type = 'table'

      var grid_path = path

      if (path.includes('?')) {
        var query_params = m.parseQueryString(path.slice(path.indexOf('?') + 1))
        if ('index' in query_params) {
          delete query_params.index
          grid_path = '/' + args.base + '/data/' + args.table 
          if (Object.keys(query_params).length) {
            grid_path += '?' + m.buildQueryString(query_params)
          }
        }
      }

      if (
        ds.table && ds.table.dirty && Grid.url !== grid_path &&
        !confirm('Du har ulagrede data. Vil du fortsette?')
      ) {
        m.route.set(Grid.url)
      } else {
        if (Grid.url != grid_path) {
          Grid.load(args)
          Grid.url = grid_path
        } else {
          if ('index' in args) {
            Record.select(ds.table, args.index)
            ds.table.selection = args.index
          }
        }

        return datapanel
      }
    }
  },
  "/:base/diagram": {
    onmatch: function(args, requestedPath) {
      config.tab = 'diagram'
      if (args.base != ds.base.name) {
        ds.load_database(args.base)
      }
      delete ds.table
      Diagram.def = ""

      return diagrampanel
    }
  },
  "/:base/diagram/:table": {
    onmatch: function(args, requestedPath) {
      var base_name = args.base
      config.tab = 'diagram'
      if (base_name != ds.base.name) {
        ds.load_database(base_name)
      }
      Diagram.def = ""
      config.tab = 'diagram'

      return diagrampanel
    }
  },
  "/:base/sql": {
    onmatch: function(args, requestedPath) {
      var base_name = args.base
      config.tab = 'sql'
      ds.load_database(base_name)
      config.tab = 'sql'
      return SQLpanel
    }
  }
})

window.onbeforeunload = function(event) {
  if (ds.table && ds.table.dirty) {
    event.returnValue = "Du har ulagrede endringer i listen din"
  }
}

var $header = $('#header')
m.mount($header[0], header)

var $export = $('#export-dialog')
m.mount($export[0], export_dialog)

var $convert = $('#convert-dialog')
m.mount($convert[0], convert_dialog)

var $config = $('#preferences')
m.mount($config[0], config)

var $login = $('#login')
m.mount($login[0], login)

var $tabbar = $('#tabbar')
m.mount($tabbar[0], tabbar)
