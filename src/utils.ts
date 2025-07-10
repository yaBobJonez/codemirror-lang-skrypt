import {SyntaxNode} from "@lezer/common";
import {EditorView} from "@codemirror/view";
import {Tag} from "@lezer/highlight";
import {highlightingFor} from "@codemirror/language";

export const within = (node: SyntaxNode, name: string) =>
    node.name === name || node.parent?.name === name;

export const coloredSpan = (view: EditorView, tag: Tag, content: string) => {
    const span = document.createElement("span");
    span.className = highlightingFor(view.state, [tag]) ?? "";
    span.textContent = content;
    return span;
}
