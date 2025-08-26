import {SyntaxNode} from "@lezer/common";
import {EditorView} from "@codemirror/view";
import {highlightTree, Tag} from "@lezer/highlight";
import {highlightingFor} from "@codemirror/language";
import {highlightStyle} from "./highlighting";

export const within = (node: SyntaxNode, name: string) =>
    node.name === name || node.parent?.name === name;
export const getEnclosing = (node: SyntaxNode, name: string) =>
    node.parent?.name === name? node.parent : node;
export const hasBefore = (node: SyntaxNode, name: string, before: number) =>
    node.getChild(name) && node.getChild(name)!.to <= before;

export const coloredSpan = (view: EditorView, tag: Tag, content: string) => {
    const span = document.createElement("span");
    span.className = highlightingFor(view.state, [tag]) ?? "";
    span.textContent = content;
    return span;
}

export const highlightedNode = (view: EditorView, node: SyntaxNode) => {
    const text = view.state.sliceDoc(node.from, node.to);
    const container = document.createElement("div");
    highlightTree(
        node.toTree(),
        highlightStyle,
        (from, to, classes) => {
            const span = document.createElement("span");
            span.className = classes;
            span.textContent = text.slice(from, to);
            container.append(span);
        }
    );
    return container;
}
