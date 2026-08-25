#!/usr/bin/env node
/**
 * Layout audit — every screen, drawn for real, checked for content that falls off it.
 *
 * The 640×480 stage clips whatever does not fit, so an over-long table or an over-tall
 * dialog silently takes its button row off screen. Neither `svelte-check` nor a unit test
 * can see that: it only exists once a browser has laid the screen out. This script boots
 * the dev server, drives a headless Chromium over every screen (and every modal, and the
 * worst-case data we can force into them), and runs `findOverflows()` from
 * `src/ui/overflow-guard.ts` on each one.
 *
 *   node scripts/layout-audit.mjs            # audit, exit 1 on any finding
 *   node scripts/layout-audit.mjs --headful  # same, with a visible browser
 *   node scripts/layout-audit.mjs market     # only scenarios whose name matches
 *
 * No test dependency: Chromium is driven over the DevTools protocol with node's own
 * WebSocket. Set CHROME to pick a binary.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 5199;
// vite binds ::1 for `localhost`, so ask for the name rather than 127.0.0.1
const ORIGIN = `http://localhost:${PORT}/`;
const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  process.env.CHROME_PATH,
].filter(Boolean);

/** Viewports to check. The stage scales uniformly, so these differ in rounding, not layout. */
const VIEWPORTS = [
  { name: '640×480', width: 640, height: 480 },
  { name: '1024×768', width: 1024, height: 768 },
];

// ---------------------------------------------------------------- scenarios

/** Six human seats plus an opponent — the widest the setup screen allows. */
const HUMANS = [
  'Slev & Sons Interstellar Freight',
  'Gurttle Brothers',
  'Zobrok Holdings',
  'Nectum Line',
  'Quaso Cartage',
  'Snoz Freight',
];

/** A game in progress, with every list on every screen pushed to its worst case. */
const BOOT = `
  const g = opengaz.game;
  g.start({
    seed: 'layout-audit',
    level: 'master',
    humans: ${JSON.stringify(HUMANS)}.map((name, i) => ({ name, ship: 1 + i })),
    ai: 1,
  });
  const s = structuredClone(g.state);
  const com = s.commodities;
  for (const co of s.companies) {
    // hold every commodity at once, in the hold and in the warehouse of every planet
    co.cargo = Object.fromEntries(com.map((c) => [c, { tons: 99, paid: 1234 }]));
    co.warehouse = Object.fromEntries(
      s.planets.map((_, i) => [i, Object.fromEntries(com.map((c) => [c, { tons: 99, paid: 1234 }]))]),
    );
    co.shares = Object.fromEntries(s.planets.map((_, i) => [i, { tons: 999, paid: 1700 }]));
    co.cash = 987654321;
    co.bank = 123456789;
    co.unionLoan = 55555;
    co.zinnLoan = 444444;
    co.wagesOwed = 33333;
    co.taxOwedPassenger = 22222;
    co.taxOwedTariff = 11111;
    co.paxWaiting = 99;
    co.passengers = co.ship.seats;
  }
  // a long log: the report / arrival / waiting screens all list it
  s.log = Array.from({ length: 60 }, (_, i) => ({
    week: 1 + (i % 5),
    company: i % 3 === 0 ? -1 : i % s.companies.length,
    kind: ['news', 'event', 'info', 'warn', 'good', 'bad'][i % 6],
    text: 'A very long log line about something that happened on a planet far away, entry ' + i,
  }));
  s.arrivalReports = s.log.slice(0, 12);
  s.week = 47;
  g.state = s;
`;

const PENDING = `
  const s2 = structuredClone(opengaz.game.state);
  s2.pending = {
    id: 'pirates',
    title: 'Pirates of the Nectum Belt',
    text: 'A very long event text '.repeat(12),
    choices: [
      { id: 'fight', label: 'Fight them off with everything the ship has' },
      { id: 'pay', label: 'Pay the ransom and limp onwards' },
      { id: 'run', label: 'Run for the nearest jump point' },
    ],
    portrait: 'pirates',
    mood: 'bad',
    context: 'travel',
  };
  s2.phase = 'event';
  opengaz.game.state = s2;
`;

/** `go(screen)` covers most of them; the rest need a bit of state or a click first. */
const SIMPLE_SCREENS = [
  'menu',
  'market',
  'supply',
  'warehouse',
  'passengers',
  'advertise',
  'crew',
  'taxes',
  'insurance',
  'explore',
  'stock',
  'money',
  'bank',
  'loan',
  'zinn',
  'fuel',
  'file',
  'shortcuts',
  'map',
  'charts',
  'report',
  'handoff',
  'arrival',
  'dispatch',
  'travel',
  'weekchart',
];

const scenarios = [
  { name: 'title', setup: `` },
  { name: 'setup', setup: `opengaz.game.go('setup')` },
  {
    name: 'setup:six-players',
    setup: `
      opengaz.game.go('setup'); await $$tick();
      for (let i = 1; i < 6; i++) { await $$click('button', '+ add human'); }
      for (const inp of document.querySelectorAll('.row input[type=text]'))
        { inp.value = ${JSON.stringify(HUMANS[0])}; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    `,
  },
  {
    // the regression that started this: 12 ships in a dialog inside a 480px-tall stage
    name: 'setup:ship-dialog',
    setup: `opengaz.game.go('setup'); await $$tick(); await $$click('.ship');`,
  },
  ...SIMPLE_SCREENS.map((screen) => ({
    name: screen,
    setup: `${BOOT}; opengaz.game.go('${screen}')`,
  })),
  { name: 'event', setup: `${BOOT}; ${PENDING}; opengaz.game.go('event')` },
  {
    // a dispatch card about a rival: portrait, headline and body all at once
    name: 'dispatch:rival',
    setup: `${BOOT}
      const s4 = structuredClone(opengaz.game.state);
      s4.arrivalReports[0].about = s4.companies.findIndex((c) => c.isAI);
      s4.arrivalReports[0].header = 'Vandergriff Ltd. arrives on Gazillion Prime';
      opengaz.game.state = s4;
      opengaz.game.go('dispatch')`,
  },
  {
    name: 'gameover',
    setup: `${BOOT}
      const s3 = structuredClone(opengaz.game.state);
      s3.winner = 0; s3.phase = 'winner';
      opengaz.game.state = s3;
      opengaz.game.go('gameover')`,
  },
  {
    // the chart that follows the weekly standings, in both of its forms
    name: 'weekchart:history',
    setup: `${BOOT}; opengaz.game.weekChart = 'history'; opengaz.game.go('weekchart');`,
  },
  {
    name: 'weekchart:strength',
    setup: `${BOOT}; opengaz.game.weekChart = 'strength'; opengaz.game.go('weekchart');`,
  },
  {
    name: 'market:buy-prompt',
    setup: `${BOOT}; opengaz.game.go('market'); await $$tick();
      await $$click('tbody tr'); await $$click('button', 'Buy');`,
  },
  {
    name: 'warehouse:store-prompt',
    setup: `${BOOT}; opengaz.game.go('warehouse'); await $$tick();
      await $$click('tbody tr'); await $$click('button', 'Store');`,
  },
  {
    name: 'stock:buy-prompt',
    setup: `${BOOT}; opengaz.game.go('stock'); await $$tick(); await $$click('button', 'Buy');`,
  },
];

/** Every screen is also checked with its help dialog open (help texts are long). */
const WITH_HELP = new Set(SIMPLE_SCREENS);

// ---------------------------------------------------------------- plumbing

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Helpers the scenario snippets above are written against. */
const PRELUDE = `
  const $$tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
  const $$click = async (sel, text) => {
    const els = [...document.querySelectorAll(sel)];
    const el = text ? els.find((e) => e.textContent.trim().startsWith(text)) : els[0];
    if (!el) throw new Error('nothing to click: ' + sel + (text ? ' “' + text + '”' : ''));
    el.click();
    await $$tick();
  };
`;

async function startDevServer() {
  const proc = spawn(
    'node',
    ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let out = '';
  proc.stdout.on('data', (d) => (out += d));
  proc.stderr.on('data', (d) => (out += d));
  for (let i = 0; i < 120; i++) {
    if (/ready in/.test(out)) return proc;
    if (proc.exitCode !== null) throw new Error(`vite exited:\n${out}`);
    await sleep(250);
  }
  throw new Error(`vite did not come up:\n${out}`);
}

async function startChrome(headful) {
  const bin = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!bin) throw new Error('no Chromium/Chrome found — set CHROME=/path/to/chrome');
  const profile = mkdtempSync(join(tmpdir(), 'opengaz-audit-'));
  const proc = spawn(
    bin,
    [
      headful ? '--auto-open-devtools-for-tabs' : '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      // the page is our own dev server on localhost; CI containers have no usable sandbox
      '--no-sandbox',
      '--disable-dev-shm-usage',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let err = '';
  proc.stderr.on('data', (d) => (err += d));
  let wsUrl = null;
  for (let i = 0; i < 120 && !wsUrl; i++) {
    const m = /ws:\/\/[^\s]+/.exec(err);
    if (m) wsUrl = m[0];
    else await sleep(250);
  }
  if (!wsUrl) throw new Error(`chrome did not expose a debugging port:\n${err}`);
  return { proc, wsUrl, profile };
}

/** Minimal CDP client over node's built-in WebSocket. */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  const sessions = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) rej(new Error(m.error.message));
      else res(m.result);
    } else if (m.method && sessions.has(m.sessionId)) sessions.get(m.sessionId)(m);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });
  return { send, close: () => ws.close(), sessions };
}

async function main() {
  const argv = process.argv.slice(2);
  const headful = argv.includes('--headful');
  const filter = argv.find((a) => !a.startsWith('--'));
  const picked = filter ? scenarios.filter((s) => s.name.includes(filter)) : scenarios;
  if (!picked.length) throw new Error(`no scenario matches “${filter}”`);

  const vite = await startDevServer();
  const chrome = await startChrome(headful);
  const cdp = await connect(chrome.wsUrl);
  const cleanup = () => {
    cdp.close();
    chrome.proc.kill();
    vite.kill();
    // chrome is still flushing its profile as we go; a leftover temp dir is not worth a failure
    try {
      rmSync(chrome.profile, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* ignore */
    }
  };
  process.on('exit', cleanup);

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const sendPage = (m, p) => cdp.send(m, p, sessionId);
  await sendPage('Page.enable');
  await sendPage('Runtime.enable');
  const consoleErrors = [];
  cdp.sessions.set(sessionId, (m) => {
    if (m.method === 'Runtime.exceptionThrown')
      consoleErrors.push(m.params.exceptionDetails.exception?.description ?? 'exception');
  });

  const run = async (expr) => {
    const r = await sendPage('Runtime.evaluate', {
      expression: `(async () => { ${PRELUDE}\n${expr} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  const failures = [];
  const skipped = [];
  let checks = 0;

  for (const vp of VIEWPORTS) {
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const sc of picked) {
      await sendPage('Page.navigate', { url: ORIGIN });
      try {
        // poll from here rather than in the page: an evaluate issued right after a
        // navigation can still land in the old, about-to-be-discarded execution context
        let booted = false;
        for (let i = 0; i < 80 && !booted; i++) {
          booted = await run(
            `return !!window.opengaz && !!document.querySelector('.stage *')`,
          ).catch(() => false);
          if (!booted) await sleep(150);
        }
        if (!booted) {
          const why = await run(
            `return location.href + ' | ' + document.readyState + ' | ' + document.body.innerHTML.slice(0, 200)`,
          ).catch((e) => 'evaluate failed: ' + e.message);
          throw new Error('app never booted — ' + why);
        }
        await run(sc.setup);
        await run(`await $$tick(); await $$tick();`);
      } catch (e) {
        skipped.push(`${sc.name} @ ${vp.name}: ${String(e.message).split('\n')[0]}`);
        continue;
      }
      const variants = [{ suffix: '', js: '' }];
      if (WITH_HELP.has(sc.name)) variants.push({ suffix: ' + help', js: `opengaz.game.help();` });
      for (const v of variants) {
        if (v.js) await run(`${v.js} await $$tick();`);
        const found = await run(`return opengaz.findOverflows()`);
        checks++;
        if (found.length) failures.push({ scenario: sc.name + v.suffix, viewport: vp.name, found });
        if (v.js) await run(`opengaz.game.helpFor = null; await $$tick();`);
      }
    }
  }

  console.log(`layout audit: ${checks} screen states checked`);
  if (skipped.length) {
    console.log(`\n${skipped.length} scenario(s) could not be set up (coverage gap, not a pass):`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
  if (consoleErrors.length) {
    console.log(`\npage errors seen while auditing:`);
    for (const e of [...new Set(consoleErrors)].slice(0, 10))
      console.log(`  - ${e.split('\n')[0]}`);
  }
  if (!failures.length) {
    console.log('\nno content is clipped off the stage. ✔');
    // a coverage gap is still a red flag in CI
    process.exitCode = skipped.length ? 1 : 0;
    return;
  }
  console.log(`\n${failures.length} screen state(s) push content off the stage:\n`);
  for (const f of failures) {
    console.log(`✗ ${f.scenario} @ ${f.viewport}`);
    for (const o of f.found.slice(0, 8))
      console.log(`    ${o.path} “${o.text}” — ${o.overBy}px past the ${o.edge} of ${o.clippedBy}`);
    if (f.found.length > 8) console.log(`    …and ${f.found.length - 8} more`);
  }
  console.log(
    '\nFix by capping the box and letting the long part scroll: a `max-height` on the\n' +
      'container plus `overflow: auto; min-height: 0` on the list, and `flex: none` on the\n' +
      'header/footer rows. Note that a percentage max-height on a *grid* item resolves\n' +
      'against its own content and is ignored — centre modals with flex.',
  );
  process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
