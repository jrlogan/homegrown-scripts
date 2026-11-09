# homegrown-scripts

Keep up with [Homegrown Tech](https://newhaven.homegrowntech.dev/) through your own AI assistant.
Ask Claude Code "what's new this week?" or "who needs something I could help with?" and it answers
from the site. It can also draft your weekly update and add a project, and it shows you the exact
text and waits for your yes before anything posts.

It's one Node script (`bin/hgt.mjs`) plus instructions for the assistant (`CLAUDE.md`). Everything
runs on your computer, signed in as you.

## Setup (about five minutes)

You need Node 20 or newer. There are no packages to install.

1. Clone this repo, then turn on its safety check, which stops you from committing your login
   by accident:

   ```sh
   git config core.hooksPath .githooks
   ```

2. Sign in at https://newhaven.homegrowntech.dev in Chrome.
3. Open DevTools (Ctrl+Shift+I, or Cmd+Option+I on a Mac) → Network. Reload the page, click the
   first request, and under Request Headers right-click the **Cookie** value → Copy value.
4. Run `node bin/hgt.mjs cookie`. It saves the cookie from your clipboard to `.env` without
   showing it. The script keeps the site's hourly renewals itself; copy a fresh one only when it
   tells you to.

The cookie is your login. `.env` is git-ignored. Don't paste it into a chat, an issue or a commit.

Optional: put notes about yourself and your projects in `CLAUDE.local.md` (git-ignored), so the
assistant can point out what's relevant to you. For example: "I'm Sam. I build a tool-lending app and
care about parks and local giving."

## Use

In Claude Code, open this folder and ask in plain words:

- "What's new in the group?"
- "Who needs something I could help with?"
- "Draft my weekly update for Monday from what I shipped this week."
- "Add a project for the thing in ~/code/my-app."

Or run the commands yourself:

```sh
node bin/hgt.mjs news                  # new projects since last run + latest weekly updates
node bin/hgt.mjs projects              # every project
node bin/hgt.mjs project "anno music"  # one project in full
node bin/hgt.mjs mine                  # your projects, hidden ones included
node bin/hgt.mjs updates 3             # weekly updates from the last 3 meetups
node bin/hgt.mjs check projects/my-app.json           # checks the form's limits, no network
node bin/hgt.mjs add projects/my-app.json             # dry run: loads the form, sends nothing
node bin/hgt.mjs add projects/my-app.json --submit    # adds the project
```

Add `--json` to any read command for output an assistant can work with.

### Project files

Copy `projects/example.json` to `projects/<your-project>.json`. Your project files are
git-ignored, so they stay yours. Fields: `name` (80 characters), `pitch` (140), `description`,
`tags` (up to 8), `status` (idea, planning, building, testing, launched or paused), `looking_for`
(feedback, collaborators, testers, users, advice), `tech_stack` (up to 12), `links` (up to 4) and
`hidden`. Start with `"hidden": true`: only you can see a hidden project, and you can show it or
delete it afterwards.

## How it keeps the site free of slop

`CLAUDE.md` gives the assistant three rules for anything it posts:

1. Write only from evidence: your words, your commits, your releases, your links.
2. Keep it short and plain: no hype, at most three news bullets and two needs a week, and
   skipping a quiet week is fine.
3. Show you the exact text and post only after you approve it.

It never messages anyone, comments, likes or posts on someone else's project.

## What it can't do yet

- **Post the weekly update by itself.** That form only works with JavaScript. The assistant fills
  it in through Claude in Chrome after you approve the text.
- **Edit projects or send messages.** Edit on the site.

## When it breaks

The site has no API, so the script reads pages the way a browser does. When the site changes, the
script stops with "the site has changed" rather than guessing. Rerun with `HGT_SAVE_HTML=1` and
ask your assistant to fix the parser, then send the fix (see CONTRIBUTING.md). If the message is
"your cookie has probably expired", copy a fresh cookie and run `node bin/hgt.mjs cookie` again.

[docs/api-proposal.md](docs/api-proposal.md) explains why a small API would make tools like this
reliable.

## License

MIT. See [LICENSE](LICENSE).
