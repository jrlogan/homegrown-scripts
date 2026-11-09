#!/usr/bin/env node
// hgt — read Homegrown Tech and add projects to it, without the browser.
//
// The site has no API. Reading means fetching its pages with your session
// cookie and picking the projects and updates out of the HTML. Adding a project
// means doing what a browser with JavaScript turned off would do: load the form,
// copy its hidden action fields, and post the form back. Both work until the
// site changes its pages (see docs/api-proposal.md for why an API would help).
//
//   node bin/hgt.mjs news                       new projects since last run + latest weekly updates
//   node bin/hgt.mjs projects                   every project
//   node bin/hgt.mjs project <id or name>       one project in full
//   node bin/hgt.mjs mine                       your projects (hidden ones included)
//   node bin/hgt.mjs updates [count]            weekly updates from the last few meetups (default 2)
//   node bin/hgt.mjs cookie                     save the Cookie header from your clipboard to .env
//   node bin/hgt.mjs doctor                     check your setup and whether you're signed in
//   node bin/hgt.mjs check projects/x.json      no network
//   node bin/hgt.mjs add projects/x.json        dry run: loads the form, posts nothing
//   node bin/hgt.mjs add projects/x.json --submit
//
// Add --json to any read command for output an AI assistant can work with.

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The same limits the form enforces in the browser (read from the form on 2026-10-29).
const STATUSES = ["idea", "planning", "building", "testing", "launched", "paused"];
const LOOKING_FOR = ["feedback", "collaborators", "testers", "users", "advice"];
const LIMITS = { name: 80, pitch: 140, description: 5000, tags: 8, tech_stack: 12, links: 4 };
// Fields this script fills. If the form stops having one of them, the site has changed.
const EXPECTED = ["name", "pitch", "description", "tags", "status", "looking_for", "tech_stack", "links", "hidden"];

function loadEnv() {
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/** Sets HGT_COOKIE in .env, keeping the file's other lines. The cookie is never printed. */
function saveCookie(cookie) {
  const file = join(ROOT, ".env");
  const old = existsSync(file) ? readFileSync(file, "utf8") : readFileSync(join(ROOT, ".env.example"), "utf8");
  const line = `HGT_COOKIE=${cookie}`;
  writeFileSync(file, /^HGT_COOKIE=.*$/m.test(old) ? old.replace(/^HGT_COOKIE=.*$/m, () => line) : `${old.trimEnd()}\n${line}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  process.env.HGT_COOKIE = cookie;
}

function readClipboard() {
  const readers = [
    ["pbpaste", []], // macOS
    ["wl-paste", ["--no-newline"]], // Linux, Wayland
    ["xclip", ["-o", "-selection", "clipboard"]], // Linux, X11
    ["powershell.exe", ["-NoProfile", "-Command", "Get-Clipboard -Raw"]], // Windows (and WSL)
    ["pwsh", ["-NoProfile", "-Command", "Get-Clipboard -Raw"]],
  ];
  for (const [cmd, args] of readers) {
    try {
      return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {}
  }
  return null;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function readProject(path) {
  let p;
  try {
    p = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`could not read ${path}: ${e.message}`);
  }
  const problems = [];
  const list = (v) => (Array.isArray(v) ? v : v ? String(v).split(",") : []).map((s) => String(s).trim()).filter(Boolean);
  const project = {
    name: String(p.name ?? "").trim(),
    pitch: String(p.pitch ?? "").trim(),
    description: String(p.description ?? "").trim(),
    tags: list(p.tags).map((t) => (t.startsWith("#") ? t : `#${t}`)),
    status: p.status ?? "",
    looking_for: list(p.looking_for),
    tech_stack: list(p.tech_stack),
    links: list(p.links),
    hidden: !!p.hidden,
  };
  if (!project.name) problems.push("name is required");
  for (const k of ["name", "pitch", "description"]) {
    if (project[k].length > LIMITS[k]) problems.push(`${k} is ${project[k].length} characters; the limit is ${LIMITS[k]}`);
  }
  for (const k of ["tags", "tech_stack", "links"]) {
    if (project[k].length > LIMITS[k]) problems.push(`${k} has ${project[k].length} entries; the limit is ${LIMITS[k]}`);
  }
  if (project.status && !STATUSES.includes(project.status)) problems.push(`status must be one of ${STATUSES.join(", ")}`);
  const unknown = project.looking_for.filter((x) => !LOOKING_FOR.includes(x));
  if (unknown.length) problems.push(`looking_for can only hold ${LOOKING_FOR.join(", ")} (got ${unknown.join(", ")})`);
  for (const l of project.links) {
    try {
      new URL(l);
    } catch {
      problems.push(`not a full URL: ${l}`);
    }
  }
  if (problems.length) fail(`${path} has problems:\n  - ${problems.join("\n  - ")}`);
  return project;
}

function show(project) {
  console.log(`  name         ${project.name}`);
  console.log(`  pitch        ${project.pitch} (${project.pitch.length}/140)`);
  console.log(`  description  ${project.description.length} characters`);
  console.log(`  tags         ${project.tags.join(", ")}`);
  console.log(`  status       ${project.status || "(none)"}`);
  console.log(`  looking for  ${project.looking_for.join(", ") || "(nothing)"}`);
  console.log(`  tech stack   ${project.tech_stack.join(", ")}`);
  console.log(`  links        ${project.links.join("  ") || "(none)"}`);
  console.log(`  hidden       ${project.hidden ? "yes — only you will see it" : "no — every member will see it"}`);
}

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** An HTML fragment as its lines of visible text. */
function lines(html) {
  return decode(
    html
      .replace(/<!-- -->/g, "")
      .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/g, "")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/(p|div|h\d|li|section|article|ul|a|span|label|button|dt|dd)>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** The element starting at `from` (a <div>), through its matching </div>. */
function balancedDiv(html, from) {
  const tag = /<div\b[^>]*>|<\/div>/g;
  tag.lastIndex = from;
  let depth = 0;
  for (let m; (m = tag.exec(html)); ) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return html.slice(from, tag.lastIndex);
  }
  return html.slice(from);
}

/**
 * Next.js streams slow parts of a page as hidden <div id="S:n"> blocks at the end, and a script
 * moves each into its placeholder. Do the same moves here, so a project card or page reads whole.
 */
function unstream(html) {
  for (const [, fn, a, b] of [...html.matchAll(/\$(RS|RC)\("([^"]+)","([^"]+)"\)/g)]) {
    const [seg, target] = fn === "RS" ? [a, b] : [b, a];
    const at = html.indexOf(`<div hidden id="${seg}">`);
    if (at < 0) continue;
    const block = balancedDiv(html, at);
    const inner = block.slice(block.indexOf(">") + 1, -"</div>".length);
    html = html.replace(block, "");
    if (fn === "RS") html = html.replace(`<template id="${target}"></template>`, () => inner);
    // A suspense boundary: <!--$?--><template id="B:n"></template>fallback<!--/$--> becomes the content.
    else html = html.replace(new RegExp(`<template id="${target}"></template>[\\s\\S]*?<!--/\\$-->`), () => inner);
  }
  return html;
}

const UUID ="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const articles = (html) => html.match(/<article\b[\s\S]*?<\/article>/g) ?? [];

/** A project card as the Projects page and profiles draw it. */
function parseCard(card) {
  const named = [...card.matchAll(new RegExp(`href="/projects/(${UUID})"[^>]*>([\\s\\S]*?)</a>`, "g"))].find((m) => lines(m[2]).length);
  if (!named) return null;
  const owner = card.match(new RegExp(`href="/members/(${UUID})"[^>]*>([\\s\\S]*?)</a>`));
  const afterName = card.slice(card.indexOf(named[0]) + named[0].length);
  const text = lines(card);
  const status = text.findLast((l) => STATUSES.includes(l.toLowerCase()));
  return {
    id: named[1],
    name: lines(named[2]).join(" "),
    owner: owner ? lines(owner[2]).join(" ") : null,
    owner_id: owner?.[1] ?? null,
    pitch: lines(afterName.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "").join(" "),
    tags: [...card.matchAll(/href="\/projects\?tag=([^"&]+)"/g)].map((m) => `#${decodeURIComponent(m[1])}`),
    status: status?.toLowerCase() ?? null,
  };
}

/** The add-project form's fields, read from the page's HTML. Hidden values stay in memory, never printed. */
function parseForm(html) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const form = forms.find((f) => /name="pitch"/.test(f));
  if (!form) return null;
  const fields = [];
  for (const tag of form.match(/<(input|textarea)\b[^>]*>/g) ?? []) {
    const attr = (a) => tag.match(new RegExp(`\\s${a.replace("$", "\\$")}="([^"]*)"`))?.[1];
    const name = attr("name");
    const type = tag.startsWith("<textarea") ? "textarea" : attr("type") ?? "text";
    if (name) fields.push({ name: decode(name), type, value: decode(attr("value") ?? "") });
  }
  return fields;
}

function session() {
  const base = (process.env.HGT_BASE || "https://newhaven.homegrowntech.dev").replace(/\/$/, "");
  const cookie = process.env.HGT_COOKIE;
  if (!cookie) fail("HGT_COOKIE is not set. Copy .env.example to .env and paste your Cookie header into it (see README).");
  return { base, headers: { Cookie: cookie, "User-Agent": "homegrown-scripts" } };
}

/**
 * The site's sign-in lasts an hour, then the server hands back renewed cookies. Saving them to .env
 * keeps the script signed in without copying a fresh cookie from the browser each hour.
 */
function keepRefreshedCookies(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  if (!set.length) return;
  const jar = new Map(
    process.env.HGT_COOKIE.split(/;\s*/)
      .filter(Boolean)
      .map((c) => [c.slice(0, c.indexOf("=")), c.slice(c.indexOf("=") + 1)]),
  );
  for (const h of set) {
    const [pair, ...attrs] = h.split(/;\s*/);
    const name = pair.slice(0, pair.indexOf("="));
    const value = pair.slice(pair.indexOf("=") + 1);
    const gone = !value || attrs.some((a) => /^max-age=0$/i.test(a) || (/^expires=/i.test(a) && new Date(a.slice(8)) < new Date()));
    if (gone) jar.delete(name);
    else jar.set(name, value);
  }
  saveCookie([...jar].map(([k, v]) => `${k}=${v}`).join("; "));
}

/** A signed-in page's HTML. Set HGT_SAVE_HTML=1 to keep a copy in data/html/ when a parser needs fixing. */
async function getPage(path) {
  const { base, headers } = session();
  const page = await fetch(`${base}${path}`, { headers, redirect: "manual" });
  if (page.status >= 300 && page.status < 400) {
    fail(`the site sent us to ${page.headers.get("location")}: your cookie has probably expired. Copy a fresh one.`);
  }
  if (!page.ok) fail(`${path} answered ${page.status}`);
  const html = unstream(await page.text());
  keepRefreshedCookies(page);
  if (process.env.HGT_SAVE_HTML) {
    mkdirSync(join(ROOT, "data/html"), { recursive: true });
    writeFileSync(join(ROOT, "data/html", `${path.replace(/[^a-z0-9]+/gi, "_") || "_"}.html`), html);
  }
  return html;
}

async function listProjects() {
  const projects = articles(await getPage("/projects")).map(parseCard).filter(Boolean);
  if (!projects.length) fail("found no projects on /projects. The site has changed: this is why an API helps.");
  return projects;
}

async function myProfile() {
  const home = await getPage("/");
  const me = home.match(new RegExp(`href="(/members/${UUID})"[^>]*>(?:(?!</a>)[\\s\\S])*Your profile`))?.[1];
  if (!me) fail("could not find your profile link on the home page. The site has changed.");
  return me;
}

async function getProject(idOrName) {
  let id = idOrName;
  if (!new RegExp(`^${UUID}$`).test(idOrName)) {
    const all = await listProjects();
    const want = idOrName.toLowerCase();
    const hits = all.filter((p) => p.name.toLowerCase() === want);
    const near = hits.length ? hits : all.filter((p) => p.name.toLowerCase().includes(want));
    if (near.length !== 1) fail(near.length ? `"${idOrName}" matches ${near.map((p) => p.name).join(", ")}` : `no project called "${idOrName}"`);
    id = near[0].id;
  }
  const html = await getPage(`/projects/${id}`);
  const article = articles(html).find((a) => a.includes(`/projects/${id}`) || /built with/i.test(a)) ?? articles(html)[0];
  if (!article) fail(`could not find the project on /projects/${id}. The site has changed.`);
  const text = lines(article);
  const owner = article.match(new RegExp(`href="/members/(${UUID})"[^>]*>([\\s\\S]*?)</a>`));
  const builtWith = text.findIndex((l) => /^built with$/i.test(l));
  const linksAt = text.findIndex((l) => /^links$/i.test(l));
  const links = [...article.matchAll(/href="(https?:\/\/[^"]+)"/g)]
    .map((m) => decode(m[1]))
    .filter((u) => !/homegrowntech\.dev|supabase\.co/.test(u));
  return {
    id,
    url: `${session().base}/projects/${id}`,
    owner: owner ? lines(owner[2]).join(" ") : null,
    owner_id: owner?.[1] ?? null,
    tech_stack: builtWith >= 0 ? text.slice(builtWith + 1, linksAt > builtWith ? linksAt : undefined) : [],
    links: [...new Set(links)],
    // The page as text, so a person or an assistant can read the description, status and tags in context.
    text: text.join("\n"),
  };
}

/** The current meetup and the past ones listed on it, newest first. */
async function listMeetups() {
  const html = await getPage("/meetups");
  const current = html.match(new RegExp(`href="/meetups/(${UUID})/calendar"`))?.[1];
  const past = [...html.matchAll(new RegExp(`href="/meetups/(${UUID})"[^>]*>([\\s\\S]*?)</a>`, "g"))]
    .map((m) => ({ id: m[1], label: lines(m[2]).join(" ") }))
    .filter((m) => m.id !== current);
  return [...(current ? [{ id: current, label: "this week", html }] : []), ...past];
}

/** The weekly updates posted to one meetup. */
async function meetupUpdates(meetup) {
  const html = meetup.html ?? (await getPage(`/meetups/${meetup.id}`));
  const date = lines(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").join(" ");
  const updates = [];
  for (const a of articles(html)) {
    const text = lines(a);
    const news = text.indexOf("News");
    const needs = text.indexOf("Needs");
    if (news < 0 && needs < 0) continue;
    const member = a.match(new RegExp(`href="/members/${UUID}"[^>]*>([\\s\\S]*?)</a>`));
    const project = a.match(new RegExp(`href="/projects/${UUID}"[^>]*>([\\s\\S]*?)</a>`));
    const part = (from, to) => (from < 0 ? "" : text.slice(from + 1, to > from ? to : undefined).filter((l) => !/I can help$/.test(l)).join("\n"));
    updates.push({
      member: member ? lines(member[1]).join(" ") : null,
      project: project ? lines(project[1]).join(" ") : null,
      news: part(news, needs),
      needs: part(needs, -1),
    });
  }
  return { meetup: date || meetup.label, id: meetup.id, updates };
}

async function recentUpdates(count) {
  const meetups = (await listMeetups()).slice(0, count);
  const out = [];
  for (const m of meetups) out.push(await meetupUpdates(m));
  return out;
}

const SNAPSHOT = join(ROOT, "data/projects.json");

/** Projects that are new or changed since the last run, then remembers this run. */
function compareWithSnapshot(projects) {
  const before = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify({ taken: new Date().toISOString(), projects }, null, 2));
  if (!before) return { since: null, added: projects, changed: [], removed: [] };
  const old = new Map(before.projects.map((p) => [p.id, p]));
  const now = new Set(projects.map((p) => p.id));
  const changed = [];
  for (const p of projects) {
    const o = old.get(p.id);
    if (!o) continue;
    const what = ["name", "pitch", "status", "tags"].filter((k) => JSON.stringify(o[k]) !== JSON.stringify(p[k]));
    if (what.length) changed.push({ ...p, changed: Object.fromEntries(what.map((k) => [k, { was: o[k], now: p[k] }])) });
  }
  return {
    since: before.taken,
    added: projects.filter((p) => !old.has(p.id)),
    changed,
    removed: before.projects.filter((p) => !now.has(p.id)),
  };
}

const card = (p) => `  ${p.name}${p.status ? ` [${p.status}]` : ""} — ${p.owner ?? "?"}\n    ${p.pitch}${p.tags.length ? `\n    ${p.tags.join(" ")}` : ""}`;

function printUpdates(meetings) {
  for (const m of meetings) {
    console.log(`\n${m.meetup} — ${m.updates.length} update${m.updates.length === 1 ? "" : "s"}`);
    for (const u of m.updates) {
      console.log(`  ${u.member ?? "?"}${u.project ? ` (${u.project})` : ""}`);
      if (u.news) console.log(`    News: ${u.news.replace(/\n/g, "\n          ")}`);
      if (u.needs) console.log(`    Needs: ${u.needs.replace(/\n/g, "\n           ")}`);
    }
  }
}

async function add(path, submit) {
  const project = readProject(path);
  const { base, headers } = session();

  console.log(`→ loading ${base}/projects/new`);
  const fields = parseForm(await getPage("/projects/new"));
  if (!fields) fail("could not find the Add project form on the page. The site has changed: this is why an API helps.");

  const names = new Set(fields.map((f) => f.name));
  const missing = EXPECTED.filter((n) => !names.has(n));
  if (missing.length) fail(`the form no longer has: ${missing.join(", ")}. The site has changed: this is why an API helps.`);
  const actionFields = fields.filter((f) => f.name.startsWith("$ACTION"));
  if (actionFields.length === 0) fail("the form has no server-action fields any more. The site has changed.");
  const extra = [...names].filter((n) => !n.startsWith("$ACTION") && !EXPECTED.includes(n) && n !== "screenshot_path");
  if (extra.length) console.log(`! the form has fields this script doesn't know (left empty): ${extra.join(", ")}`);
  console.log(`✓ form found, ${actionFields.length} hidden action fields copied (values not shown)`);
  show(project);

  if (!submit) {
    console.log("\nDry run: nothing was sent. Add --submit to add this project.");
    return;
  }

  const body = new FormData();
  for (const f of actionFields) body.append(f.name, f.value);
  body.append("name", project.name);
  body.append("pitch", project.pitch);
  body.append("screenshot_path", "");
  body.append("description", project.description);
  body.append("tags", project.tags.join(", "));
  if (project.status) body.append("status", project.status);
  for (const x of project.looking_for) body.append("looking_for", x);
  body.append("tech_stack", project.tech_stack.join(", "));
  for (let i = 0; i < 4; i++) body.append("links", project.links[i] ?? "");
  if (project.hidden) body.append("hidden", "on");

  console.log("\n→ submitting");
  // Next.js refuses server-action posts whose Origin doesn't match the site.
  const res = await fetch(`${base}/projects/new`, { method: "POST", headers: { ...headers, Origin: base }, body, redirect: "manual" });
  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location && /\/projects\/[0-9a-f-]{36}/.test(location)) {
    console.log(`✓ added: ${new URL(location, base)}`);
  } else if (location) {
    fail(`the site answered ${res.status} and sent us to ${location}. Check the projects page before trying again.`);
  } else {
    fail(`the site answered ${res.status} without saying where the new project is. It may have refused a field, or the session expired. Check the projects page before trying again.`);
  }
}

/**
 * When the saved sign-in runs out, read from the site's own session cookie (Supabase stores it as
 * "base64-" + JSON, sometimes split across .0, .1 ... cookies). Only the expiry is read; nothing is printed.
 */
function sessionExpiry() {
  try {
    const parts = (process.env.HGT_COOKIE || "")
      .split(/;\s*/)
      .map((c) => [c.slice(0, c.indexOf("=")), c.slice(c.indexOf("=") + 1)])
      .filter(([k]) => /^sb-.*-auth-token(\.\d+)?$/.test(k))
      .sort(([a], [b]) => Number(a.split(".").pop()) - Number(b.split(".").pop()));
    let raw = decodeURIComponent(parts.map(([, v]) => v).join(""));
    if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64url").toString("utf8");
    const at = JSON.parse(raw).expires_at;
    return at ? new Date(at * 1000) : null;
  } catch {
    return null;
  }
}

async function doctor() {
  const ok = (m) => console.log(`✓ ${m}`);
  const warn = (m) => console.log(`! ${m}`);
  const major = Number(process.versions.node.split(".")[0]);
  major >= 20 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} is too old; install Node 20 or newer.`);
  if (!process.env.HGT_COOKIE) fail("no login saved yet. Follow the README's setup, then run: node bin/hgt.mjs cookie");
  ok("a login is saved in .env (not shown)");
  try {
    const hooks = execFileSync("git", ["config", "core.hooksPath"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    hooks === ".githooks" ? ok("the commit check is on") : warn("the commit check is off. Turn it on: git config core.hooksPath .githooks");
  } catch {
    warn("the commit check is off. Turn it on: git config core.hooksPath .githooks");
  }
  const me = await myProfile(); // fails with a plain message if the login has run out
  ok(`signed in: ${session().base}${me}`);
  const until = sessionExpiry();
  if (until) {
    const mins = Math.round((until - Date.now()) / 60000);
    ok(mins > 0 ? `this sign-in renews itself in about ${mins} minutes; the script saves each renewal` : "the sign-in was just renewed and saved");
  }
}

loadEnv();
const argv = process.argv.slice(2);
const json = argv.includes("--json");
const [cmd, file, ...rest] = argv.filter((a) => a !== "--json");
const out = (data, print) => (json ? console.log(JSON.stringify(data, null, 2)) : print(data));

if (cmd === "cookie") {
  // Read from the clipboard (or stdin: `pbpaste | node bin/hgt.mjs cookie -`) so the cookie never lands in shell history.
  let cookie = file === "-" ? readFileSync(0, "utf8") : readClipboard();
  if (cookie == null) fail("could not read the clipboard. Pipe the cookie in instead: node bin/hgt.mjs cookie - < file");
  cookie = cookie.trim().replace(/^cookie:\s*/i, "");
  if (!/^[^=;\s]+=/.test(cookie) || /\n/.test(cookie)) fail("the clipboard doesn't hold a Cookie header. Copy the Cookie value from DevTools (see README) and try again.");
  saveCookie(cookie);
  console.log(`✓ saved a ${cookie.length}-character cookie to .env (not shown)`);
} else if (cmd === "doctor") {
  await doctor();
} else if (cmd === "check" && file) {
  const project = readProject(file);
  console.log(`✓ ${file} passes the form's limits`);
  show(project);
} else if (cmd === "add" && file) {
  await add(file, rest.includes("--submit"));
} else if (cmd === "projects") {
  out(await listProjects(), (ps) => {
    console.log(`${ps.length} projects`);
    for (const p of ps) console.log(card(p));
  });
} else if (cmd === "project" && file) {
  out(await getProject([file, ...rest].join(" ")), (p) => console.log(`${p.text}\n\n${p.url}`));
} else if (cmd === "mine") {
  const me = await myProfile();
  const ps = articles(await getPage(me)).map(parseCard).filter(Boolean);
  out(ps, (ps) => {
    console.log(`${ps.length} of your projects`);
    for (const p of ps) console.log(card(p));
  });
} else if (cmd === "updates") {
  out(await recentUpdates(Number(file) || 2), printUpdates);
} else if (cmd === "news") {
  const diff = compareWithSnapshot(await listProjects());
  const updates = await recentUpdates(2);
  out({ ...diff, updates }, (d) => {
    if (!d.since) console.log(`First run: ${d.added.length} projects on the site. Next time this shows what's new since now.`);
    else {
      const when = new Date(d.since).toLocaleString();
      console.log(d.added.length ? `New projects since ${when}:` : `No new projects since ${when}.`);
      for (const p of d.added) console.log(card(p));
      if (d.changed.length) console.log("\nChanged:");
      for (const p of d.changed) {
        console.log(`  ${p.name}: ${Object.entries(p.changed).map(([k, v]) => `${k} ${JSON.stringify(v.was)} → ${JSON.stringify(v.now)}`).join("; ")}`);
      }
      if (d.removed.length) console.log(`\nGone (or hidden): ${d.removed.map((p) => p.name).join(", ")}`);
    }
    printUpdates(d.updates);
  });
} else {
  console.log(
    "usage:\n  node bin/hgt.mjs cookie   (saves the Cookie header from your clipboard)\n  node bin/hgt.mjs doctor   (checks your setup and sign-in)\n  node bin/hgt.mjs news | projects | project <id or name> | mine | updates [count]   (add --json for assistants)\n" +
      "  node bin/hgt.mjs check <project.json>\n  node bin/hgt.mjs add <project.json> [--submit]",
  );
  process.exit(cmd ? 1 : 0);
}
