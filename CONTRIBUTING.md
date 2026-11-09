# Contributing

Fixes and ideas from members are welcome. Open an issue, or send a pull request.

## Keep it small

- One script, no packages. Node 20's built-ins are enough.
- A parser fix should touch only the parser. When the site changes, fix what changed.
- Read commands stay read-only. Anything that posts needs a dry run by default and an explicit
  `--submit`.

## Keep it safe

- Run `git config core.hooksPath .githooks` once. The pre-commit check refuses commits that
  contain `.env`, a cookie, or anything from `data/`.
- Don't paste real pages, member names or members' posts into issues, tests or examples. Make up
  your own.
- Don't add anything that messages, comments, likes or posts on other members' projects, or that
  crawls the site.

## Keep the posting rules

Any change to how the assistant writes or posts keeps the three steps in `CLAUDE.md`: write from
evidence, draft short and plain, and show the exact text and wait for a yes. If you think a rule
is wrong, open an issue and say why.

## Before you send a pull request

- `node bin/hgt.mjs check projects/example.json` passes.
- The read commands you touched still work against the live site with your own cookie.
- The README says what changed, if anyone will notice.
