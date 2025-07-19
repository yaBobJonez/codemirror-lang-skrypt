import {HighlightStyle} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";

export const highlightStyle = HighlightStyle.define([
    {tag: t.lineComment, color: "#909497", fontStyle: "italic"},
    {tag: t.string, color: "#1e8449"},
    {tag: t.escape, color: "#27ae60"},
    {tag: t.definition(t.variableName), color: "#2980b9", fontWeight: "bold"},
    {tag: t.variableName, color: "#3498db"},
    {tag: t.definition(t.macroName), color: "#d35400", fontWeight: "bold"},
    {tag: t.macroName, color: "#e67e22"},
    {tag: t.definitionOperator, color: "#16a085"},
    {tag: t.separator, color: "#1c2833"},
    {tag: t.squareBracket, color: "#8e44ad", fontWeight: "bold"},
    {tag: t.updateOperator, color: "#2c3e50", fontWeight: "bold"},
    {tag: t.controlOperator, color: "#2874a6", fontWeight: "bold"},
    {tag: t.paren, color: "#616a6b"},
    {tag: t.logicOperator, color: "#d4ac0d"},
    {tag: t.arithmeticOperator, color: "#cb4335"},
    {tag: t.angleBracket, color: "#148f77"},
    {tag: t.character, color: "#2e86c1"},
    {tag: t.brace, color: "#ca6f1e"},
    {tag: t.null, color: "#76448a"},
]);
