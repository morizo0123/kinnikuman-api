import { useQuery } from '@tanstack/react-query';
import { fetchChoujinList } from '@/api/client';

export function Docs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['choujin', 'list'],
    queryFn: () => fetchChoujinList()
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">API Docs</h1>
      <p className="text-muted-foreground mb-6">
        API のサンプルレスポンスはこちら。
      </p>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}
      {data && (
        <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
