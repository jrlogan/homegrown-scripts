---
name: new-project
description: Turn one of the member's repos or ideas into a Homegrown Tech project card and add it, hidden first. Use for "add a project", "put <repo> on Homegrown", "make a project card".
---

# New project

1. Check it isn't already there: `node bin/hgt.mjs mine --json`.
2. Read the source the member points to (a repo's README and recent commits, a site, their own
   description). Ask what they want from the group: feedback, testers, collaborators, users or
   advice.
3. Copy `projects/example.json` to `projects/<slug>.json` and fill it in:
   - `pitch`: one sentence a member would understand with no context. 140 characters at most.
   - `description`: what it does today, where it stands, and what would help. Short paragraphs,
     plain words, only claims the source supports. Say what's real today and what's next.
   - `status`: the honest one. `"hidden": true` unless the member says otherwise.
4. Run `node bin/hgt.mjs check projects/<slug>.json`, then `node bin/hgt.mjs add
   projects/<slug>.json` (a dry run).
5. Show the member the exact card and ask. Run `add ... --submit` only after a clear yes, then
   give them the link. A hidden project is visible only to them until they show it on the site.
