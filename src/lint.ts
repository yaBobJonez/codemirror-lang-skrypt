import {syntaxTree} from "@codemirror/language";
import {EditorView} from "@codemirror/view"
import {Diagnostic} from "@codemirror/lint";
import {within} from "./utils";

export default function getLintDiagnostics(view: EditorView): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    getSyntaxErrors(view, diagnostics);
    getInvalidEscapes(view, diagnostics);
    checkDeclarationsAndUsage(view, diagnostics);
    return diagnostics;
}

function getSyntaxErrors(view: EditorView, diagnostics: Diagnostic[]) {
    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (!node.type.isError) return true;
            let message = "Syntax error";

            const before = node.node.resolveInner(node.from, -1);
            if (within(before, "Option")) message = "Invalid option declaration";
            else if (within(before, "Template")) message = "Invalid template declaration";
            else if (within(before, "Rule")) message = "Incomplete rule syntax";

            message += ` near "${view.state.sliceDoc(before.from, node.to)}"`;
            diagnostics.push({
                from: before.from,
                to: node.to,
                severity: "error",
                message: message
            });
        }
    });
}

function getInvalidEscapes(view: EditorView, diagnostics: Diagnostic[]) {
    const doc = view.state.doc.toString();
    const badEscape = /\\u[0-9A-Fa-f]{0,3}(?![0-9A-Fa-f])/g;
    for (const match of doc.matchAll(badEscape)) {
        diagnostics.push({
            from: match.index,
            to: match.index + match[0].length,
            severity: "error",
            message: `Invalid Unicode escape ${match.toString()}`
        });
    }
    const invalidInRhs = /(?<=(?:→|->).*)\\[vdDsS()}[\]|/+*\-](?=.*$)/gm;
    for (const match of doc.matchAll(invalidInRhs)) {
        diagnostics.push({
            from: match.index,
            to: match.index + match[0].length,
            severity: "warning",
            message: `Escape ${match.toString()} is only meaningful in the left-hand side of a rule`
        });
    }
}

function checkDeclarationsAndUsage(view: EditorView, diagnostics: Diagnostic[]) {
    const templates = new Map<string, {from: number, to: number, used: boolean}>();
    const options = new Map<string, {from: number, to: number, used: boolean}>();
    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (["Slash", "Underscore"].includes(node.name) && templates.has("letters"))
                templates.get("letters")!.used = true;
            else if (["Template", "Substitution", "Option", "When"].includes(node.name)) {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = view.state.sliceDoc(nameNode.from, nameNode.to);

                if (node.name === "Template")
                    templates.set(name, {from: node.from, to: node.to, used: false});
                else if (node.name === "Substitution") {
                    if (templates.has(name)) templates.get(name)!.used = true;
                    else diagnostics.push({
                        from: node.from,
                        to: node.to,
                        severity: "error",
                        message: `Template ${name} is not defined`
                    });
                }
                else if (node.name === "Option")
                    options.set(name, {from: node.from, to: node.to, used: false});
                else if (node.name === "When") {
                    if (options.has(name)) options.get(name)!.used = true;
                    else diagnostics.push({
                        from: node.from,
                        to: node.to,
                        severity: "error",
                        message: `Option ${name} is not defined`
                    });
                }

                return false;
            }
        }
    });
    for (const [name, {from, to, used}] of templates) {
        if (!used) diagnostics.push({
            from: from,
            to: to,
            severity: "warning",
            message: `Template ${name} is defined but never used`
        });
    }
    for (const [name, {from, to, used}] of options) {
        if (!used) diagnostics.push({
            from: from,
            to: to,
            severity: "warning",
            message: `Option ${name} is defined but never used`
        });
    }
}
