import { EditorView, Decoration, ViewPlugin, MatchDecorator } from "@codemirror/view";

const boldKeyDecoration = Decoration.mark({
  class: "cm-list-key-bold"
});

const listKeyDecorator = new MatchDecorator({
  // regexp: /^(\s*[-*+]\s+)([^:\n]+)(?=:)/gm,
  regexp: /^(\s*[-*+]\s+)([^:\n]+)(?=:(?:\s|$))/gm,
  decorate: (add, from, to, match, view) => {
    const keyStart = from + match[1].length; // skip the bullet prefix
    const keyEnd = keyStart + match[2].length;
    add(keyStart, keyEnd, boldKeyDecoration);
  },
});

const listKeyHighlighter = ViewPlugin.define(
  (view) => ({
    decorations: listKeyDecorator.createDeco(view),
    update(update) {
      this.decorations = listKeyDecorator.updateDeco(update, this.decorations);
    },
  }),
  {
    decorations: (v) => v.decorations,
  }
);

const listKeyTheme = EditorView.theme({
  ".cm-list-key-bold": {
    fontWeight: "bold",
    color: "#0056b3"
  }
});

export function compactListHighlighter() {
  return [listKeyHighlighter, listKeyTheme];
}
