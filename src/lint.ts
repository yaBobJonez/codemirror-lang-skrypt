import {syntaxTree} from "@codemirror/language";
import {EditorView} from "@codemirror/view"
import {Diagnostic} from "@codemirror/lint";
import {SyntaxNode, SyntaxNodeRef} from "@lezer/common"
import {within} from "./utils";
import {getDirectiveParams} from "./directives";

export default function getLintDiagnostics(view: EditorView): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    getSyntaxErrors(view, diagnostics);
    getInvalidEscapes(view, diagnostics);
    checkDeclarationsAndUsage(view, diagnostics);
    verifyDirectives(view, diagnostics);
    verifyQuantifierRangeOrder(view, diagnostics);
    checkBlocks(view, diagnostics);
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
    const invalidInRhs = /(?<=(?:→|->).*)\\[vdDsS()}[\]|/+*](?=.*$)/gm;
    for (const match of doc.matchAll(invalidInRhs)) {
        diagnostics.push({
            from: match.index,
            to: match.index + match[0].length,
            severity: "warning",
            message: `Escape ${match.toString()} is only meaningful in the left-hand side of rule`
        });
    }
}

function checkDeclarationsAndUsage(view: EditorView, diagnostics: Diagnostic[]) {
    let templates = new Map<string, {from: number, to: number, used: boolean}>();
    let options = new Map<string, {from: number, to: number, used: boolean}>();

    function markUnused() {
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

    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (["Slash", "Underscore"].includes(node.name) && templates.has("letters"))
                templates.get("letters")!.used = true;
            else if (node.name === "WhenClause") {
                const nameNodes = node.node.getChildren("Chars");
                const names = nameNodes.map(n => view.state.sliceDoc(n.from, n.to));
                for (const name of names) {
                    if (options.has(name)) options.get(name)!.used = true;
                    else diagnostics.push({
                        from: node.from,
                        to: node.to,
                        severity: "error",
                        message: `Option ${name} is not defined`
                    });
                }
            }
            else if (["Directive", "Template", "Substitution", "Option"].includes(node.name)) {
                const nameNode = node.node.getChild("Chars");
                if (!nameNode) return false;
                const name = view.state.sliceDoc(nameNode.from, nameNode.to);

                if (node.name === "Directive") {
                    if (name === "function") {
                        markUnused();
                        templates = new Map();
                        options = new Map();
                    }
                }
                else if (node.name === "Template")
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

                return false;
            }
        }
    });
    markUnused();
}

function verifyDirectives(view: EditorView, diagnostics: Diagnostic[]) {
    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (node.name === "file") return true;
            if (node.name !== "Directive") return false;
            const charsNodes = node.node.getChildren("Chars");
            if (charsNodes.length === 0) return false;
            const name = view.state.sliceDoc(charsNodes[0].from, charsNodes[0].to);
            const params = getDirectiveParams(name);
            if (params === undefined) diagnostics.push({
                from: node.from,
                to: node.to,
                severity: "error",
                message: `Directive ${name} is not supported`
            });
            else if (params === null) {
                if (charsNodes.length > 1) diagnostics.push({
                    from: charsNodes[1].from,
                    to: node.to,
                    severity: "warning",
                    message: `Directive ${name} does not accept any values`
                });
            }
            else {
                const valueNodes = charsNodes.slice(1);
                for (let i = 0; i < params.length; i++) {
                    const chars = valueNodes[i];
                    if (params[i] === '...')
                        return false;
                    if (chars === undefined) {
                        diagnostics.push({
                            from: node.from,
                            to: node.to,
                            severity: "error",
                            message: `Directive ${name} requires at least ${params[params.length - 1] === '...'?
                                params.length - 1 : params.length} values`
                        });
                        return false;
                    }
                    const value = view.state.sliceDoc(chars.from, chars.to);
                    if (params[i] === '*' || params[i].split('|').includes(value))
                        continue;
                    diagnostics.push({
                        from: chars.from,
                        to: chars.to,
                        severity: "error",
                        message: `Illegal value ${value} in directive ${name}`
                    });
                }
                if (valueNodes.length > params.length) {
                    diagnostics.push({
                        from: valueNodes[params.length].from,
                        to: node.to,
                        severity: "error",
                        message: `Directive ${name} accepts at most ${params.length} values`
                    });
                }
            }
        }
    });
}

function verifyQuantifierRangeOrder(view: EditorView, diagnostics: Diagnostic[]) {
    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (node.name !== "Quantifier") return true;
            const numberNodes = node.node.getChildren("Number");
            if (numberNodes.length !== 2) return true;
            const from = parseInt(view.state.sliceDoc(numberNodes[0].from, numberNodes[0].to), 10);
            const to = parseInt(view.state.sliceDoc(numberNodes[1].from, numberNodes[1].to), 10);
            if (from > to) diagnostics.push({
                from: node.from,
                to: node.to,
                severity: "error",
                message: `Quantifier range start ${from} cannot be greater than end ${to}`
            });
            else if (from === to) diagnostics.push({
                from: node.from,
                to: node.to,
                severity: "warning",
                message: `Quantifier range start ${from} equals to end`
            });
        }
    });
}

function checkBlocks(view: EditorView, diagnostics: Diagnostic[]) {
    const blocks: [SyntaxNode, boolean][] = [];
    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (node.name === "Block") {
                if (blocks.length > 0)
                    blocks[blocks.length - 1][1] = true;
                blocks.push([node.node, false]);
            }
            else if (node.name === "Semi") {
                if (blocks.length > 0) {
                    const [block, used] = blocks.pop()!;
                    if (!used) diagnostics.push({
                        from: block.from,
                        to: block.to,
                        severity: "warning",
                        message: `Unused (empty) block`
                    });
                } else diagnostics.push({
                    from: node.from,
                    to: node.to,
                    severity: "error",
                    message: `Extra block terminator`
                });
            }
            else if (node.name === "Rule" && blocks.length > 0 && !blocks[blocks.length - 1][1])
                blocks[blocks.length - 1][1] = true;
            else if (node.name === "Caret") {
                if (blocks.length > 0) {
                    for (let i = blocks.length - 1; i >= 0; i--) {
                        const block = blocks[i][0].node;
                        if (block.getChild("Expr") !== null) return true;
                    }
                    diagnostics.push({
                        from: node.from,
                        to: node.to,
                        severity: "error",
                        message: `None of enclosing blocks contain an expression`
                    });
                } else diagnostics.push({
                    from: node.from,
                    to: node.to,
                    severity: "error",
                    message: `Anchor cannot be use outside blocks`
                });
            }
            return true;
        }
    });
    for (const [block, _] of blocks) diagnostics.push({
        from: block.from,
        to: block.to,
        severity: "error",
        message: `Block is not closed`
    });
}
