var cm = require("codemirror")
var sql = require("@codemirror/lang-sql")
var json = require("@codemirror/lang-json")

var editors = []

var Codefield = {

    get_value: function(id) {
        return editors[id].state.doc.toString()
    },

    set_value: function(id, value) {
        editors[id].dispatch({
            changes: {from: 0, to: editors[id].state.doc.length, insert: value}
        })
    },

    oncreate: function(vnode) {
        var lang
        if (vnode.attrs.lang == 'sql') {
            lang = sql.sql()
        } else if (vnode.attrs.lang == 'json') {
            lang = json.json()
        }
        editors[vnode.attrs.id] = new cm.EditorView({
            doc: vnode.attrs.value,
            extensions: [cm.basicSetup, cm.EditorView.editable.of(vnode.attrs.editable), lang],
            parent: vnode.dom,
        })
    },

    view: function(vnode) {
        return m('div', {
            id: vnode.attrs.id,
            class: vnode.attrs.class
        })
    }
}

module.exports = Codefield
