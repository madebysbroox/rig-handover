import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.rows.map((r) => r.job)).toEqual(['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']);
    expect(n.badLines).toBe(1);
  });

  it('folds a job into one row', () => {
    const rows = readNight('runs', '2026-10-28')!.rows;
    const refresh = rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null, firstAt: '2026-10-29T01:30:00+01:00', lastAt: '2026-10-29T01:37:00+01:00' });
    const backup = rows.find((r) => r.job === 'notes/backup')!;
    expect(backup).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    const render = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
  });

  it('returns null for a night with no file, or a name that is not a night', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('reads an empty file as a night with no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-10-30.jsonl'), '');
    expect(readNight(dir, '2026-10-30')).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });
});
