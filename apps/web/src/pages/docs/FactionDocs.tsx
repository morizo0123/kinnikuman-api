import { useQuery } from '@tanstack/react-query';
import { fetchFactionList, fetchFactionDetail } from '@/api/client';
import { EndpointCard } from '@/components/docs/EndpointCard';
import { PageHeader } from '@/components/docs/PageHeader';

export function FactionDocs() {
  const listQuery = useQuery({
    queryKey: ['faction', 'list'],
    queryFn: () => fetchFactionList()
  });

  const detailQuery = useQuery({
    queryKey: ['faction', 'detail', 'seigi'],
    queryFn: () => fetchFactionDetail('seigi')
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Faction (軍団)"
        description="超人が所属する軍団の情報を取得する API。"
      />

      <EndpointCard
        method="GET"
        path="/api/v1/faction"
        description="軍団の一覧を取得します。ページネーションに対応。"
        queryParams={[
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: '1ページの件数(デフォルト 20、最大 100)'
          },
          {
            name: 'offset',
            type: 'number',
            required: false,
            description: 'スキップ件数(デフォルト 0)'
          }
        ]}
        sampleResponse={listQuery.data}
        isLoading={listQuery.isLoading}
        error={listQuery.error?.message ?? null}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/faction/:slug"
        description="指定した slug の軍団の詳細情報を取得します。所属する超人リストも含みます。"
        pathParams={[
          {
            name: 'slug',
            type: 'string',
            required: true,
            description: '軍団の slug。例: seigi'
          }
        ]}
        sampleResponse={detailQuery.data}
        isLoading={detailQuery.isLoading}
        error={detailQuery.error?.message ?? null}
      />
    </div>
  );
}
