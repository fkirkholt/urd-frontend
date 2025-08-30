import { basicSetup, EditorView } from 'codemirror'
import { keymap } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { indentWithTab } from "@codemirror/commands"
import { indentedLineWrap } from './linewrap' 
import { syntaxTree, foldable, foldEffect, unfoldAll, foldService, 
         foldCode, unfoldCode, HighlightStyle, syntaxHighlighting,
         defaultHighlightStyle} from "@codemirror/language"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { sql } from "@codemirror/lang-sql"
import { json } from "@codemirror/lang-json"
import { yaml } from "@codemirror/lang-yaml"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { css } from "@codemirror/lang-css"
import { LSPClient, languageServerSupport } from "@codemirror/lsp-client"
import { tags } from "@lezer/highlight"
import { languages } from '@codemirror/language-data';

function createWebSocketTransport(uri) {
  let handlers = []
  let sock = new WebSocket(uri)
  sock.onmessage = e => { for (let h of handlers) h(e.data.toString()) }
  return new Promise(resolve => {
    sock.onopen = () => resolve({
      send(message) { sock.send(message) },
      subscribe(handler) { handlers.push(handler) },
      unsubscribe(handler) { handlers = handlers.filter(h => h != handler) }
    })
  })
}


function Codefield() {
  var editor
  var pkey
  var langs = {}
  var onchange
  var changed
  var editable = new Compartment
  var client

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

  function get_extensions(attrs) {
    var lang
    var extensions
    langs['sql'] = sql()
    langs['json'] = json()
    langs['yaml'] = yaml()
    langs['text'] = null
    langs['md'] = markdown({
      base: markdownLanguage,
      codeLanguages: languages, // This enables syntax highlighting for fenced code blocks
    })
    langs['py'] = python() 
    langs['js'] = javascript()
    langs['css'] = css()
    lang = langs[attrs.lang] || langs['md'] 

    const customHighlightStyle = HighlightStyle.define([
      { tag: tags.keyword, color: "#FF4136" },
      { tag: tags.comment, color: "gray", fontStyle: "italic" }
    ])

    extensions = [
      syntaxHighlighting(customHighlightStyle), 
      syntaxHighlighting(defaultHighlightStyle),
      basicSetup,
      foldService.of(foldmethod),
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
      indentedLineWrap,
      editable.of(EditorView.editable.of(attrs.editable)),
      EditorView.updateListener.of((update) => { 
        if (update.docChanged && !changed) { 
          changed = true 
          if (onchange) {
            ds.table.dirty = true
            m.redraw()
          }
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
          if (changed && onchange) {
            var value = view.state.doc.toString()
            onchange(value);
            changed = false
          }
        } 
      }),
      lang
    ]
    if (ds.file && ds.file.websocket) {
      extensions.push(languageServerSupport(client, "file://" + ds.file.abspath))
    }

    return extensions

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

    oncreate: async function(vnode) {
      if (ds.type == 'file' && ds.file.websocket) {
        const transport = await createWebSocketTransport("ws://" + ds.file.websocket)

        client = new LSPClient().connect(transport)
      }
      onchange = vnode.attrs.onchange

      editor = new EditorView({
        doc: vnode.attrs.value,
        extensions: get_extensions(vnode.attrs),
        parent: vnode.dom
      })
      if (vnode.attrs['data-pkey']) {
        pkey = vnode.attrs['data-pkey']
      }
    },
    onupdate: async function(vnode) {
      if (editor && vnode.attrs['data-pkey'] && vnode.attrs['data-pkey'] != pkey) {
        if (ds.type == 'file' && ds.file.websocket) {
          const transport = await createWebSocketTransport("ws://" + ds.file.websocket)

          client = new LSPClient().connect(transport)
        }
        pkey = vnode.attrs['data-pkey']
        onchange = vnode.attrs.onchange
        changed = false
        editor.setState(EditorState.create({
          doc: vnode.attrs.value,
          extensions: get_extensions(vnode.attrs)
        }))
      }
      editor.dispatch({ 
        effects: editable.reconfigure(EditorView.editable.of(vnode.attrs.editable)) 
      })
    },
    view: function(vnode) {
      return m('div', { class: vnode.attrs.class })
    }
  }
}

export default Codefield
