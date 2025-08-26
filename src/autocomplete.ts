import {syntaxTree} from "@codemirror/language";
import {CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {getEnclosing, hasBefore, within} from "./utils";
import {getDirectiveParams, supportedDirectives} from "./directives";
import {SyntaxNode} from "@lezer/common";

export default function skryptCompletions(ctx: CompletionContext): CompletionResult | null {
    let nodeBefore = syntaxTree(ctx.state).resolveInner(ctx.pos, -1);
    if (within(nodeBefore, "WhenClause")) {
        return {
            from: nodeBefore.name === "Chars" ? nodeBefore.from : ctx.pos,
            options: extractOptions(ctx).map(name => ({ label: name, type: "variable" }))
        };
    }
    else if (within(nodeBefore, "Substitution")) {
        return {
            from: nodeBefore.name === "Chars" ? nodeBefore.from : ctx.pos,
            options: extractTemplates(ctx).map(name => ({ label: name, type: "type" }))
        };
    }
    else if (within(nodeBefore, "Template")) {
        if (!isLettersDefined(ctx)) return {
            from: nodeBefore.name === "Chars" ? nodeBefore.from : ctx.pos,
            options: [{ label: "letters", type: "constant" }]
        };
    }
    else if (within(nodeBefore, "Directive")) {
        return completeDirectives(ctx, nodeBefore);
    }
    else if (nodeBefore.name === "Arrow") {
        return {
            from: nodeBefore.from,
            to: nodeBefore.to,
            options: [{ label: "->", displayLabel: "→", apply: "→", type: "text" }]
        };
    }
    else if (nodeBefore.name === "Quantifier") {
        return {
            from: nodeBefore.from,
            to: nodeBefore.to,
            options: [{ label: "*=", displayLabel: "×", apply: "×", type: "text" }]
        };
    }
    else if (nodeBefore.name === "Void") {
        return {
            from: nodeBefore.from,
            to: nodeBefore.to,
            options: [{ label: "{}", displayLabel: "∅", apply: "∅", type: "text" }]
        };
    }
    return null;
}


function extractDefinitions(ctx: CompletionContext, type: string): string[] {
    const tree = syntaxTree(ctx.state);
    let definitions: string[] = [];
    tree.iterate({
        to: ctx.pos,
        enter: node => {
            if (node.name === "file") return true;
            if (node.name === "Directive") {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = ctx.state.sliceDoc(nameNode.from, nameNode.to);
                if (name === "function") definitions = [];
            }
            else if (node.name === type) {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = ctx.state.sliceDoc(nameNode.from, nameNode.to);
                definitions.push(name);
            }
            return false;
        }
    });
    return definitions;
}

const extractOptions = (ctx: CompletionContext): string[] =>
    extractDefinitions(ctx, "Option");
const extractTemplates = (ctx: CompletionContext): string[] =>
    extractDefinitions(ctx, "Template");

function isLettersDefined(ctx: CompletionContext): boolean {
    const tree = syntaxTree(ctx.state);
    let result = false;
    tree.iterate({
        to: ctx.pos,
        enter: node => {
            if (node.name === "file") return true;
            if (node.name === "Directive") {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = ctx.state.sliceDoc(nameNode.from, nameNode.to);
                if (name === "function") result = false;
            }
            else if (node.name === "Template") {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = ctx.state.sliceDoc(nameNode.from, nameNode.to);
                if (name === "letters") result = true;
            }
            return false;
        }
    });
    return result;
}

function completeDirectives(ctx: CompletionContext, nodeBefore: SyntaxNode): CompletionResult | null {
    const enclosing = getEnclosing(nodeBefore, "Directive");
    if (hasBefore(enclosing, "Eq", ctx.pos)) {
        const nameNode = enclosing.getChild("Chars")!;
        const name = ctx.state.sliceDoc(nameNode.from, nameNode.to);
        const valueIndex = enclosing.getChildren("Chars", "Eq").filter(c => c.to < ctx.pos).length;
        const params = getDirectiveParams(name);
        if (!params || [undefined, '...', '*'].includes(params[valueIndex]))
            return null;
        else return {
            from: nodeBefore.name === "Chars" ? nodeBefore.from : ctx.pos,
            options: params[valueIndex].split('|').map(v => ({label: v, type: "keyword"}))
        };
    }
    else return {
        from: nodeBefore.name === "Chars" ? nodeBefore.from : ctx.pos,
        options: Object.keys(supportedDirectives).map(k => ({ label: k, type: "keyword" }))
    };
}
