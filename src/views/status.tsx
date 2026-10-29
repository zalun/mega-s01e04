import type { NightCounts } from '../digest/types.js';
import type { Status } from '../status.js';

export function StatusBoard({ status, counts }: { status: Status; counts: Record<string, NightCounts | null> }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => (
            <li>
              <a href={`/digest/${n}`}>{n}</a>
              {' · '}
              {counts[n]
                ? `ok ${counts[n].ok} · retry ${counts[n].retry} · fail ${counts[n].fail}`
                : 'ok — · retry — · fail —'}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
