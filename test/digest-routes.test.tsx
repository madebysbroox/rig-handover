import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Each test writes its own night files into a temp runs dir; runs/ stays untouched.
const dirs: string[] = [];
function runsWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}
function configFor(runsDir: string) {
  return { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
}

// Job names in the order the page's table shows them.
function tableJobs(html: string): string[] {
  return [...html.matchAll(/<tbody>[\s\S]*<\/tbody>/g)]
    .flatMap((m) => [...m[0].matchAll(/<tr[^>]*>\s*<td>([^<]+)<\/td>/g)])
    .map((m) => m[1]);
}

const goodNight = [
  '{"at":"2026-10-29T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-29T01:10:00+01:00","job":"fixtures/refresh","status":"retry","owner":"lane-07"}',
  '{"at":"2026-10-29T01:20:00+01:00","job":"fixtures/refresh","status":"retry","owner":"lane-07"}',
  '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"lane-07"}',
  '{"at":"2026-10-29T01:40:00+01:00","job":"fixtures/refresh","status":"ok","owner":"lane-07"}',
  '{"at":"2026-10-29T02:00:00+01:00","job":"notes/backup","status":"fail","owner":"rook","error":"quota exceeded"}',
  '{"at":"2026-10-29T02:10:00+01:00","job":"digest/render","status":"ok","owner":null}',
].join('\n');

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe('digest routes: a good night', () => {
  const app = createApp(configFor(runsWith({ '2026-10-29.jsonl': goodNight + '\n' })));

  it('the page is 200 and lists every job', async () => {
    const res = await app.request('/digest/2026-10-29');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup']) {
      expect(html).toContain(job);
    }
  });

  it('marks the warn rows (3 retries, or a fail)', async () => {
    const html = await (await app.request('/digest/2026-10-29')).text();
    const warnJobs = [...html.matchAll(/<tr class="warn">\s*<td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(warnJobs).toEqual(['fixtures/refresh', 'notes/backup']);
  });

  it('shows a dash for a null owner', async () => {
    const html = await (await app.request('/digest/2026-10-29')).text();
    expect(html).toMatch(/<td>digest\/render<\/td><td>—<\/td>/);
  });

  it('the JSON is 200 and its rows are in the same job order as the page table', async () => {
    const html = await (await app.request('/digest/2026-10-29')).text();
    const res = await app.request('/api/digest/2026-10-29');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[] };
    expect(body.rows.map((r) => r.job)).toEqual(tableJobs(html));
    expect(body.rows.map((r) => r.job)).toEqual(['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup']);
  });
});

describe('digest routes: a night with no file', () => {
  const app = createApp(configFor(runsWith({})));

  it('the page is 404', async () => {
    expect((await app.request('/digest/2026-10-30')).status).toBe(404);
  });

  it('the JSON is 404', async () => {
    expect((await app.request('/api/digest/2026-10-30')).status).toBe(404);
  });
});

describe('digest routes: an empty night', () => {
  const app = createApp(configFor(runsWith({ '2026-10-30.jsonl': '' })));

  it('the page is 200 and says nothing ran', async () => {
    const res = await app.request('/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('the JSON is 200 with no rows and no bad lines', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });
});

describe('digest routes: a night with a bad line', () => {
  const truncated = '{"at":"2026-10-31T03:00:00+01:00","job":"lane/sy';
  const lines = [
    '{"at":"2026-10-31T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
    truncated,
    '{"at":"2026-10-31T02:00:00+01:00","job":"notes/backup","status":"ok","owner":"rook"}',
  ];
  const app = createApp(configFor(runsWith({ '2026-10-31.jsonl': lines.join('\n') + '\n' })));

  it('the page is 200, still renders the good rows, and says a line did not parse', async () => {
    const res = await app.request('/digest/2026-10-31');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(tableJobs(html)).toEqual(['lane/sync', 'notes/backup']);
    expect(html).toContain('1 line(s)');
  });

  it('the JSON is 200 with the good rows and badLines 1', async () => {
    const res = await app.request('/api/digest/2026-10-31');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync', 'notes/backup']);
    expect(body.badLines).toBe(1);
  });
});
