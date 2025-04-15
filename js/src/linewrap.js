// Adapted from https://github.com/Mitcheljager/workshop.codes/blob/8b68d9c76f9d274055114dc7ed54594f78252681/app/javascript/src/utils/codemirror/indentedLineWrap.js

import { EditorView, Decoration } from "@codemirror/view"
import { StateField } from "@codemirror/state"

export const getStartSpaces = (line) => /^\s*/.exec(line)?.[0] ?? ""

const getDecorations = (state) => {
  const decorations = []

  for (let i = 0; i < state.doc.lines; i ++) {
    const line = state.doc.line(i + 1)
    const numberOfSpaces = getStartSpaces(line.text).length

    var offset = numberOfSpaces
    if (/^[*+-] /.test(line.text.trim())) {
      offset = offset + 2
    }

    if (offset === 0) continue

    const linerwapper = Decoration.line({
      attributes: {
        style: `--indented: ${offset}ch;`,
        class: "indented-wrapped-line"
      }
    })

    decorations.push(linerwapper.range(line.from, line.from))
  }

  return Decoration.set(decorations)
}

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds margin-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
export const indentedLineWrap = StateField.define({
  create(state) {
    return getDecorations(state)
  },
  update(deco, tr) {
    if (!tr.docChanged) return deco
    return getDecorations(tr.state)
  },
  provide: (f) => EditorView.decorations.from(f)
})
