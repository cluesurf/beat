# `.beat` syntax highlighter

VS Code extension for highlighting `.beat` drum-tab files.

Lives in [`text/`](../text). Built from the same skeleton as
[`@cluesurf/tree-code`](https://github.com/cluesurf/tree-code).

## Layout

````
text/
├── package.json     # extension manifest
├── readme.md
├── license.md
├── base/
│   ├── beat.json    # tmlanguage grammar (the highlighter rules)
│   ├── bind.json    # language config (comments, brackets, word pattern)
│   └── mark.json    # markdown injection (` ```beat ` blocks)
└── view/
    ├── beat.svg     # file icon (drum-kit silhouette)
    └── view.json    # icon-theme manifest
````

## What it highlights

| Token                             | Scope                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| `# comment`                       | `comment.line.number-sign.beat`                                             |
| `instrument:` / `tempo:` / etc.   | `keyword.control.beat`                                                      |
| `H:` / `T1:` / custom YAML key    | `entity.name.tag.beat`                                                      |
| `[80, 110]` array                 | `punctuation.definition.array.*.beat`                                       |
| `{ x: y }` inline object          | `punctuation.definition.dictionary.*.beat`                                  |
| `4*5` measure spec                | `constant.numeric.measure-spec.beat`                                        |
| `5/8` time signature              | `constant.numeric.time-signature.beat`                                      |
| `H\|` line name + measure pipe    | `entity.name.section.line-name.beat` + `punctuation.separator.measure.beat` |
| `:` beat separator                | `punctuation.separator.beat.beat`                                           |
| `-` silence                       | `comment.tab.silence.beat` (dimmed)                                         |
| `x` / `o` / `b` / `c` etc.        | `constant.character.tab-note.beat`                                          |
| `O` / `X` / `J` / `B` accents     | `support.constant.tab-note.accent.beat`                                     |
| `x̣` / `x́` / `x̃` / `ẋ` (combining) | `constant.character.tab-note.combining.beat`                                |
| Anything else inside a tab row    | `invalid.illegal.tab-note.beat`                                             |

The "anything else" rule means typos in your tab content show up red —
the same way the parser's "unknown note character" error would show up
at runtime.

## Markdown injection

Triple-backtick `beat` blocks inside `.md` files get the same
highlighting via the `markdown.beat.codeblock` injection grammar. Useful
for readmes that show example tabs.

````md
```beat
measure: 4*4
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:----:x---:----|
```
````

## Building locally

```bash
cd text
pnpm install               # installs vsce + prettier
pnpm make                  # produces beat-code-1.0.0.vsix
```

Install the resulting `.vsix` in VS Code via:

```
Extensions panel → ⋯ menu → Install from VSIX…
```

## Publishing

`pnpm host` runs `vsce publish` against the `cluesurf` publisher. Setup:

- Get an Azure DevOps PAT under the
  [ClueSurf org](https://dev.azure.com/cluesurf)
- `pnpm dock` to log in (`vsce login cluesurf`)
- `pnpm host` to publish

## Development loop

Open `text/` in VS Code, press **F5** — opens an Extension Development
Host with the extension loaded. Make changes, press F5 again.

## Why the nested layout

The outer `beat/` folder is the engine + tab files. The inner
`beat/text/` is a self-contained VS Code extension (its own
`package.json`, build, publish flow) that just happens to live inside
the engine repo. Same convention as
[`tree-code`](https://github.com/cluesurf/tree-code) which lives at
`cluesurf/deck/tree-code/`.
