import { Hono } from 'hono';
import { readNight } from './digest/read.js';
import type { NightCounts } from './digest/types.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) => {
    const status = readStatus(config);
    const counts: Record<string, NightCounts | null> = {};
    for (const n of status.nights) counts[n] = readNight(config.runsDir, n)?.counts ?? null;
    return c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={status} counts={counts} />
      </Layout>,
    );
  });

  return app;
}
