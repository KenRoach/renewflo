#!/usr/bin/env node
// KitZ backend challenge — automated grader (PRIVATE: do not share with candidates).
// Usage: BASE_URL=http://localhost:3000 node grade.mjs
// Run against a FRESH database (no prior appointments). Node 20+, no dependencies.

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SECRET = 'test-secret';
const KEY_A = 'key_clinic_a';
const KEY_B = 'key_clinic_b';
const RUN = Date.now().toString(36); // unique messageIds per run

// Pick a weekday at least 14 days out so "in the past" never bites.
function futureWeekday(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const DAY = futureWeekday(14);
const DAY2 = futureWeekday(21);
const SATURDAY = (() => {
  const d = new Date(`${DAY}T12:00:00Z`);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();
const MONTH_NOW = new Date().toISOString().slice(0, 7);

let n = 0;
const msg = (over = {}) => ({
  messageId: `wamid.${RUN}.${++n}`,
  clinicId: 'clinic_a',
  from: `+5076${String(1000000 + n).slice(-7)}`,
  text: `Hola, quiero una cita el ${DAY} a las 10:00`,
  timestamp: new Date().toISOString(),
  ...over,
});

async function call(method, path, { body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}
const hook = (body, secret = SECRET) =>
  call('POST', '/webhooks/whatsapp', { body, headers: secret ? { 'x-webhook-secret': secret } : {} });
const authed = (path, key) => call('GET', path, { headers: key ? { authorization: `Bearer ${key}` } : {} });
const usage = async (key) => (await authed(`/usage?month=${MONTH_NOW}`, key)).json?.transactions;

const results = [];
async function check(area, points, name, fn) {
  try {
    const ok = await fn();
    results.push({ area, points, name, ok: !!ok });
  } catch (e) {
    results.push({ area, points, name, ok: false, err: e.message });
  }
}

// ---------- Contract basics ----------
await check('contract', 3, 'missing/wrong webhook secret → 401', async () =>
  (await hook(msg(), null)).status === 401 && (await hook(msg(), 'nope')).status === 401);
await check('contract', 3, 'malformed body → 400', async () =>
  (await hook({ messageId: 'x' })).status === 400 && (await hook('{not json')).status === 400);
await check('contract', 2, 'invalid phone (not E.164) → 400', async () =>
  (await hook(msg({ from: '6123-4567' }))).status === 400);
await check('contract', 2, 'unknown clinic → 400', async () =>
  (await hook(msg({ clinicId: 'clinic_zzz' }))).status === 400);
await check('contract', 2, 'GET /appointments without key → 401', async () =>
  (await authed('/appointments')).status === 401 && (await authed('/appointments', 'bad')).status === 401);

// ---------- Booking ----------
const usageBefore = await usage(KEY_A);
let bookedId;
await check('booking', 5, 'valid request → booked + appointmentId', async () => {
  const r = await hook(msg());
  bookedId = r.json?.appointmentId;
  return r.status === 200 && r.json?.status === 'booked' && bookedId;
});
await check('booking', 4, 'same slot again → slot_taken with a suggestion in reply', async () => {
  const r = await hook(msg());
  return r.json?.status === 'slot_taken' && typeof r.json?.reply === 'string' && /\d{1,2}:\d{2}/.test(r.json.reply);
});
await check('booking', 2, 'weekend → invalid_slot', async () =>
  (await hook(msg({ text: `cita el ${SATURDAY} a las 10:00` }))).json?.status === 'invalid_slot');
await check('booking', 2, 'outside hours (07:00 and 17:00) → invalid_slot', async () =>
  (await hook(msg({ text: `cita el ${DAY} a las 07:00` }))).json?.status === 'invalid_slot' &&
  (await hook(msg({ text: `cita el ${DAY} a las 17:00` }))).json?.status === 'invalid_slot');
await check('booking', 2, 'not aligned to :00/:30 → invalid_slot', async () =>
  (await hook(msg({ text: `cita el ${DAY} a las 10:15` }))).json?.status === 'invalid_slot');
await check('booking', 2, 'past date → invalid_slot', async () =>
  (await hook(msg({ text: 'cita el 2020-01-06 a las 10:00' }))).json?.status === 'invalid_slot');
await check('booking', 2, 'non-booking text → ignored', async () =>
  (await hook(msg({ text: '¿Aceptan seguro?' }))).json?.status === 'ignored');
await check('booking', 3, 'timezone: 10:00 Panama stored as 15:00Z', async () => {
  const r = await authed(`/appointments/${bookedId}`, KEY_A);
  return r.status === 200 && new Date(r.json?.startsAt).toISOString() === `${DAY}T15:00:00.000Z`;
});

// ---------- Idempotency ----------
await check('idempotency', 6, 'same messageId x5 sequential → 1 booked, rest duplicate', async () => {
  const m = msg({ text: `cita el ${DAY} a las 11:00` });
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await hook(m)).json?.status);
  return statuses[0] === 'booked' && statuses.slice(1).every((s) => s === 'duplicate');
});
await check('idempotency', 6, 'same messageId x10 in PARALLEL → exactly 1 booked', async () => {
  const m = msg({ text: `cita el ${DAY} a las 11:30` });
  const rs = await Promise.all(Array.from({ length: 10 }, () => hook(m)));
  const s = rs.map((r) => r.json?.status);
  return s.filter((x) => x === 'booked').length === 1 && s.filter((x) => x === 'duplicate').length === 9;
});

// ---------- Concurrency ----------
await check('concurrency', 8, '10 patients, same slot, in parallel → exactly 1 booked', async () => {
  const rs = await Promise.all(
    Array.from({ length: 10 }, () => hook(msg({ text: `cita el ${DAY} a las 14:00` }))),
  );
  const s = rs.map((r) => r.json?.status);
  return s.filter((x) => x === 'booked').length === 1 && s.filter((x) => x === 'slot_taken').length === 9;
});
await check('concurrency', 2, 'same slot at the OTHER clinic is still free', async () =>
  (await hook(msg({ clinicId: 'clinic_b', text: `cita el ${DAY} a las 14:00` }))).json?.status === 'booked');

// ---------- Billing ----------
await check('billing', 8, 'usage counts only successful bookings (expect +4 for clinic_a)', async () => {
  // clinic_a bookings so far: 10:00, 11:00, 11:30, 14:00
  const after = await usage(KEY_A);
  return after - (usageBefore ?? 0) === 4;
});
await check('billing', 4, 'amountUsd = transactions × 0.50', async () => {
  const r = await authed(`/usage?month=${MONTH_NOW}`, KEY_A);
  return Math.abs(r.json?.amountUsd - r.json?.transactions * 0.5) < 1e-9;
});
await check('billing', 3, 'empty month → 0 transactions', async () =>
  (await authed('/usage?month=2019-01', KEY_A)).json?.transactions === 0);

// ---------- Tenant isolation (any failure here = automatic fail) ----------
await check('isolation', 6, 'clinic_b list never contains clinic_a appointments', async () => {
  const r = await authed('/appointments', KEY_B);
  return r.status === 200 && Array.isArray(r.json) && !r.json.some((a) => a.id === bookedId);
});
await check('isolation', 6, 'clinic_b GET clinic_a appointment by id → 404', async () =>
  (await authed(`/appointments/${bookedId}`, KEY_B)).status === 404);
await check('isolation', 3, 'clinic_b usage unaffected by clinic_a (expect 1)', async () =>
  (await usage(KEY_B)) === 1);

// ---------- Robustness ----------
await check('robustness', 3, 'messages for a second day still book (no global state bugs)', async () =>
  (await hook(msg({ text: `cita el ${DAY2} a las 09:30` }))).json?.status === 'booked');

// ---------- Report ----------
const total = results.reduce((s, r) => s + r.points, 0);
const got = results.reduce((s, r) => s + (r.ok ? r.points : 0), 0);
const isolationFail = results.some((r) => r.area === 'isolation' && !r.ok);
const doubleBill = results.some((r) => r.area === 'billing' && r.name.startsWith('usage') && !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.area}] (${r.points}) ${r.name}${r.err ? `  — ${r.err}` : ''}`);
}
console.log(`\nAutomated score: ${got}/${total}  →  scaled to 60: ${Math.round((got / total) * 60)}`);
if (isolationFail) console.log('AUTO-FAIL: tenant isolation broken.');
if (doubleBill) console.log('AUTO-FAIL: billing count wrong (possible double charge).');
process.exit(isolationFail || doubleBill ? 2 : 0);
