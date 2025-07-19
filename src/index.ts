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
import getTemplateExpansionHint from "./tooltips";
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
        "Option": t.definition(t.variableName),
        "Option/Chars When/Chars": t.variableName,
        "Template": t.definition(t.macroName),
        "Template/Chars Substitution/Chars": t.macroName,
        "Eq": t.definitionOperator,
        "Comma": t.separator,
        "Slash Lookaround": t.squareBracket,
        "Arrow": t.updateOperator,
        "When": t.controlOperator,
        "Group": t.paren,
        "Not Or": t.logicOperator,
        "Quantifier": t.arithmeticOperator,
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

export const skryptTooltip = hoverTooltip(getTemplateExpansionHint);

export function skrypt() {
  return new LanguageSupport(SkryptLanguage, [skryptHighlighting, skryptLint, skryptTooltip]);
}
