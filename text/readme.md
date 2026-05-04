<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<h3 align='center'>@cluesurf/beat-code</h3>
<p align='center'>
  The VSCode Syntax Highlighter for <a href="https://github.com/cluesurf/beat"><code>.beat</code> tab files</a>
</p>

<br/>
<br/>
<br/>

## What it highlights

A `.beat` file is YAML front matter + one or more tab blocks:

```beat
instrument: drumkit
tempo: 100

measure: 4*4
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:----:x---:----|
```

The grammar colorizes:

- **Comments** — `# ...` (line comments)
- **Known YAML keys** — `instrument`, `tempo`, `humanize`, `measure`,
  `time`, `velocity`, `hit`, `note`, `flam`
- **Custom YAML keys** — uppercase line names (`H`, `S`, `T1`, etc.) and
  inline note overrides
- **Numbers** — including measure specs (`4*5`) and time signatures
  (`5/8`)
- **Tab rows** — line names + `|` measure separators + `:` beat
  separators
- **Note characters** — main hits (`x`, `o`, `b`, `c`, `d`, `f`, `g`,
  `r`) vs. accents (`O`, `X`, `J`, `B`)
- **Combining diacritics** — `x̣`, `x́`, `x̃`, `ẋ` highlighted as custom
  note slots
- **Silence** — `-` rendered as a comment color so the rhythmic pattern
  stands out

Markdown injection: triple-backtick `beat` blocks inside `.md` files are
highlighted via the `markdown.beat.codeblock` injection grammar.

## Development

Inside the editor, press `F5`. This will compile and run the extension
in a new Extension Development Host window. Make changes then press `F5`
again, etc.

[Here](https://code.visualstudio.com/api/get-started/extension-anatomy)
is more info on building an extension.
[Here](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
is how to publish the extension.

To publish, get an access token by following
[these instructions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token).

- The organization for the access token is at
  [ClueSurf](https://dev.azure.com/cluesurf).
- VSCode Marketplace profile:
  [aex.dev.azure.com/me](https://aex.dev.azure.com/me?mkt=en-US).
- VSCode package page for ClueSurf:
  [marketplace publishers/cluesurf](https://marketplace.visualstudio.com/manage/publishers/cluesurf).

## License

MIT

## ClueSurf

Made by [ClueSurf](https://clue.surf), meditating on the universe ¤.
Follow the work on [YouTube](https://youtube.com/@cluesurf),
[X](https://x.com/cluesurf),
[Instagram](https://instagram.com/cluesurf),
[Substack](https://cluesurf.substack.com),
[Facebook](https://facebook.com/cluesurf), and
[LinkedIn](https://linkedin.com/company/cluesurf), and browse more of
our open-source work here on [GitHub](https://github.com/cluesurf).
