# homegrown-scripts

Tools for a member of Homegrown Tech (https://newhaven.homegrowntech.dev) to keep up with the group
through an AI assistant. The site has no API; `bin/hgt.mjs` reads its pages and posts its Add
project form with the member's own session cookie from `.env`.

The person running this is a member acting as themselves. Anything you post appears under their
name, in front of people they know. Act that way.

Personal context (who they are, their projects, what to watch for) goes in `CLAUDE.local.md`,
which is not committed. Read it if it exists.

## Never

- Print, copy, log, paste or commit the cookie, or anything else from `.env`.
- Commit anything in `data/` (other members' projects and updates) or saved pages.
- Send a message, post a comment, click "I'm interested" or "I can help", or post on anyone
  else's project. The script doesn't do these, and you shouldn't do them through a browser either.
- Crawl the site. Fetch the pages a question needs, when it's asked.

## Answering questions about the group

Use the `--json` read commands and summarize from what they return:

- `node bin/hgt.mjs news --json`: projects added or changed since the last run (remembered in
  `data/projects.json`), plus the weekly updates from the last two meetups. For "what's new".
- `node bin/hgt.mjs projects --json`: every project card (name, owner, pitch, tags, status).
- `node bin/hgt.mjs project "<name or id>" --json`: one project in full; `text` holds the page.
- `node bin/hgt.mjs mine --json`: the member's own projects, hidden ones included.
- `node bin/hgt.mjs updates <count> --json`: weekly updates (news and needs) from recent meetups.

The site has no dates on projects, so "new" means new since the last `news` run.

Lead with what matters to this member: needs they could meet, work that overlaps theirs, people
worth talking to. Quote what members actually posted. Don't pad the summary with everything.

## Posting: the rules against slop

Everything posted goes through the same three steps.

1. **Evidence.** Write only from things you can point to: the member's own words, commits,
   releases, store listings, links. If a claim doesn't trace to one of them, cut it or mark it
   for the member to confirm. Don't guess at numbers, dates, users or results.
2. **Draft short and plain.** Use the member's voice. No hype ("excited to", "revolutionize",
   "seamless", "game-changer", "leverage"), no emoji decoration, no filler. A weekly update has
   at most three news bullets and two needs. Each need is a specific ask ("try X near where you
   boat"), not "feedback welcome". If nothing worth saying happened, say so and suggest skipping
   the week.
3. **Show the exact text and wait for a yes.** Show the member the text exactly as it will be
   posted, list anything you couldn't verify, and post only after they clearly approve that
   version. If they ask for changes, show the new version and ask again. Approving a direction
   ("lead with the App Store") is not approving the text.

### Weekly updates

Look back from the member's last posted update (find it with `updates`), not just the last
seven days. Keep what a member of the group would care about or could act on: launches,
releases, first users or pilots, decisions, things they can try this week. Drop tests, CI,
refactors, docs and polish of things already announced. Don't repeat last week's news.

The update form only works with JavaScript, so the script can't post it. With the member's
approval of the exact text, fill it in through a browser tool (Claude in Chrome), then confirm
it saved with `updates 1 --json`.

### New projects

Write `projects/<slug>.json` (format in README.md and `projects/example.json`), run `check`, then
`add` (a dry run). Run `add --submit` only when the member says to. Start with `"hidden": true`
unless they say otherwise.

Editing projects and messaging are not built.

## When it breaks

- "cookie has probably expired": the member copies a fresh Cookie header and runs
  `node bin/hgt.mjs cookie`.
- "The site has changed": rerun with `HGT_SAVE_HTML=1` to save the pages to `data/html/`, read
  them, and fix the parser in `bin/hgt.mjs`. Keep the fix small. Saved pages stay in `data/`
  and are never committed.

## Changing this repo

The commands `/whats-new`, `/weekly-update` and `/new-project` live in `.claude/skills/`; keep them
consistent with the rules above.

See CONTRIBUTING.md. In short: no packages, one script, and every change to what gets posted
keeps the three steps above.
