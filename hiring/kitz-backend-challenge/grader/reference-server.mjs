#!/usr/bin/env node
// Minimal in-memory reference server — PRIVATE. Exists only to prove grade.mjs is correct.
// It is NOT a model answer: a real submission must use durable storage and DB-level guarantees
// (unique constraints / transactions) for idempotency and double-booking, not a single-threaded Map.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const CLINICS = { clinic_a: 'key_clinic_a', clinic_b: 'key_clinic_b' };
const KEY_TO_CLINIC = Object.fromEntries(Object.entries(CLINICS).map(([c, k]) => [k, c]));
const TZ_OFFSET_H = -5; // America/Panama, no DST
const seen = new Set(); // `${clinicId}:${messageId}`
const appts = []; // {id, clinicId, patientPhone, startsAt, status}
const txns = []; // {clinicId, month}

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

function localToUtc(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return null;
  d.setUTCHours(h - TZ_OFFSET_H, m);
  return d;
}
function validSlot(date, hhmm, utc) {
  const [h, m] = hhmm.split(':').map(Number);
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return utc > new Date() && dow >= 1 && dow <= 5 && (m === 0 || m === 30) && h >= 8 && (h < 17);
}
const taken = (clinicId, utc) =>
  appts.some((a) => a.clinicId === clinicId && a.status === 'booked' && a.startsAt === utc.toISOString());
function nextFree(clinicId, from) {
  const d = new Date(from);
  for (let i = 0; i < 2000; i++) {
    d.setUTCMinutes(d.getUTCMinutes() + 30);
    const local = new Date(d.getTime() + TZ_OFFSET_H * 3600e3);
    const date = local.toISOString().slice(0, 10);
    const hhmm = local.toISOString().slice(11, 16);
    if (validSlot(date, hhmm, d) && !taken(clinicId, d)) return `${date} ${hhmm}`;
  }
  return null;
}

function webhook(body) {
  const ok =
    body && typeof body.messageId === 'string' && body.messageId &&
    typeof body.text === 'string' && typeof body.timestamp === 'string' &&
    !Number.isNaN(Date.parse(body.timestamp)) &&
    typeof body.from === 'string' && /^\+[1-9]\d{7,14}$/.test(body.from) &&
    Object.hasOwn(CLINICS, body.clinicId);
  if (!ok) return [400, { error: 'invalid body' }];
  const key = `${body.clinicId}:${body.messageId}`;
  if (seen.has(key)) return [200, { status: 'duplicate', reply: '' }];
  seen.add(key);

  const match = body.text.match(/(\d{4}-\d{2}-\d{2}).*?(\d{1,2}:\d{2})/);
  if (!/cita/i.test(body.text) || !match) {
    return [200, { status: 'ignored', reply: 'Gracias por escribir. ¿Deseas agendar una cita?' }];
  }
  const [, date, rawTime] = match;
  const hhmm = rawTime.padStart(5, '0');
  const utc = localToUtc(date, hhmm);
  if (!utc || !validSlot(date, hhmm, utc)) {
    return [200, { status: 'invalid_slot', reply: 'Atendemos lunes a viernes de 8:00 a 17:00, en bloques de 30 min.' }];
  }
  if (taken(body.clinicId, utc)) {
    return [200, { status: 'slot_taken', reply: `Ese horario está ocupado. ¿Te sirve ${nextFree(body.clinicId, utc)}?` }];
  }
  const appt = { id: randomUUID(), clinicId: body.clinicId, patientPhone: body.from, startsAt: utc.toISOString(), status: 'booked' };
  appts.push(appt);
  txns.push({ clinicId: body.clinicId, month: new Date().toISOString().slice(0, 7) });
  return [200, { status: 'booked', reply: `Listo, tu cita es el ${date} a las ${hhmm}.`, appointmentId: appt.id }];
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/webhooks/whatsapp') {
      if (req.headers['x-webhook-secret'] !== 'test-secret') return send(res, 401, { error: 'unauthorized' });
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'invalid json' }); }
      return send(res, ...webhook(body));
    }
    const clinicId = KEY_TO_CLINIC[(req.headers.authorization ?? '').replace(/^Bearer /, '')];
    if (req.method === 'GET' && ['/appointments', '/usage'].includes(url.pathname) || url.pathname.startsWith('/appointments/')) {
      if (!clinicId) return send(res, 401, { error: 'unauthorized' });
    }
    const strip = ({ clinicId: _c, ...a }) => a;
    if (req.method === 'GET' && url.pathname === '/appointments') {
      return send(res, 200, appts.filter((a) => a.clinicId === clinicId).map(strip));
    }
    if (req.method === 'GET' && url.pathname.startsWith('/appointments/')) {
      const a = appts.find((x) => x.id === url.pathname.split('/')[2] && x.clinicId === clinicId);
      return a ? send(res, 200, strip(a)) : send(res, 404, { error: 'not found' });
    }
    if (req.method === 'GET' && url.pathname === '/usage') {
      const month = url.searchParams.get('month') ?? '';
      if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'month=YYYY-MM required' });
      const t = txns.filter((x) => x.clinicId === clinicId && x.month === month).length;
      return send(res, 200, { clinicId, month, transactions: t, amountUsd: t * 0.5 });
    }
    send(res, 404, { error: 'not found' });
  });
});
server.listen(Number(process.env.PORT ?? 3000), () => console.log('reference server up'));
