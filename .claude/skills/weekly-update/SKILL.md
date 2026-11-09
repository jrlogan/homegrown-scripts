---
name: weekly-update
description: Draft the member's Homegrown Tech weekly update (news and needs) from what they actually did since their last update, then post it only after they approve the exact text. Use for "do my update", "weekly update", "post an update for <project>".
---

# Weekly update

## 1. Find the period

Run `node bin/hgt.mjs updates 6 --json` and find the member's last update for this project. The
period starts there. If they've never posted one, use the last two weeks. Note what they said
last time so you don't repeat it.

## 2. Gather evidence

Ask where the work lives if you don't know (check `CLAUDE.local.md` first): repos, release notes,
store listings, a site. Then read the evidence for the period, for example
`git log --since=<date> --no-merges --pretty='%ad %s' --date=short`, tags, releases. Ask the
member what happened that isn't written down: meetings, users, decisions.

## 3. Keep only what matters

Keep, most important first: something people can now use (a launch, a release, a store listing);
first users, pilots or partners; decisions or lessons; something a member could try this week.

Drop: tests, CI, refactors, docs, security hardening nobody sees, polish of something already
announced, and anything in last week's update.

If nothing clears the bar, say so and suggest skipping this week.

## 4. Draft

- News: at most three bullets. Needs: at most two, each a specific ask tied to the news
  ("try X near where you live and tell me what's confusing"), never "feedback welcome".
- The member's voice: plain, short, first person. No hype words, no emoji decoration.
- Every claim traces to the evidence or the member's own words. List anything you couldn't
  verify under the draft so they can confirm or cut it.

## 5. Show it and wait

Show the exact News and Needs text as it will be posted and ask whether to post it. Approving a
direction is not approving the text: after any change, show the new version and ask again.

## 6. Post (only after a clear yes)

The update form is on the upcoming meetup's page and needs JavaScript, so the script can't post
it. Use a browser tool (Claude in Chrome): open the meetup page, pick the project, fill in News
and Needs, and press Post update. Then confirm it saved with `node bin/hgt.mjs updates 1 --json`
and tell the member it's up.
