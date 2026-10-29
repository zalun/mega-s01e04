import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function Row({ row }: { row: DigestRow }) {
  const flagged = row.retries >= 3 || row.lastStatus === 'fail';
  return (
    <tr class={flagged ? 'warn' : undefined}>
      <td>{flagged ? '! ' : ''}{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td>{row.retries}</td>
      <td>{row.lastStatus}</td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night }: { night: Night }) {
  const { counts } = night;
  return (
    <>
      <h1>digest {night.night}</h1>
      <p class="mute">
        ok {counts.ok} · retry {counts.retry} · fail {counts.fail}
        {night.badLines > 0 ? ` · ${night.badLines} unreadable lines` : ''}
      </p>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th>
              <th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
      <p class="mute">! = 3 or more retries, or the last run failed</p>
    </>
  );
}
