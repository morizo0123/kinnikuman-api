import { useQuery } from '@tanstack/react-query';
import { fetchChoujinList } from './api/client';
import { Button } from '@/components/ui/button';

function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['choujin', 'list'],
    queryFn: () => fetchChoujinList()
  });

  if (isLoading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-600">🦸 KinnikumanAPI</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Total: {data.count} choujin
      </p>

      <div className="flex gap-2 mb-6">
        <Button variant="default">Default Button</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>

      <ul className="space-y-2">
        {data.results.map((c) => (
          <li key={c.slug} className="border rounded-md p-3 hover:bg-accent">
            <strong>{c.name}</strong>{' '}
            <span className="text-sm text-muted-foreground">({c.slug})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
