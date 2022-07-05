window.m = require('mithril')
window.$ = require('cash-dom')
window.ds = require('./datastore.js')

var contents = require('./contents.js')
var header = require('./header.js')
var breadcrumb = require('./breadcrumb.js')
var filterpanel = require('./filterpanel.js')
var toolbar = require('./toolbar.js')
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
var report = require('./report.js')
var grid = require('./grid.js')

var adresse_tilbakestilling = false

m.route.prefix = "#"
m.route($('#main')[0], '/', {
    "/": home,
    "/:base": {
        onmatch: function(args, requestedPath) {
            var base_name = args.base
            if (ds.table && ds.table.dirty) {
                if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
                    m.route.set(grid.url)
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
                    m.route.set(grid.url)
                }
            }

            console.log('setter config.tab = data')
            config.tab = 'data'
            ds.type = 'contents'
            delete ds.table
            ds.load_database(base_name)

            return contents
        }
    },
    "/:base/data/:table": {
        onmatch: function(args, requestedPath) {
            if (ds.table && ds.table.dirty && grid.url !== requestedPath) {
                if (!confirm('Du har ulagrede data. Vil du fortsette?')) {
                    m.route.set(grid.url)
                } else {
                    return datapanel
                }
            } else {
                return datapanel
            }
        }
    },
    "/:base/diagram": {
        onmatch: function(args, requestedPath) {
            delete ds.table
            Diagram.def = ""

            return diagrampanel
        }
    },
    "/:base/diagram/:table": {
        onmatch: function(args, requestedPath) {
            return diagrampanel
        }
    },
    "/:base/sql": {
        onmatch: function(args, requestedPath) {
            var base_name = args.base
            ds.load_database(base_name)
            config.tab = 'sql'
            return SQLpanel
        }
    },
    "/:base/reports/:report": report
})

window.onbeforeunload = function(event) {
    if (ds.table && ds.table.dirty) {
        event.returnValue = "Du har ulagrede endringer i listen din"
    }
}

var $header = $('#header')
m.mount($header[0], header)

var $filterpanel = $('#filterpanel')
m.mount($filterpanel[0], filterpanel)

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
