# Skrypt extension for CodeMirror 6

Skrypt is a domain-specific text transformation language, designed to facilitate pattern-based transliteration and
transcription. This package aims to provide the Skrypt language support for the [CodeMirror](https://codemirror.net/)
editor. It includes:

- Syntax highlighting (with a custom style)
- Options autocompletion
- Expression values hover tooltips
- Basic linting:
  - Incorrect syntax
  - Undefined option and template usage
  - Unused options and templates
  - Invalid Unicode escapes

## Installation

`npm install codemirror-lang-skrypt`

## Usage

```ts
import { skrypt } from "codemirror-lang-skrypt"

new EditorView({
    extensions: [skrypt()],
});
```

This will enable all the features by default, but you can also import any of the extensions selectively to define a
customized LanguageSupport yourself.

```ts
import { LanguageSupport } from "@codemirror/language"
import { SkryptLanguage, skryptHighlighting, skryptLint, skryptTooltip } from "codemirror-lang-skrypt"

new EditorView({
  extensions: [new LanguageSupport(SkryptLanguage, [skryptHighlighting, skryptLint, skryptTooltip])],
});
```

## Development

Due to the lack of time and advanced knowledge of the CodeMirror libraries, this package does not include any automated
tests, so it's necessary that you test it manually on an editor view instance. Whether you want to build the package
for your personal needs, or you want to contribute (thank you!), you can do it by:

1. Cloning the repository: `git clone https://github.com/yaBobJonez/codemirror-lang-skrypt`
2. Installing the dependencies: `npm install`
3. Preparing a dist using Rollup: `npm run prepare`

## License

This project is licensed under the [MIT License](LICENSE.txt), simple and permissive. It is based on a
[template](https://github.com/codemirror/lang-example) created by Marijn Haverbeke, also under the MIT License.
