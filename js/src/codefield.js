var editors = []

var Codefield = {

  get_value: function(id) {
    return editors[id].state.doc.toString()
  },

  set_value: function(id, value) {
    editors[id].dispatch({
      changes: { from: 0, to: editors[id].state.doc.length, insert: value }
    })
  },

  oncreate: function(vnode) {
    Promise.all([
      import(/* webpackChunkName: "codemirror" */ 'codemirror'),
      import(/* webpackChunkName: "cm-lang-sql" */ '@codemirror/lang-sql'),
      import(/* webpackChunkName: "cm-lang-json" */ '@codemirror/lang-json'),
      import(/* webpackChunkName: "cm-lang" */ '@codemirror/language'),
      import(/* webpackChunkName: "cm-lang-yaml" */ '@codemirror/legacy-modes/mode/yaml'),
    ]).then(([cm, sql, json, language, yaml]) => {
        var lang
        if (vnode.attrs.lang == 'sql') {
          lang = sql.sql()
        } else if (vnode.attrs.lang == 'json') {
          lang = json.json()
        } else if (vnode.attrs.lang == 'yml') {
          // Use legacy mode for yaml
          lang = new language.LanguageSupport(language.StreamLanguage.define(yaml.yaml));
        }
        editors[vnode.attrs.id] = new cm.EditorView({
          doc: vnode.attrs.value,
          extensions: [
            cm.basicSetup,
            cm.EditorView.editable.of(vnode.attrs.editable),
            lang
          ],
          parent: vnode.dom,
        })
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
