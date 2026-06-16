import { basicSetup, EditorView } from 'codemirror'
import { keymap } from "@codemirror/view"
import { EditorState, Compartment, StateField } from "@codemirror/state"
import { indentWithTab } from "@codemirror/commands"
import { indentedLineWrap } from './linewrap' 
import { syntaxTree, foldable, foldEffect, unfoldAll, foldService, 
         foldCode, unfoldCode, HighlightStyle, syntaxHighlighting,
         defaultHighlightStyle, indentUnit, LRLanguage, LanguageSupport,
         indentService, getIndentUnit
       } from "@codemirror/language"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { sql } from "@codemirror/lang-sql"
import { json } from "@codemirror/lang-json"
import { yaml } from "@codemirror/lang-yaml"
import { parser as yamlParser} from "@lezer/yaml"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { css } from "@codemirror/lang-css"
import { tags } from "@lezer/highlight"
import { parseMixed } from "@lezer/common"
import { languages } from '@codemirror/language-data'
import { autocompletion, moveCompletionSelection } from "@codemirror/autocomplete"
import { linter, lintGutter, diagnosticCount } from '@codemirror/lint'
import { relpath } from './utils.js'


function completions(context) {
  const word = context.matchBefore(/[\p{L}\p{N}_-]*/u)
  const uppercase = word.text.charAt(0) === word.text.charAt(0).toUpperCase()
  const before = context.state.doc.sliceString(Math.max(0, word.from - 2), word.from)
  const is_link = before === ']('
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
        new_text = new_label = relpath(ds.file.path, opt.label)
      } else if (opt.title && uppercase) {
        new_label = opt.title.charAt(0).toUpperCase() + opt.title.slice(1)
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

  function getActiveLine() {
    const headPosition = editor.state.selection.main.head
    const line = editor.state.doc.lineAt(headPosition)
    return line.number
  }
  
  function goToLine(view, lineNum) {
    // Check if line number is valid
    const totalLines = view.state.doc.lines
    const targetLine = Math.max(1, Math.min(lineNum, totalLines))
  
    const lineInfo = view.state.doc.line(targetLine)
  
    view.dispatch({
      selection: { anchor: lineInfo.from },
      effects: EditorView.scrollIntoView(lineInfo.from, {
        y: "center",
        yMargin: 0
      })
    })
  }

  const markdownSupport = markdown({
    // Support all standard languages in code blocks
    base: markdownLanguage,
    codeLanguages: languages
  });

  const mixedYamlParser = yamlParser.configure({
    wrap: parseMixed((node, input) => {
      if (node.name === "BlockLiteral") { // text block after '|' or '|-'
        const blockStart = node.from;
        const blockEnd = node.to;
        const fullText = input.read(blockStart, blockEnd);
  
        // Don't include the block literal indicator
        const firstLineBreak = fullText.indexOf("\n");
        if (firstLineBreak === -1) return null;
  
        const contentStartPos = blockStart + firstLineBreak + 1;
        const lines = fullText.slice(firstLineBreak + 1).split("\n");
  
        // Find number of spaces used for indentation
        let indentSize = 0;
        for (const line of lines) {
          if (line.trim().length > 0) {
            const match = line.match(/^ */);
            indentSize = match ? match[0].length : 0;
            break;
          }
        }
  
        // Build a list with precise text areas (ranges) for the Markdown parser
        const overlays = [];
        let currentPos = contentStartPos;
  
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineLength = line.length;
  
          const actualIndent = line.search(/\S/) < indentSize && line.search(/\S/) !== -1
            ? line.search(/\S/) 
            : indentSize;
  
          const textStart = currentPos + actualIndent;
          const textEnd = currentPos + lineLength + (i < lines.length - 1 ? 1 : 0);
  
          if (textStart < textEnd) {
            overlays.push({ from: textStart, to: textEnd });
          }
  
          // Move position marker to the sart of next line
          currentPos += lineLength + 1;
        }
  
        if (overlays.length > 0) {
          return {
            parser: markdownSupport.language.parser,
            overlay: overlays
          };
        }
      }
      return null;
    })
  })

  const yamlMixedLanguage = LRLanguage.define({ parser: mixedYamlParser })

  function yamlWithMarkdown() {
    const base = yaml();
  
    const yamlIndent = indentService.of((context, pos) => {
      const { state } = context;
      const line = state.doc.lineAt(pos);
      if (line.number === 1) return null;
    
      const prevLine = state.doc.line(line.number - 1);
      const prevText = prevLine.text;
      const prevIndent = prevText.match(/^(\s*)/)[1].length;
      const indentUnit = getIndentUnit(state);
    
      // Block literal indicator — indent one level in
      if (/:\s*\|[-+]?\s*$/.test(prevText)) {
        return prevIndent + indentUnit;
      }
    
      // Mapping key or sequence entry — indent one level in
      if (/:\s*$/.test(prevText) || /^\s*-\s*$/.test(prevText)) {
        return prevIndent + indentUnit;
      }
    
      // Default — match previous line's indent
      return prevIndent;
    });

    return new LanguageSupport(yamlMixedLanguage, yamlIndent);
  }

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
  
      // Make sure we don't ask for lines that don't exist
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
        console.error("Couldn't load Biome:", err)
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

  const todoLinter = linter((view) => {
    const diagnostics = [];
    const doc = view.state.doc.toString();
    let regex = /\b(todo|note):/ig;
  
    for (const match of doc.matchAll(regex)) {
      console.log('todo funnet')
      diagnostics.push({
        from: match.index,
        to: match.index + match[0].length,
        severity: "warning",
        message: match[0],
      });
    }
    regex = /\b(next|bug):/ig;
  
    for (const match of doc.matchAll(regex)) {
      diagnostics.push({
        from: match.index,
        to: match.index + match[0].length,
        severity: "error",
        message: match[0],
      });
    }
    return diagnostics;
  });

  const lintGutterAutoHider = StateField.define({
    create() { return false; },
    update(value, tr) {
      // Sjekk om antall diagnostikker i hele dokumentet er > 0
      console.log('ant-feil', diagnosticCount(tr.state))
      return diagnosticCount(tr.state) > 0;
    },
    provide: f => EditorView.editorAttributes.from(f, hasErrors => {
      return hasErrors ? { class: "has-diagnostics" } : null;
    })
  });

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
    langs.yaml = yamlWithMarkdown()
    langs.text = null
    langs.md = markdownSupport 
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
      todoLinter,
      lintGutter(),
      lintGutterAutoHider,
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
          if (e.key === '(' && e.ctrlKey) {
            foldCode(editor)
            return true
          } else if (e.key === ')' && e.ctrlKey) {
            unfoldCode(editor)
            return true
          } else if (e.key === '8' && e.altKey && e.ctrlKey) {
            fold_all_recursive()
            return true
          } else if (e.key === '9' && e.altKey && e.ctrlKey) {
            unfold_all()
            return true
          }
        },
        blur: function(_, view) {
          if (!ds.filepos) {
            ds.filepos = {}
          }
          if (ds.file) {
            const line = getActiveLine()
            ds.filepos[ds.file.name] = line
          }
          
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

    if (attrs.lang === 'py') {
      extensions.push(ruffLinter)
      extensions.push(indentUnit.of('    '))
    }
    if (attrs.lang === 'js') {
      extensions.push(biomeLinter)
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
      if (editor && vnode.attrs['data-pkey'] && vnode.attrs['data-pkey'] !== pkey) {
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
      if (ds.file?.line) {
        goToLine(editor, ds.file.line)
      } else {
        goToLine(editor, 1)
      }
    },
    view: function(vnode) {
      return m('div', { class: vnode.attrs.class })
    }
  }
}

export default Codefield
