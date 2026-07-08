import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChoujinList, fetchChoujinDetail } from '@/api/client';
import { EndpointCard } from '@/components/docs/EndpointCard';
import { PageHeader } from '@/components/docs/PageHeader';

// Try it out で送信されるパラメータの型
type ListTryParams = {
  limit?: number;
  offset?: number;
  faction?: string;
};

export function ChoujinDocs() {
  // === Sample Response 用(既存) ===
  const listQuery = useQuery({
    queryKey: ['choujin', 'list'],
    queryFn: () => fetchChoujinList()
  });

  const detailQuery = useQuery({
    queryKey: ['choujin', 'detail', 'kinnikuman'],
    queryFn: () => fetchChoujinDetail('kinnikuman')
  });

  // === Try it out 用 (List) ===
  const [listTryParams, setListTryParams] = useState<ListTryParams | null>(
    null
  );

  const listTryQuery = useQuery({
    queryKey: ['choujin', 'tryit', 'list', listTryParams],
    queryFn: () => fetchChoujinList(listTryParams ?? {}),
    enabled: listTryParams !== null
  });

  function handleListExecute(values: Record<string, string>) {
    setListTryParams({
      limit: values.limit ? parseInt(values.limit, 10) : undefined,
      offset: values.offset ? parseInt(values.offset, 10) : undefined,
      faction: values.faction === 'all' ? undefined : values.faction
    });
  }

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
        tryIt={{
          params: [
            {
              name: 'limit',
              type: 'number',
              label: 'Limit',
              defaultValue: '20'
            },
            {
              name: 'offset',
              type: 'number',
              label: 'Offset',
              defaultValue: '0'
            },
            {
              name: 'faction',
              type: 'select',
              label: 'Faction',
              defaultValue: 'all',
              options: [
                { value: 'all', label: '(全て)' },
                { value: 'seigi', label: '正義超人' },
                { value: 'idol', label: 'アイドル超人' },
                { value: 'akuma', label: '悪魔超人' },
                { value: 'zangyaku', label: '残虐超人' }
              ]
            }
          ],
          onExecute: handleListExecute,
          result: listTryQuery.data,
          isLoading: listTryQuery.isFetching,
          error: listTryQuery.error?.message ?? null
        }}
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
            description: '超人の slug。例: kinnikuman'
          }
        ]}
        sampleResponse={detailQuery.data}
        isLoading={detailQuery.isLoading}
        error={detailQuery.error?.message ?? null}
      />
    </div>
  );
}
