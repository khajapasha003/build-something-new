import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './ownership-bypass.mjs';

test('403 + 42501 -> SECURE', () => {
  const res = classify({ status: 403, code: '42501' });
  assert.strictEqual(res.verdict, 'SECURE');
  assert.strictEqual(res.pass, true);
  assert.strictEqual(String(res), 'SECURE');

  const resPos = classify(403, '42501');
  assert.strictEqual(resPos.verdict, 'SECURE');
  assert.strictEqual(resPos.pass, true);
});

test('401 + 42501 -> SECURE', () => {
  const res = classify({ status: 401, code: '42501' });
  assert.strictEqual(res.verdict, 'SECURE');
  assert.strictEqual(res.pass, true);
  assert.strictEqual(String(res), 'SECURE');

  const resPos = classify(401, '42501');
  assert.strictEqual(resPos.verdict, 'SECURE');
  assert.strictEqual(resPos.pass, true);
});

test('400 + PGRST204 -> INCONCLUSIVE', () => {
  const res = classify({ status: 400, code: 'PGRST204' });
  assert.strictEqual(res.verdict, 'INCONCLUSIVE');
  assert.strictEqual(res.pass, false);
  assert.strictEqual(String(res), 'INCONCLUSIVE');
  assert.match(res.details, /400/);
  assert.match(res.details, /PGRST204/);

  const resPos = classify(400, 'PGRST204');
  assert.strictEqual(resPos.verdict, 'INCONCLUSIVE');
  assert.strictEqual(resPos.pass, false);
});

test('409 + 23505 -> INCONCLUSIVE', () => {
  const res = classify({ status: 409, code: '23505' });
  assert.strictEqual(res.verdict, 'INCONCLUSIVE');
  assert.strictEqual(res.pass, false);
  assert.strictEqual(String(res), 'INCONCLUSIVE');
  assert.match(res.details, /409/);
  assert.match(res.details, /23505/);

  const resPos = classify(409, '23505');
  assert.strictEqual(resPos.verdict, 'INCONCLUSIVE');
  assert.strictEqual(resPos.pass, false);
});

test('409 + 23503 -> INCONCLUSIVE', () => {
  const res = classify({ status: 409, code: '23503' });
  assert.strictEqual(res.verdict, 'INCONCLUSIVE');
  assert.strictEqual(res.pass, false);
  assert.strictEqual(String(res), 'INCONCLUSIVE');
  assert.match(res.details, /409/);
  assert.match(res.details, /23503/);

  const resPos = classify(409, '23503');
  assert.strictEqual(resPos.verdict, 'INCONCLUSIVE');
  assert.strictEqual(resPos.pass, false);
});

test('400 + P0001 -> INCONCLUSIVE', () => {
  const res = classify({ status: 400, code: 'P0001' });
  assert.strictEqual(res.verdict, 'INCONCLUSIVE');
  assert.strictEqual(res.pass, false);
  assert.strictEqual(String(res), 'INCONCLUSIVE');
  assert.match(res.details, /400/);
  assert.match(res.details, /P0001/);

  const resPos = classify(400, 'P0001');
  assert.strictEqual(resPos.verdict, 'INCONCLUSIVE');
  assert.strictEqual(resPos.pass, false);
});

test('2xx + read-back without attacker value -> SECURE', () => {
  const res = classify({ status: 200, attackerValueStored: false });
  assert.strictEqual(res.verdict, 'SECURE');
  assert.strictEqual(res.pass, true);
  assert.strictEqual(String(res), 'SECURE');

  const resPos = classify(200, false);
  assert.strictEqual(resPos.verdict, 'SECURE');
  assert.strictEqual(resPos.pass, true);

  const res201 = classify({ status: 201, attackerValueStored: false });
  assert.strictEqual(res201.verdict, 'SECURE');
  assert.strictEqual(res201.pass, true);
});

test('2xx + attacker value -> VULNERABLE', () => {
  const res = classify({ status: 200, attackerValueStored: true });
  assert.strictEqual(res.verdict, 'VULNERABLE');
  assert.strictEqual(res.pass, false);
  assert.strictEqual(String(res), 'VULNERABLE');

  const resPos = classify(200, true);
  assert.strictEqual(resPos.verdict, 'VULNERABLE');
  assert.strictEqual(resPos.pass, false);

  const res201 = classify({ status: 201, attackerValueStored: true });
  assert.strictEqual(res201.verdict, 'VULNERABLE');
  assert.strictEqual(res201.pass, false);
});

test('positive 2xx + expected read-back -> WORKS', () => {
  const res = classify({ isPositive: true, status: 200, expectedValueStored: true });
  assert.strictEqual(res.verdict, 'WORKS');
  assert.strictEqual(res.pass, true);
  assert.strictEqual(String(res), 'WORKS');

  const resPos = classify(200, null, { isPositive: true, expectedValueStored: true });
  assert.strictEqual(resPos.verdict, 'WORKS');
  assert.strictEqual(resPos.pass, true);

  const res201 = classify({ isPositive: true, status: 201, expectedValueStored: true });
  assert.strictEqual(res201.verdict, 'WORKS');
  assert.strictEqual(res201.pass, true);
});

test('positive 403 -> BROKEN', () => {
  const res = classify({ isPositive: true, status: 403, code: '42501' });
  assert.strictEqual(res.verdict, 'BROKEN');
  assert.strictEqual(res.pass, false);
  assert.strictEqual(String(res), 'BROKEN');

  const resPos = classify(403, null, { isPositive: true });
  assert.strictEqual(resPos.verdict, 'BROKEN');
  assert.strictEqual(resPos.pass, false);

  const res400 = classify({ isPositive: true, status: 400, code: 'PGRST204' });
  assert.strictEqual(res400.verdict, 'BROKEN');
  assert.strictEqual(res400.pass, false);
});
