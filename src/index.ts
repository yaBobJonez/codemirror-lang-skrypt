import {parser} from "./syntax.grammar"
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  flatIndent, syntaxHighlighting
} from "@codemirror/language"
import {styleTags, tags as t} from "@lezer/highlight"
import skryptCompletions from "./autocomplete";
import getLintDiagnostics from "./lint";
import getTooltips from "./tooltips";
import {highlightStyle} from "./highlighting";
import {linter} from "@codemirror/lint";
import {hoverTooltip} from "@codemirror/view";

export const SkryptLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: flatIndent
      }),
      foldNodeProp.add({
        Application: foldInside
      }),
      styleTags({
        "Comment": t.lineComment,
        "Chars": t.string,
        "Escape": t.escape,
        "Directive": t.definition(t.processingInstruction),
        "Directive/Chars": t.processingInstruction,
        "Option": t.definition(t.variableName),
        "Option/Chars WhenClause/Chars": t.variableName,
        "Template": t.definition(t.macroName),
        "Template/Chars Substitution/Chars Caret": t.macroName,
        "Eq Range": t.definitionOperator,
        "Comma": t.separator,
        "Slash Lookaround": t.squareBracket,
        "Arrow": t.updateOperator,
        "WhenClause": t.controlOperator,
        "Group Colon Semi": t.paren,
        "Not And Or Difference": t.logicOperator,
        "Quantifier Number": t.arithmeticOperator,
        "OrGroup": t.angleBracket,
        "OrGroup/Chars Underscore": t.character,
        "Substitution": t.brace,
        "Void": t.null
      })
    ]
  }),
  languageData: {
    commentTokens: {line: "#"},
    autocomplete: skryptCompletions,
    closeBrackets: {
      brackets: ["(", "[", "{", "<"]
    }
  }
});

export const skryptHighlighting = syntaxHighlighting(highlightStyle);

export const skryptLint = linter(getLintDiagnostics);

export const skryptTooltip = hoverTooltip(getTooltips);

export function skrypt() {
  return new LanguageSupport(SkryptLanguage, [skryptHighlighting, skryptLint, skryptTooltip]);
}
