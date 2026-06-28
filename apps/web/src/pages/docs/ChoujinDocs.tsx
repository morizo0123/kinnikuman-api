import { useQuery } from '@tanstack/react-query';
import { fetchChoujinList, fetchChoujinDetail } from '@/api/client';
import { EndpointCard } from '@/components/docs/EndpointCard';
import { PageHeader } from '@/components/docs/PageHeader';

export function ChoujinDocs() {
  const listQuery = useQuery({
    queryKey: ['choujin', 'list'],
    queryFn: () => fetchChoujinList()
  });

  const detailQuery = useQuery({
    queryKey: ['choujin', 'detail', 'kinnikuman'],
    queryFn: () => fetchChoujinDetail('kinnikuman')
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Choujin (超人)"
        description="キン肉マンに登場する超人の情報を取得する API。"
      />

      <EndpointCard
        method="GET"
        path="/api/v1/choujin"
        description="超人の一覧を取得します。ページネーションと軍団絞り込みに対応。"
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
          },
          {
            name: 'faction',
            type: 'string',
            required: false,
            description: '軍団 slug で絞り込み(例: seigi)'
          }
        ]}
        sampleResponse={listQuery.data}
        isLoading={listQuery.isLoading}
        error={listQuery.error?.message ?? null}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/choujin/:slug"
        description="指定した slug の超人の詳細情報を取得します。所属軍団リストも含みます。"
        pathParams={[
          {
            name: 'slug',
            type: 'string',
            required: true,
            description: 'URL パスの一部。例: kinnikuman'
          }
        ]}
        sampleResponse={detailQuery.data}
        isLoading={detailQuery.isLoading}
        error={detailQuery.error?.message ?? null}
      />
    </div>
  );
}
