// site_smoke.mjs — the assembled site in a real (headless) Chrome, served the way GitHub Pages
// serves it: under /grl-snam-demos/, a directory's index.html for the directory, a redirect for a
// directory named without its slash, and no COOP/COEP headers. Modelled on libcvc's
// src/arigl/web/test/arigl_web_smoke.mjs.
//
//   node site_smoke.mjs --site DIR --chrome PATH [--learn-expect REGEX] [--shots DIR] [--external]
//                       [--keep]
//
// Cases:
//   links      every page under the site, crawled from the landing page: each same-origin href,
//              src and poster (and a redirect page's target) must answer 200. Other origins are
//              listed, and with --external fetched too (a failure there only warns).
//   landing    the landing page loads with every image decoded and no CSP violation, under a
//              strict Content-Security-Policy (no inline code or style, nothing from another
//              origin); --shots: landing.png, the whole page.
//   archive    the August project page and its three demo pages load, with their images; the
//              demo pages' old URLs (at the root) land on the archived pages.
//   learn      when the site has learn/: the ariglx-web page runs its document (window.ariadneWeb's
//              state 'running'), Python raised nothing (no Traceback in what the runtime printed),
//              and, with --learn-expect, a line it printed matches REGEX. Served under the same
//              strict CSP, whose connect-src 'self' also says the page loaded nothing from another
//              origin. --shots: learn.png.
//
// Chrome is driven over the DevTools protocol (Node 22's fetch and WebSocket, no other
// dependency). Exit status 0 when every case passes.

import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = name => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SITE = opt('--site'), CHROME = opt('--chrome'), SHOTS = opt('--shots');
const LEARN_EXPECT = opt('--learn-expect') ? new RegExp(opt('--learn-expect')) : null;
const EXTERNAL = argv.includes('--external');
if (!SITE || !CHROME || !fs.existsSync(path.join(SITE, 'index.html'))) {
  console.error('usage: site_smoke.mjs --site DIR --chrome PATH [--learn-expect REGEX] ' +
                '[--shots DIR] [--external] [--keep]');
  process.exit(2);
}
const BASE = '/grl-snam-demos/';
const HAS_LEARN = fs.existsSync(path.join(SITE, 'learn', 'index.html'));
const TIMEOUT_MS = Number(process.env.SITE_SMOKE_TIMEOUT_MS || 240000);

const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; " +
            "connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:";
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
               '.txt': 'text/plain', '.md': 'text/markdown', '.ari': 'text/plain', '.py': 'text/plain',
               '.zip': 'application/zip', '.data': 'application/octet-stream',
               '.gz': 'application/gzip', '.jsonl': 'application/json'};
// The pages the strict CSP applies to: the landing page and the learn page (the archive's pages
// carry their style inline, as published).
const strict = rel => rel === '' || rel === 'index.html' || rel.startsWith('learn/');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (!p.startsWith(BASE) || p.includes('..')) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('not found');
    return;
  }
  const rel = p.slice(BASE.length);
  let f = path.join(SITE, rel);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith('/')) {
      res.writeHead(301, {Location: p + '/' + url.search});
      res.end();
      return;
    }
    f = path.join(f, 'index.html');
  }
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('not found');
    return;
  }
  const headers = {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream',
                   'Cache-Control': 'no-cache', 'Content-Length': fs.statSync(f).size};
  if (strict(rel)) headers['Content-Security-Policy'] = CSP;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const ROOT = ORIGIN + BASE;

const results = [];
function report(name, ok, lines = []) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  for (const l of lines) console.log('  ' + l);
}

// ---- links: a crawl of the site's own pages, without a browser.
{
  const attr = /\b(?:href|src|poster)\s*=\s*"([^"]*)"/g;
  const refresh = /http-equiv="refresh"\s+content="[^"]*url=([^"]+)"/gi;
  const seen = new Map();  // url -> status
  const external = new Set();
  const broken = [];
  const queue = [ROOT];
  const pages = new Set([ROOT]);
  while (queue.length) {
    const page = queue.shift();
    const r = await fetch(page);
    const html = await r.text();
    const refs = [...html.matchAll(attr), ...html.matchAll(refresh)].map(m => m[1]);
    for (const ref of refs) {
      if (!ref || ref.startsWith('#') || /^(mailto|data|javascript):/.test(ref)) continue;
      const u = new URL(ref, page);
      u.hash = '';
      if (u.origin !== ORIGIN) { external.add(u.href); continue; }
      const key = u.href;
      if (!seen.has(key)) {
        const h = await fetch(key, {method: 'HEAD', redirect: 'follow'});
        seen.set(key, h.status);
        const type = h.headers.get('content-type') || '';
        if (h.ok && type.startsWith('text/html') && h.url.startsWith(ROOT) && !pages.has(h.url)) {
          pages.add(h.url);
          queue.push(h.url);
        }
      }
      if (seen.get(key) !== 200) broken.push(`${seen.get(key)} ${key.slice(ORIGIN.length)}  (on ${page.slice(ORIGIN.length)})`);
    }
  }
  const lines = [`${pages.size} pages, ${seen.size} same-origin URLs, ${external.size} on other origins`];
  for (const b of broken) lines.push('broken: ' + b);
  report('links: every same-origin link and file the pages name is there', broken.length === 0, lines);
  if (EXTERNAL) {
    const bad = [];
    for (const u of external) {
      const h = await fetch(u, {method: 'GET', redirect: 'follow'}).catch(e => ({status: String(e)}));
      if (h.status !== 200) bad.push(`${h.status} ${u}`);
    }
    console.log(`${bad.length ? 'WARN' : 'PASS'}  links to other origins answer (${external.size})`);
    for (const b of bad) console.log('  ' + b);
  }
}

// ---- Chrome, headless, its DevTools endpoint on a port it picks.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'site-smoke-'));
const chrome = spawn(CHROME, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
  '--window-size=1280,860', '--hide-scrollbars', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
const devtools = await new Promise((resolve, reject) => {
  let err = '';
  const t = setTimeout(() => reject(new Error('Chrome did not start:\n' + err)), 30000);
  chrome.stderr.on('data', d => {
    err += d;
    const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(err);
    if (m) { clearTimeout(t); resolve(new URL(m[1])); }
  });
  chrome.on('exit', c => reject(new Error(`Chrome exited (${c}):\n` + err)));
});

function withTimeout(promise, ms) {
  let timer;
  const expired = new Promise(r => { timer = setTimeout(() => r(null), ms); });
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer));
}

// One tab per case, with a listener for the page's CSP violations injected before it loads.
async function openPage(url) {
  const r = await fetch(`http://${devtools.host}/json/new?about:blank`, {method: 'PUT'});
  const target = await r.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise(res => {
    pending.set(++id, res);
    ws.send(JSON.stringify({id, method, params}));
  });
  const evaluate = async expr => {
    const m = await withTimeout(send('Runtime.evaluate',
                                     {expression: expr, returnByValue: true, awaitPromise: true}), 15000);
    return m && m.result && m.result.result ? m.result.result.value : undefined;
  };
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__csp = []; document.addEventListener("securitypolicyviolation", ' +
            'e => window.__csp.push(e.effectiveDirective + " " + (e.blockedURI || "inline")));'});
  await send('Page.navigate', {url});
  const close = async () => {
    ws.close();
    await fetch(`http://${devtools.host}/json/close/${target.id}`).catch(() => {});
  };
  const screenshot = async (file, full = false) => {
    const params = {format: 'png'};
    if (full) {
      const m = await withTimeout(send('Page.getLayoutMetrics'), 10000);
      const s = m && m.result && m.result.cssContentSize;
      if (s) Object.assign(params, {captureBeyondViewport: true,
                                    clip: {x: 0, y: 0, width: s.width, height: s.height, scale: 1}});
    }
    const m = await withTimeout(send('Page.captureScreenshot', params), 20000);
    if (!(m && m.result && m.result.data)) return false;
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, Buffer.from(m.result.data, 'base64'));
    return true;
  };
  return {evaluate, screenshot, close};
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// A static page: loaded, every image decoded (lazy ones made eager first), the CSP's reports.
async function staticPage(url) {
  const page = await openPage(url);
  let v;
  for (const until = Date.now() + 30000; Date.now() < until; await sleep(300)) {
    v = await page.evaluate(`(async () => {
      if (document.readyState !== 'complete') return null;
      const imgs = [...document.images];
      for (const i of imgs) i.loading = 'eager';
      await Promise.all(imgs.map(i => i.decode().catch(() => {})));
      return JSON.stringify({href: location.href, title: document.title,
        images: imgs.length, bad: imgs.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src),
        csp: window.__csp || []});
    })()`);
    if (v) break;
  }
  return {page, v: v ? JSON.parse(v) : null};
}

async function checkStatic(name, url, extra = () => [], shot = null) {
  const {page, v} = await staticPage(url);
  const lines = [];
  let ok = !!v;
  if (!v) lines.push('the page never finished loading');
  else {
    lines.push(`"${v.title}", ${v.images} image(s)`);
    for (const b of v.bad) lines.push('image did not load: ' + b);
    for (const c of v.csp) lines.push('CSP violation: ' + c);
    const more = extra(v);
    lines.push(...more);
    ok = v.bad.length === 0 && v.csp.length === 0 && more.length === 0;
  }
  if (SHOTS && shot && !await page.screenshot(path.join(SHOTS, shot), true))
    lines.push('no screenshot');
  report(name, ok, lines);
  await page.close();
}

await checkStatic('landing: the page and its figures load, under a strict CSP', ROOT, () => [],
                  'landing.png');
await checkStatic('archive: the August project page', ROOT + 'archive/2026-08/', () => [],
                  'archive.png');
for (const d of fs.readdirSync(path.join(SITE, 'archive', '2026-08')).filter(d => /^20/.test(d))) {
  await checkStatic(`archive: ${d}`, ROOT + `archive/2026-08/${d}/`);
  // The old URL, at the root, lands on the archived page.
  const page = await openPage(ROOT + `${d}/`);
  let href;
  for (const until = Date.now() + 15000; Date.now() < until; await sleep(300)) {
    href = await page.evaluate('location.href');
    if (href && href.includes('/archive/')) break;
  }
  report(`archive: the old URL ${BASE}${d}/ redirects to it`,
         href === ROOT + `archive/2026-08/${d}/`, [`landed on ${href}`]);
  await page.close();
}

if (HAS_LEARN) {
  const page = await openPage(ROOT + 'learn/');
  const start = Date.now();
  let v, runningMs = 0;
  const check = x => x.state === 'running' && !x.log.some(l => /Traceback/.test(l)) &&
                     (!LEARN_EXPECT || x.log.some(l => LEARN_EXPECT.test(l)));
  for (;;) {
    const s = await page.evaluate(
        'JSON.stringify(window.ariadneWeb ? {state: ariadneWeb.state, log: ariadneWeb.log,' +
        ' warnings: ariadneWeb.warnings || [], csp: window.__csp || [],' +
        ' status: (document.getElementById("status") || {}).textContent || ""} : null)');
    v = s ? JSON.parse(s) : v;
    if (v && v.state === 'running' && !runningMs) runningMs = Date.now() - start;
    if (v && (check(v) || v.state === 'failed')) break;
    if (Date.now() - start > TIMEOUT_MS) break;
    await sleep(500);
  }
  const ok = !!(v && check(v) && v.csp.length === 0);
  const lines = [`state ${v ? v.state : 'none'}` +
                 (runningMs ? `, running after ${(runningMs / 1000).toFixed(1)} s` : '')];
  if (v) {
    if (LEARN_EXPECT) lines.push(...v.log.filter(l => LEARN_EXPECT.test(l)).map(l => '> ' + l));
    for (const w of v.warnings) lines.push('warning: ' + w);
    for (const c of v.csp) lines.push('CSP violation: ' + c);
    if (!ok) {
      lines.push('status: ' + v.status);
      for (const l of v.log.slice(-30)) lines.push('| ' + l);
    }
  } else {
    lines.push('the page never reported its state (no window.ariadneWeb)');
  }
  if (SHOTS) {
    await sleep(4000);  // a few frames past the load
    if (!await page.screenshot(path.join(SHOTS, 'learn.png'))) lines.push('no screenshot');
  }
  report('learn: the ariglx-web page runs grl-snam ariadne learn', ok, lines);
  await page.close();
}

async function closeChrome() {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return;
  const exited = new Promise(r => chrome.once('exit', () => r('exited')));
  const after = ms => new Promise(r => setTimeout(() => r('timeout'), ms));
  try {
    const ws = new WebSocket(devtools.href);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    ws.send(JSON.stringify({id: 1, method: 'Browser.close'}));
  } catch (e) {
    chrome.kill();
  }
  if (await Promise.race([exited, after(10000)]) === 'timeout') {
    chrome.kill('SIGKILL');
    await Promise.race([exited, after(5000)]);
  }
}
await closeChrome();
server.close();
if (!argv.includes('--keep')) {
  try {
    fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  } catch (e) {
    console.warn(`could not remove ${profile}: ${e.message}`);
  }
}
const failures = results.filter(x => !x).length;
console.log(failures ? `${failures} of ${results.length} failed` : `all ${results.length} passed`);
process.exit(failures ? 1 : 0);
