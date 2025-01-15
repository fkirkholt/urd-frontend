var editors = []

import { keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"

var Codefield = {

  get_value: function(id) {
    return editors[id].view.state.doc.toString()
  },

  set_value: function(id, value) {
    editors[id].view.dispatch({
      changes: { from: 0, to: editors[id].view.state.doc.length, insert: value }
    })
  },

  foldmethod: function(state, from, to) {
    // https://discuss.codemirror.net/t/add-folding-on-indent-levels-for-plain-text-and-yaml-language/5925
    const line = state.doc.lineAt(from) // First line
    const lines = state.doc.lines // Number of lines in the document
    const indent = line.text.search(/\S|$/) // Indent level of the first line
    let foldStart = from // Start of the fold
    let foldEnd = to // End of the fold

    // Check the next line if it is on a deeper indent level
    // If it is, check the next line and so on
    // If it is not, go on with the foldEnd
    let nextLine = line
    while (nextLine.number < lines) {
        nextLine = state.doc.line(nextLine.number + 1) // Next line
        const nextIndent = nextLine.text.search(/\S|$/) // Indent level of the next line

        // If the next line is on a deeper indent level, add it to the fold
        if (nextIndent > indent || nextLine.text == '') {
            foldEnd = nextLine.to // Set the fold end to the end of the next line
        } else {
            break // If the next line is not on a deeper indent level, stop
        }
    }

    // If the fold is only one line, don't fold it
    if (state.doc.lineAt(foldStart).number === state.doc.lineAt(foldEnd).number) {
        return null
    }

    // Set the fold start to the end of the first line
    // With this, the fold will not include the first line
    foldStart = line.to

    // Return a fold that covers the entire indent level
    return { from: foldStart, to: foldEnd }
  },

  oncreate: function(vnode) {
    Promise.all([
      import(/* webpackChunkName: "codemirror" */ 'codemirror'),
      import(/* webpackChunkName: "cm-lang-sql" */ '@codemirror/lang-sql'),
      import(/* webpackChunkName: "cm-lang-json" */ '@codemirror/lang-json'),
      import(/* webpackChunkName: "cm-lang" */ '@codemirror/language'),
      import(/* webpackChunkName: "cm-lang-yaml" */ '@codemirror/legacy-modes/mode/yaml'),
      import(/* webpackChunkName: "cm-lang-markdown" */ '@codemirror/lang-markdown'),
    ]).then(([cm, sql, json, language, yaml, markdown]) => {
        var lang
        if (vnode.attrs.lang == 'sql') {
          lang = sql.sql()
        } else if (vnode.attrs.lang == 'json') {
          lang = json.json()
        } else if (vnode.attrs.lang == 'yaml') {
          // Use legacy mode for yaml
          lang = new language.LanguageSupport(language.StreamLanguage.define(yaml.yaml));
        } else if (vnode.attrs.lang == 'markdown') {
          lang = markdown.markdown()
        } else {
          lang = ''
        }
        editors[vnode.attrs.id] = {}
        if (vnode.attrs['data-pkey']) {
          editors[vnode.attrs.id].pkey = vnode.attrs['data-pkey']
        }

        const foldingOnIndent = language.foldService.of(Codefield.foldmethod)
        var extensions = [
            cm.basicSetup,
            foldingOnIndent,
            keymap.of([indentWithTab]),
            cm.EditorView.editable.of(vnode.attrs.editable),
            cm.EditorView.updateListener.of(function(view) {
              if ('onchange' in vnode.attrs && view.docChanged) {
                var value = view.state.doc.toString()
                vnode.attrs.onchange(value);
                // Set classes manually to activate save button
                $('#gridpanel [title=Save]').removeClass('moon-gray').addClass('dim pointer')
              }
            })
        ]
        if (lang) extensions.push(lang)

        editors[vnode.attrs.id].view = new cm.EditorView({
          doc: vnode.attrs.value,
          extensions: extensions,
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
      import(/* webpackChunkName: "cm-lang-markdown" */ '@codemirror/lang-markdown'),
    ]).then(([cm, state, sql, json, language, yaml, markdown]) => {
        var lang
        if (vnode.attrs.lang == 'sql') {
          lang = sql.sql()
        } else if (vnode.attrs.lang == 'json') {
          lang = json.json()
        } else if (vnode.attrs.lang == 'yaml') {
          // Use legacy mode for yaml
          lang = new language.LanguageSupport(language.StreamLanguage.define(yaml.yaml));
        } else if (vnode.attrs.lang == 'markdown') {
          lang = markdown.markdown()
        }
        var id = vnode.attrs.id

        const foldingOnIndent = language.foldService.of(Codefield.foldmethod)
        var extensions = [
            cm.basicSetup,
            foldingOnIndent,
            cm.EditorView.editable.of(vnode.attrs.editable),
            cm.EditorView.updateListener.of(function(view) {
              if ('onchange' in vnode.attrs && view.docChanged) {
                var value = view.state.doc.toString()
                vnode.attrs.onchange(value);
                // Set classes manually to activate save button
                $('#gridpanel [title=Save]').removeClass('moon-gray').addClass('dim pointer')
              }
            })
        ]
        if (lang) extensions.push(lang)

        if (vnode.attrs['data-pkey'] && vnode.attrs['data-pkey'] != editors[id].pkey) {
          editors[id].pkey = vnode.attrs['data-pkey']
          editors[id].view.setState(state.EditorState.create({
            doc: vnode.attrs.value,
            extensions: extensions
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

export default Codefield
