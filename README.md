# Junnosuke Koizumi Personal Website

This repository contains the source files for the static website published with GitHub Pages at <https://jkoizumi144.com>.

## Structure

- `index.html` - home page
- `research.html` - research page
- `CV.html` - curriculum vitae page
- `notes.html` - expository notes page
- `puzzles.html` - mathematical puzzles page
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
