import {EditorView, TooltipView} from "@codemirror/view"
import {syntaxTree} from "@codemirror/language";
import {EditorState} from "@codemirror/state"
import {highlightTree, tags} from "@lezer/highlight";
import {highlightStyle} from "./highlighting";
import {coloredSpan, highlightedNode, within} from "./utils";
import {SyntaxNode, SyntaxNodeRef} from "@lezer/common";

export default function getTooltips(view: EditorView, pos: number, side: -1 | 1) {
    const node = syntaxTree(view.state).resolveInner(pos, side);
    if (within(node, "Substitution")) {
        const templates = extractTemplates(view.state, pos);
        const charsNode = (node.name === "Chars") ? node : node.getChild("Chars");
        const name = charsNode ? view.state.sliceDoc(charsNode.from, charsNode.to) : null;
        if (name != null && templates.has(name)) return {
            pos: node.from,
            end: node.to,
            above: true,
            create: (): TooltipView => ( {dom: templates.get(name)!} )
        };
    }
    else if (within(node, "Slash")) {
        const templates = extractTemplates(view.state, pos);
        let html: HTMLElement;
        if (templates.has("letters")) {
            const container = templates.get("letters")!;
            container.prepend(coloredSpan(view, tags.logicOperator, "~"));
            container.prepend(coloredSpan(view, tags.squareBracket, "["));
            container.append(coloredSpan(view, tags.squareBracket, "]"));
            html = container;
        } else {
            const container = document.createElement("div");
            container.append(coloredSpan(view, tags.squareBracket, "["));
            container.append(coloredSpan(view, tags.escape, "\\P{L}"));
            container.append(coloredSpan(view, tags.squareBracket, "]"));
            html = container;
        }
        return {
            pos: node.from,
            end: node.to,
            above: true,
            create: (): TooltipView => ( {dom: html} )
        };
    }
    else if (within(node, "Underscore")) {
        const templates = extractTemplates(view.state, pos);
        let html: HTMLElement;
        if (templates.has("letters"))
            html = templates.get("letters")!;
        else {
            const container = document.createElement("div");
            container.append(coloredSpan(view, tags.escape, "\\p{L}"));
            html = container;
        }
        return {
            pos: node.from,
            end: node.to,
            above: true,
            create: (): TooltipView => ( {dom: html} )
        };
    }
    else if (within(node, "Semi")) {
        const block = getClosestBlock(view, pos);
        if (block === null) return null;
        return {
            pos: node.from,
            end: node.to,
            above: true,
            create: (): TooltipView => ( {dom: highlightedNode(view, block)} )
        };
    }
    else if (within(node, "Caret")) {
        const block = getClosestBlock(view, pos);
        if (block === null) return null;
        const expr = block.getChild("Expr");
        if (expr === null) return null;
        return {
            pos: node.from,
            end: node.to,
            above: true,
            create: (): TooltipView => ( {dom: highlightedNode(view, expr)} )
        };
    }
    return null;
}

function extractTemplates(state: EditorState, pos: number): Map<string, HTMLElement> {
    let templates = new Map<string, HTMLElement>();
    syntaxTree(state).iterate({
        to: pos,
        enter: node => {
            if (node.name === "file") return true;
            if (node.name === "Directive") {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = state.sliceDoc(nameNode.from, nameNode.to);
                if (name === "function") templates = new Map();
            }
            else if (node.name === "Template") {
                const nameNode = node.node.getChild("Chars");
                const lhsNode = node.node.lastChild;
                if (!nameNode || !lhsNode) return false;

                const name = state.sliceDoc(nameNode.from, nameNode.to);
                const value = state.sliceDoc(lhsNode.from, lhsNode.to);

                const container = document.createElement("div");
                highlightTree(
                    lhsNode.toTree(),
                    highlightStyle,
                    (from, to, classes) => {
                        const span = document.createElement("span");
                        span.className = classes;
                        span.textContent = value.slice(from, to);
                        container.append(span);
                    }
                );

                templates.set(name, container);
            }
            return false;
        }
    });
    return templates;
}

function getClosestBlock(view: EditorView, pos: number) {
    const blocks: SyntaxNode[] = [];
    syntaxTree(view.state).iterate({
        to: pos,
        enter: (node) => {
            if (node.name === "file") return true;
            if (node.name === "Block") blocks.push(node.node);
            if (node.name === "Semi") blocks.pop();
            return false;
        }
    });
    if (blocks.length === 0) return null;
    return blocks[blocks.length - 1];
}
