import { basicSetup, EditorView } from 'codemirror'
import { keymap } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { indentWithTab } from "@codemirror/commands"
import { indentedLineWrap } from './linewrap' 
import { syntaxTree, foldable, foldEffect, unfoldAll, foldService, 
         foldCode, unfoldCode, HighlightStyle, syntaxHighlighting,
         defaultHighlightStyle, indentUnit} from "@codemirror/language"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { sql } from "@codemirror/lang-sql"
import { json } from "@codemirror/lang-json"
import { yaml } from "@codemirror/lang-yaml"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { css } from "@codemirror/lang-css"
import { tags } from "@lezer/highlight"
import { languages } from '@codemirror/language-data'
import { autocompletion, moveCompletionSelection } from "@codemirror/autocomplete"
import { linter, lintGutter } from '@codemirror/lint'


function completions(context) {
  const word = context.matchBefore(/[\p{L}\p{N}_-]*/u)
  const uppercase = word.text.charAt(0) == word.text.charAt(0).toUpperCase()
  const before = context.state.doc.sliceString(Math.max(0, word.from - 2), word.from)
  const is_link = before == ']('
  if (!word || (word.to - word.from < 3 && !context.explicit))
    return null
  let all_options = []
  if (ds.dblist) {
    Object.values(ds.dblist.autocomplete).forEach(options => {
      all_options = all_options.concat(options)
    });
  }
  return {
    from: word.from,
    filter: false,
    options: all_options.map(opt => {
      // Use uppercase for first character if written
      let new_text = opt.apply
      if (opt.apply && uppercase) {
        new_text = opt.apply.charAt(0).toUpperCase() + opt.apply.slice(1) 
      }
      let new_label = uppercase 
        ? opt.label.charAt(0).toUpperCase() + opt.label.slice(1) 
        : opt.label

      if (is_link) {
        new_text = opt.label
      } else if (opt.title) {
        new_label = opt.title
      }

      return {
        ...opt,
        label: new_label,
        apply: new_text
      }
    }).filter(option => option.label.toLowerCase().includes(word.text.toLowerCase()))
  }
}

function Codefield() {
  var editor
  var pkey
  var langs = {}
  var onchange
  var changed
  var editable = new Compartment

  // Custom fold service that folds based on indentation level
  const indentFold = foldService.of((state, lineStart) => {
    const line = state.doc.lineAt(lineStart);
    const indent = line.text.search(/\S|$/);
    
    if (indent === -1 || line.text.trim().length === 0) return null;
  
    let foldEnd = line.to;
    let nextLineNum = line.number + 1;
  
    while (nextLineNum <= state.doc.lines) {
      const nextLine = state.doc.line(nextLineNum);
      const nextIndent = nextLine.text.search(/\S|$/);
  
      if (nextLine.text.trim().length === 0) {
        foldEnd = nextLine.to;
        nextLineNum++;
        continue;
      }
  
      if (nextIndent > indent) {
        foldEnd = nextLine.to;
        nextLineNum++;
      } else break;
    }
  
    if (foldEnd <= line.to) return null;
    return { from: line.to, to: foldEnd };
  });

  const ruffLinter = linter(async (view) => {
    try {
      const ruff = await import("@astral-sh/ruff-wasm-web");
      // initialize wasm module
      await ruff.default();
      
      ds.ws = ds.ws || {}
      ds.ws.ruff = new ruff.Workspace({
        lint: {
          select: ['E', 'F', 'W'],
        },
      }, ruff.PositionEncoding.UTF16);
    } catch (error) {
      console.warn(error.message);
      return []
    }
    const doc = view.state.doc;
    const results = ds.ws.ruff.check(doc.toString());
    const diagnostics = [];

    for (const d of results) {
      const start = d.start_location;
      const end = d.end_location
  
      if (!start || !end) continue
  
      // Make sure we don't ask for lines that don't exeist
      const startLineIdx = Math.min(start.row, doc.lines)
      const endLineIdx = Math.min(end.row, doc.lines)
      
      const line = doc.line(startLineIdx)
      const endLine = doc.line(endLineIdx)
  
      // Calculate position: Ruff (1-based) -> CodeMirror (0-based)
      const from = Math.min(line.from + (start.column - 1), doc.length)
      const to = Math.min(endLine.from + (end.column - 1), doc.length)
  
      // Check for valid values before we add
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        diagnostics.push({
          from: Math.max(0, from),
          to: Math.min(to, doc.length),
          severity: d.code?.startsWith('F') || d.code?.startsWith('E') ? 'error' 
            : 'warning',
          message: `${d.code}: ${d.message}`,
        })
      }
    }

    return diagnostics
  })

  const biomeLinter = linter(async (view) => {

    if (!ds.ws?.biome) {
      try {
        const biomeModule = await import("@biomejs/wasm-web")

        // initialize wasm module (loads .wasm-file)
        await biomeModule.default()

        ds.ws = ds.ws || {}
        ds.ws.biome = new biomeModule.Workspace()

        ds.ws.biome.openProject({
          projectKey: 1,
          path: ds.file.abspath.replace(ds.file.path, ''),
          openUninitialized: true
        })

        ds.ws.biome.updateSettings({
          projectKey: 1, 
          fileKey: 1,
          configuration: {
            linter: {
              enabled: true,
              rules: { 
                recommended: true,
                suspicious: {
                  noDoubleEquals: "off"
                },
                style: {
                  useTemplate: "off"
                },
                complexity: {
                  useArrowFunction: "off"
                }
              }
            }
          }
        })
      } catch (err) {
        console.error("Kunne ikke laste Biome:", err)
        return []
      }
    }

    ds.ws.biome.openFile({
      projectKey: 1,
      path: ds.file.path,
      content: {
        type: "fromClient",
        content: view.state.doc.toString(),
        version: 1
      },
    });

    const result = ds.ws.biome.pullDiagnostics({
        projectKey: 1,
        path: ds.file.path,
        categories: ["lint"],
        max_diagnostics: 50
    });

    // map results to CodeMirror Diagnostics
    const diagnostics = result.diagnostics.map((diag) => ({
      from: diag.location.span[0],
      to: diag.location.span[1],
      severity: diag.severity === "error" ? "error" 
        : diag.severity === "information" ? "information"
        : "warning", 
      message: diag.description,
    }));

    const maxWidth = 88

    for (let i = 1; i <= view.state.doc.lines; i++) {
      const line = view.state.doc.line(i);
      if (line.length > maxWidth) {
        diagnostics.push({
          from: line.from + maxWidth,
          to: line.to,
          severity: "error",
          message: `Line too long (${line.length} > ${maxWidth})`,
        });
      }
    }

    return diagnostics
  })

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
      effects: foldRanges.map(r => foldEffect.of({ from: r.from, to: r.to }))
    });
  }

  function unfold_all() {
    unfoldAll(editor)
  }

  function get_extensions(attrs) {
    var lang
    var extensions
    langs.sql = sql()
    langs.json = json()
    langs.yaml = yaml()
    langs.text = null
    langs.md = markdown({
      base: markdownLanguage,
      codeLanguages: languages, // enables syntax highlighting for fenced code blocks
    })
    langs.py = python() 
    langs.js = javascript()
    langs.css = css()
    lang = langs[attrs.lang] || langs.md 

    const customHighlightStyle = HighlightStyle.define([
      { tag: tags.keyword, color: "#FF4136" },
      { tag: tags.comment, color: "gray", fontStyle: "italic" }
    ])

    extensions = [
      syntaxHighlighting(customHighlightStyle), 
      syntaxHighlighting(defaultHighlightStyle),
      basicSetup,
      indentFold,
      keymap.of([
        {
          key: "Tab",
          run: moveCompletionSelection(true), // Tab moves down in list
          shift: moveCompletionSelection(false) // Shift-Tab moves up in list
        },
        indentWithTab,
      ]),
      EditorView.lineWrapping,
      indentedLineWrap,
      editable.of(EditorView.editable.of(attrs.editable)),
      EditorView.updateListener.of((update) => { 
        if (update.docChanged && !changed) { 
          changed = true 
          if (ds.table && onchange) {
            ds.table.dirty = true
            m.redraw()
          } else if (ds.file) {
            $('#save-file').removeClass('o-30')
            ds.file.dirty = true
          }
        } 
      }),
      EditorView.domEventHandlers({
        keydown(e) {
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
        blur: function(_, view) {
          if (changed && onchange) {
            const value = view.state.doc.toString()
            onchange(value);
            changed = false
          }
        } 
      }),
      lang,
      autocompletion({ override: [completions], selectOnOpen: false })
    ]

    if (attrs.lang == 'py') {
      extensions.push(ruffLinter)
      extensions.push(lintGutter())
      extensions.push(indentUnit.of('    '))
    }
    if (attrs.lang == 'js') {
      extensions.push(biomeLinter)
      extensions.push(lintGutter())
    } 

    return extensions

  }

  return {
    get_value: function() {
      return editor.state.doc.toString()
    },

    set_value: function(value) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value }
      })
    },

    oncreate: async function(vnode) {
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
