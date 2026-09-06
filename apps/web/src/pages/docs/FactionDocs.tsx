import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFactionList, fetchFactionDetail } from '@/api/client';
import { EndpointCard } from '@/components/docs/EndpointCard';
import { PageHeader } from '@/components/docs/PageHeader';

// Try it out で送信されるパラメータの型
type ListTryParams = {
  limit?: number;
  offset?: number;
};

type DetailTryParams = {
  slug?: string;
};

export function FactionDocs() {
  // === Sample Response 用(既存) ===
  const listQuery = useQuery({
    queryKey: ['faction', 'list'],
    queryFn: () => fetchFactionList(),
    select: (res) => res.data
  });

  const detailQuery = useQuery({
    queryKey: ['faction', 'detail', 'seigi'],
    queryFn: () => fetchFactionDetail('seigi'),
    select: (res) => res.data
  });

  // === Try it out 用 (List) ===
  const [listTryParams, setListTryParams] = useState<ListTryParams | null>(
    null
  );

  const listTryQuery = useQuery({
    queryKey: ['faction', 'tryit', 'list', listTryParams],
    queryFn: () => fetchFactionList(listTryParams ?? {}),
    enabled: listTryParams !== null
  });

  function handleListExecute(values: Record<string, string>) {
    setListTryParams({
      limit: values.limit ? parseInt(values.limit, 10) : undefined,
      offset: values.offset ? parseInt(values.offset, 10) : undefined
    });
  }

  // === Try it out 用 (Detail) ===
  const [detailTryParams, setDetailTryParams] =
    useState<DetailTryParams | null>(null);

  const detailTryQuery = useQuery({
    queryKey: ['faction', 'tryit', 'detail', detailTryParams],
    queryFn: () => fetchFactionDetail(detailTryParams?.slug ?? ''),
    enabled: detailTryParams !== null
  });

  function handleDetailExecute(values: Record<string, string>) {
    if (!values.slug) return;
    setDetailTryParams({
      slug: values.slug
    });
  }

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
            }
          ],
          onExecute: handleListExecute,
          result: listTryQuery.data?.data,
          isLoading: listTryQuery.isFetching,
          error: listTryQuery.error?.message ?? null,
          buildCurl: (values) => {
            const query = new URLSearchParams();
            if (values.limit) query.set('limit', values.limit);
            if (values.offset) query.set('offset', values.offset);
            const queryString = query.toString();
            const path = `/api/v1/faction${queryString ? `?${queryString}` : ''}`;
            return `curl http://localhost:3000${path}`;
          },
          status:
            listTryQuery.data?.status ?? (listTryQuery.error as any)?.status,
          statusText: listTryQuery.data?.statusText,
          durationMs:
            listTryQuery.data?.durationMs ??
            (listTryQuery.error as any)?.durationMs
        }}
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
        tryIt={{
          params: [
            {
              name: 'slug',
              type: 'text',
              label: 'Slug',
              defaultValue: 'seigi'
            }
          ],
          onExecute: handleDetailExecute,
          result: detailTryQuery.data?.data,
          isLoading: detailTryQuery.isFetching,
          error: detailTryQuery.error?.message ?? null,
          buildCurl: (values) => {
            return `curl http://localhost:3000/api/v1/faction/${values.slug || ''}`;
          },
          status:
            detailTryQuery.data?.status ??
            (detailTryQuery.error as any)?.status,
          statusText: detailTryQuery.data?.statusText,
          durationMs:
            detailTryQuery.data?.durationMs ??
            (detailTryQuery.error as any)?.durationMs
        }}
      />
    </div>
  );
}
