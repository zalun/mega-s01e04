import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('reads 5 jobs, sorted by job, and counts 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.night).toBe('2026-10-28');
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night!.badLines).toBe(1);
    expect(night!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('keeps a job whose owner is null', () => {
    const row = night!.rows.find((r) => r.job === 'digest/render');
    expect(row).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok', lastError: null });
  });

  it('counts runs and retries, keeps the last error and the log offset', () => {
    const refresh = night!.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const backup = night!.rows.find((r) => r.job === 'notes/backup');
    expect(backup).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    const sync = night!.rows.find((r) => r.job === 'lane/sync');
    expect(sync).toMatchObject({ runs: 8, retries: 1, firstAt: '2026-10-28T23:00:06+01:00' });
  });
});

describe('readNight edge cases', () => {
  it('returns null when the night has no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('returns null for a night that is not YYYY-MM-DD', () => {
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('reads an empty file as a night with no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({
      night: '2026-01-01',
      rows: [],
      counts: { ok: 0, retry: 0, fail: 0 },
      badLines: 0,
    });
  });

  it('counts lines with a wrong shape as bad, never throws', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    const lines = [
      '{"at":"2026-01-01T01:00:00+02:00","job":"a","status":"ok","owner":null}',
      '{"at":"2026-01-01T01:00:00+02:00","job":"a","status":"weird","owner":null}',
      '[1,2]',
      'not json',
    ];
    writeFileSync(join(dir, '2026-01-01.jsonl'), lines.join('\n') + '\n');
    const night = readNight(dir, '2026-01-01');
    expect(night!.badLines).toBe(3);
    expect(night!.rows).toHaveLength(1);
    expect(night!.rows[0]!.firstAt).toBe('2026-01-01T01:00:00+02:00');
  });
});
