import { useQuery } from '@tanstack/react-query';
import { fetchChoujinList } from './api/client';

function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['choujin', 'list'],
    queryFn: () => fetchChoujinList()
  });

  if (isLoading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error.message}</div>;
  if (!data) return null;

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
