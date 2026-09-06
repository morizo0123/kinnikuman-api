import type { ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CodeBlock } from './CodeBlock';
import { TryItSection } from './TryItSection';

type Param = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

type Props = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  pathParams?: Param[];
  queryParams?: Param[];
  sampleResponse: unknown;
  isLoading?: boolean;
  error?: string | null;
  tryIt?: ComponentProps<typeof TryItSection>;
};

export function EndpointCard({
  method,
  path,
  description,
  pathParams,
  queryParams,
  sampleResponse,
  isLoading,
  error,
  tryIt
}: Props) {
  return (
    <section className="border rounded-lg p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {method}
          </span>
          <code className="text-sm font-mono">{path}</code>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {/* Path Parameters */}
      {pathParams && pathParams.length > 0 && (
        <ParamTable title="Path Parameters" params={pathParams} />
      )}

      {/* Query Parameters */}
      {queryParams && queryParams.length > 0 && (
        <ParamTable title="Query Parameters" params={queryParams} />
      )}

      {/* サンプルレスポンス */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sample Response
        </h3>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
            Error: {error}
          </div>
        )}
        {!isLoading && !error && (
          <CodeBlock code={JSON.stringify(sampleResponse, null, 2)} />
        )}
      </div>

      {tryIt && (
        <TryItSection
          params={tryIt.params}
          onExecute={tryIt.onExecute}
          result={tryIt.result}
          isLoading={tryIt.isLoading}
          error={tryIt.error}
          buildCurl={tryIt.buildCurl}
          status={tryIt.status}
          statusText={tryIt.statusText}
          durationMs={tryIt.durationMs}
        />
      )}
    </section>
  );
}

// ===== Param 表示テーブル(分割) =====
function ParamTable({ title, params }: { title: string; params: Param[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Required</th>
              <th className="text-left px-3 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                <td className="px-3 py-2">
                  {p.required ? (
                    <span className="text-red-600">required</span>
                  ) : (
                    <span className="text-muted-foreground">optional</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
