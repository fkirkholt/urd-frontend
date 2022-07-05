var cm = require("codemirror")
var sql = require("@codemirror/lang-sql")

var editors = []

var Codefield = {

    get_value: function(id) {
        return editors[id].state.doc.toString()
    },

    oncreate: function(vnode) {
        editors[vnode.attrs.id] = new cm.EditorView({
            doc: vnode.attrs.value,
            extensions: [cm.basicSetup, cm.EditorView.editable.of(vnode.attrs.editable), sql.sql()],
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
