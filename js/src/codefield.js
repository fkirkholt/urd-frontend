var editors = []

var Codefield = {

  get_value: function(id) {
    return editors[id].view.state.doc.toString()
  },

  set_value: function(id, value) {
    editors[id].view.dispatch({
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
        } else if (vnode.attrs.lang == 'yaml') {
          // Use legacy mode for yaml
          lang = new language.LanguageSupport(language.StreamLanguage.define(yaml.yaml));
        }
        editors[vnode.attrs.id] = {}
        if (vnode.attrs['data-pkey']) {
          editors[vnode.attrs.id].pkey = vnode.attrs['data-pkey']
        }
        editors[vnode.attrs.id].view = new cm.EditorView({
          doc: vnode.attrs.value,
          extensions: [
            cm.minimalSetup,
            cm.EditorView.editable.of(vnode.attrs.editable),
            lang,
            cm.EditorView.updateListener.of(function(view) {
              if ('onchange' in vnode.attrs && view.docChanged) {
                var value = view.state.doc.toString()
                vnode.attrs.onchange(value);
              }
            })
          ],
          parent: vnode.dom,
        })
      })
  },

  onupdate: function(vnode) {
    Promise.all([
      import(/* webpackChunkName: "codemirror" */ 'codemirror'),
      import(/* webpackChunkName: "cm-state" */ '@codemirror/state'),
      import(/* webpackChunkName: "cm-lang-sql" */ '@codemirror/lang-sql'),
      import(/* webpackChunkName: "cm-lang-json" */ '@codemirror/lang-json'),
      import(/* webpackChunkName: "cm-lang" */ '@codemirror/language'),
      import(/* webpackChunkName: "cm-lang-yaml" */ '@codemirror/legacy-modes/mode/yaml'),
    ]).then(([cm, state, sql, json, language, yaml]) => {
        var lang
        if (vnode.attrs.lang == 'sql') {
          lang = sql.sql()
        } else if (vnode.attrs.lang == 'json') {
          lang = json.json()
        } else if (vnode.attrs.lang == 'yaml') {
          // Use legacy mode for yaml
          lang = new language.LanguageSupport(language.StreamLanguage.define(yaml.yaml));
        }
        id = vnode.attrs.id

        if (vnode.attrs['data-pkey'] && vnode.attrs['data-pkey'] != editors[id].pkey) {
          editors[id].pkey = vnode.attrs['data-pkey']
          editors[id].view.setState(state.EditorState.create({
            doc: vnode.attrs.value,
            extensions: [
              cm.minimalSetup,
              cm.EditorView.editable.of(vnode.attrs.editable),
              lang,
              cm.EditorView.updateListener.of(function(view) {
                if ('onchange' in vnode.attrs && view.docChanged) {
                  var value = view.state.doc.toString()
                  vnode.attrs.onchange(value);
                }
              })
            ],
          }))
        }
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
