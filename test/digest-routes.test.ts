import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (at: string, job: string, status: string, owner: string | null = 'ann') =>
  JSON.stringify({ at, job, status, owner });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    [
      line('2026-01-01T01:00:00+01:00', 'zeta', 'ok'),
      line('2026-01-01T01:05:00+01:00', 'alpha', 'retry'),
      line('2026-01-01T01:10:00+01:00', 'alpha', 'ok'),
      line('2026-01-01T01:20:00+01:00', 'mid', 'ok', null),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-03.jsonl'),
    [line('2026-01-03T02:00:00+01:00', 'solo', 'ok'), 'not json at all'].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const jobsInPage = (html: string) =>
  [...html.matchAll(/<tr[^>]*><td>(?:! )?([^<]+)<\/td>/g)].map((m) => m[1]);

describe('GET /digest/:night', () => {
  it('200 for a good night', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('digest 2026-01-01');
    expect(html).toContain('alpha');
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a night with a bad line still renders and reports it', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('solo');
    expect(html).toContain('1 unreadable lines');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with rows for a good night', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-01-01');
    expect(body.rows.length).toBe(3);
    expect(body.badLines).toBe(0);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('empty night has no rows', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
  });

  it('a night with a bad line reports badLines 1', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['solo']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-01-01')).text();
    const body = (await (await app.request('/api/digest/2026-01-01')).json()) as Night;
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toEqual(['alpha', 'mid', 'zeta']);
    expect(jobsInPage(html)).toEqual(jobs);
  });
});
