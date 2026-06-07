import { useEffect, useState } from 'react';
import { fetchChoujinList } from './api/client';
import type { ChoujinListItem, PaginatedResponse } from './api/types';

function App() {
  const [data, setData] = useState<PaginatedResponse<ChoujinListItem> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChoujinList()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui' }}>
      <h1>🦸 KinnikumanAPI - Choujin List</h1>
      <p>Total: {data.count}</p>
      <ul>
        {data.results.map((c) => (
          <li key={c.slug}>
            <strong>{c.name}</strong> ({c.slug}) — {c.url}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
