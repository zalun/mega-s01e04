// Plan morning-digest § 1. The contract every part of § 2 starts against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing at the edge.
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted to UTC
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as '—'
  runs: number; // lines for this job
  retries: number; // lines with status 'retry'
  fails: number; // lines with status 'fail'
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string;
  lastAt: string;
};

export type NightCounts = { ok: number; retry: number; fail: number };

export type Night = {
  night: string; // YYYY-MM-DD, the file name
  rows: DigestRow[]; // sorted by job
  counts: NightCounts; // per line, across all jobs
  badLines: number; // lines that did not parse; counted, never thrown
};

// Returns null when runs/<night>.jsonl does not exist. An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
