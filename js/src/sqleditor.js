var SQLeditor = {
    view: function() {
        return m('textarea', {
            id: 'sql',
            class: 'ml3 w8 h4 code',
            value: config.sql,
            onchange: function(ev) {
                config.sql = ev.target.value
            }
        })
    }
}

module.exports = SQLeditor

var config = require('./config')
