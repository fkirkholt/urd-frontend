
var JSONed = {

    view: function(vnode) {
        return m('div', vnode.attrs)
    },

    oncreate: function(vnode) {
        import(/* webpackChunkName: "jsoneditor" */ 'jsoneditor').then(jsoneditor => {
            var options = {
                "mode": vnode.attrs.mode || "tree",
                "mainMenuBar": false,
                onChange: function() {
                    var value = JSON.stringify(vnode.state.jsoned.get())
                    vnode.attrs.onchange(value)
                    // Field.update(value, vnode.attrs.name, vnode.attrs.rec);
                }

            }
            vnode.state.jsoned = new jsoneditor(vnode.dom, options)
            vnode.state.jsoned.set(vnode.attrs.value)
        })
    }
}

module.exports = JSONed;
