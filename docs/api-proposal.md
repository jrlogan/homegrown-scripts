# A small API for Homegrown Tech

*A proposal for Joanne, from JR. Draft.*

## The short version

Members are building with AI tools that can do things for them: write the weekly update from what
they actually shipped, keep their project card current, add a new project the day it starts.
Today the only way in is the website's forms, so those tools have to pretend to be a browser.

I built that to show what it looks like (`bin/hgt.mjs` in this folder). It works, but:

- **It breaks quietly when the site changes.** It copies hidden codes out of the Add project
  form. Rename a field or change the form and every script like it stops working, and you'd never
  know people were using it.
- **It needs a member's login cookie.** That's the same as handing a script your password session.
  It expires, people paste it in odd places, and you can't tell a script from a person.
- **It gets no clear answers.** If something's wrong, the site sends back a web page, not "pitch is
  too long".

An API fixes all three: a stable address for each action, a personal token instead of a cookie
(which you can see and revoke), and plain error messages.

## What it could be

Small, and built on the code your forms already use, so the rules stay in one place.

| What | Route |
|---|---|
| List projects | `GET /api/projects` |
| One project | `GET /api/projects/:id` |
| Add a project | `POST /api/projects` |
| Change your project | `PATCH /api/projects/:id` |
| Post your weekly update | `POST /api/updates` |
| Upcoming meetups | `GET /api/meetups` |

- **Tokens:** a "Personal access tokens" box on the member's own profile page: create, name, revoke.
  Requests send `Authorization: Bearer <token>`. Store only a hash of each token.
- **Same rules as the forms:** each route calls the same function the form's server action calls,
  so the limits (80-character name, 140-character pitch, 8 tags, 12 tools, 4 links) and permissions
  (only edit your own projects, hidden projects stay hidden) can't drift apart.
- **Answers in JSON:** `201` with the new project, or `400` with `{ "error": "pitch is 152 characters; the limit is 140" }`.
- **Members only:** a token acts as the member who made it, nothing more. No admin actions, no
  messages, no member list beyond what a member can already see.

In Next.js that's a few `route.ts` files plus a tokens table. I'm happy to write it as a pull
request if the repo is open to that.

## Later, if people use it

- Let the AI assistants talk to it directly (an MCP server is a thin layer over the same routes).
- A read-only feed of new projects and updates, so tools can say "three new projects this week".
