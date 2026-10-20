# Junnosuke Koizumi Personal Website

This repository contains the source files for the static website published with GitHub Pages at <https://jkoizumi144.com>.

## Structure

- `index.html` - home page
- `research.html` - research page
- `CV.html` - curriculum vitae page
- `notes.html` - expository notes page
- `puzzles.html` - mathematical puzzles page
- `daily_math_puzzle.html` - archive of Daily Math Puzzle posts
- `daily_math_puzzle/` - bilingual problem pages and the interactive coin-pile puzzle
- `articles/` - standalone article pages and article-specific styles
- `notes/` - PDF notes
- `font/` - bundled fonts
- `kairo/`, `25tiles/`, `magnitude/`, `signed_graph/`, `arxiv-author/` - interactive pages and small web apps
- `style.css` - shared site styles
- `CNAME` - GitHub Pages custom domain configuration

## Local Preview

Most pages can be previewed by opening the corresponding `.html` file in a browser.

For a closer GitHub Pages-style preview, serve the repository directory locally:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Editing Notes

This is intentionally a plain static site. Prefer small HTML/CSS changes and keep links relative so they continue to work on GitHub Pages.

Before making larger changes, read `AGENTS.md` for repository-specific editing guidance.

## Daily Math Puzzle

The archive lists only published problems, using their posting dates in Japan Standard Time.
Each dated page contains the English and Japanese problem statements and a link to the original X post.
To add a problem, copy a dated page, update its metadata and statements, add it to `daily_math_puzzle.html`, and update the neighboring dated pages' navigation links.
Keep the Japanese statement identical to the source problem, converting inline math delimiters from `$...$` to `\(...\)` for MathJax.

The 2026-10-19 page includes a browser-local coin-pile game for n = 1 through 6.
Its rules are in `daily_math_puzzle/coin-game.mjs`; its bilingual interface is in `daily_math_puzzle/coin-piles.js`.
Preview it through an HTTP server so the browser can load JavaScript modules.

Run the rule checks with `node --test tests/daily-math-puzzle.test.mjs`.
