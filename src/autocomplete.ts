import {syntaxTree} from "@codemirror/language";
import {CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {within} from "./utils";

export default function skryptCompletions(ctx: CompletionContext): CompletionResult | null {
    let nodeBefore = syntaxTree(ctx.state).resolveInner(ctx.pos, -1);
    if (within(nodeBefore, "When")) {
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
    return null;
}


function extractDefinitions(ctx: CompletionContext, type: string): string[] {
    const tree = syntaxTree(ctx.state);
    const definitions: string[] = [];
    tree.iterate({
        to: ctx.pos,
        enter: node => {
            if (node.name === "file") return true;
            if (node.name === type) {
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
            if (node.name === "Template") {
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
