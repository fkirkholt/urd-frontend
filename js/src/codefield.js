import { basicSetup, EditorView } from 'codemirror'
import { keymap } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { indentWithTab } from "@codemirror/commands"
import { indentedLineWrap } from './linewrap' 
import { syntaxTree, syntaxTreeAvailable, foldable, foldEffect, unfoldAll,
         foldCode, unfoldCode } from "@codemirror/language"


function Codefield() {
  var editor
  var pkey
  var extensions
  var langs = {}
  var onchange
  var changed

  function foldmethod(state, from, to) {
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
  }

  // Function to fold all levels of code
  function fold_all_recursive() {
    const state = editor.state;

    // Traverse the syntax tree and collect all foldable ranges
    const foldRanges  = [];
    syntaxTree(state).iterate({
      enter(node) {
        const isFoldable = foldable(state, node.from, node.to)
        if (isFoldable) {
          foldRanges.push({ from: isFoldable.from, to: isFoldable.to });
        }
      }
    });

    editor.dispatch({
      effects: foldRanges.map(range => foldEffect.of({ from: range.from, to: range.to }))
    });
  }

  function unfold_all() {
    unfoldAll(editor)
  }

  return {
    get_value: function(id) {
      return editor.state.doc.toString()
    },

    set_value: function(value) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value }
      })
    },

    oncreate: function(vnode) {
      onchange = vnode.attrs.onchange
      Promise.all([
        import(/* webpackChunkName: "cm-lang" */ '@codemirror/language'),
        import(/* webpackChunkName: "cm-lang-sql" */ '@codemirror/lang-sql'),
        import(/* webpackChunkName: "cm-lang-json" */ '@codemirror/lang-json'),
        import(/* webpackChunkName: "cm-lang-yaml" */ '@codemirror/lang-yaml'),
        import(/* webpackChunkName: "cm-lang-markdown" */ '@codemirror/lang-markdown'),
        import(/* webpackChunkName: "cm-lang-python" */ '@codemirror/lang-python'),
        import(/* webpackChunkName: "cm-lang-js" */ '@codemirror/lang-javascript'),
        import(/* webpackChunkName: "highlight" */ '@lezer/highlight'),
      ]).then(([language, sql, json, yaml, markdown, python, js, highlight]) => {
        var lang
        langs['sql'] = sql.sql()
        langs['json'] = json.json()
        langs['yaml'] = yaml.yaml()
        langs['text'] = null
        langs['md'] = markdown.markdown()
        langs['py'] = python.python() 
        langs['js'] = js.javascript()
        lang = langs[vnode.attrs.lang] || markdown.markdown()

        const customHighlightStyle = language.HighlightStyle.define([
          { tag: highlight.tags.keyword, color: "#FF4136" },
          { tag: highlight.tags.comment, color: "gray", fontStyle: "italic" }
        ])

        extensions = [
          language.syntaxHighlighting(customHighlightStyle), 
          language.syntaxHighlighting(language.defaultHighlightStyle),
          basicSetup,
          language.foldService.of(foldmethod),
          keymap.of([indentWithTab]),
          EditorView.lineWrapping,
          indentedLineWrap,
          EditorView.editable.of(vnode.attrs.editable),
          EditorView.updateListener.of((update) => { 
            if (update.docChanged) { 
              changed = true 
              if (ds.file) {
                $('#save-file').removeClass('o-30')
                ds.file.dirty = true
              }
            } 
          }),
          EditorView.domEventHandlers({
            keydown(e, view) {
              if (e.key == '(' && e.ctrlKey) {
                foldCode(editor)
                return true
              } else if (e.key == ')' && e.ctrlKey) {
                unfoldCode(editor)
                return true
              } else if (e.key == '8' && e.altKey && e.ctrlKey) {
                fold_all_recursive()
                return true
              } else if (e.key == '9' && e.altKey && e.ctrlKey) {
                unfold_all()
                return true
              }
            },
            blur: function(e, view) {
              if (changed) {
                var value = view.state.doc.toString()
                onchange(value);
              }
            } 
          }),
        ]

        editor = new EditorView({
          doc: vnode.attrs.value,
          extensions: lang ? extensions.concat([lang]) : extensions,
          parent: vnode.dom
        })
        if (vnode.attrs['data-pkey']) {
          pkey = vnode.attrs['data-pkey']
        }
      })
    },
    onupdate: function(vnode) {
      var lang
      if (editor && vnode.attrs['data-pkey'] && vnode.attrs['data-pkey'] != pkey) {
        lang = langs[vnode.attrs.lang]
        pkey = vnode.attrs['data-pkey']
        onchange = vnode.attrs.onchange
        changed = false
        editor.setState(EditorState.create({
          doc: vnode.attrs.value,
          extensions: lang ? extensions.concat([lang]) : extensions
        }))
      }
    },
    view: function(vnode) {
      return m('div', { class: vnode.attrs.class })
    }
  }
}

export default Codefield
