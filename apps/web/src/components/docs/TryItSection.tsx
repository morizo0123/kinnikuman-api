import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Play } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

export type TryItParam = {
  name: string;
  type: 'text' | 'number' | 'select';
  label: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

type Props = {
  params: TryItParam[];
  onExecute: (values: Record<string, string>) => void;
  result?: unknown;
  isLoading?: boolean;
  error?: string | null;
};

export function TryItSection({
  params,
  onExecute,
  result,
  isLoading,
  error
}: Props) {
  // 各パラメータの値を state で管理
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of params) {
      initial[p.name] = p.defaultValue ?? '';
    }
    return initial;
  });

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleExecute() {
    onExecute(values);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Try it out
      </h3>

      <div className="border rounded-md p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {params.map((p) => (
            <div key={p.name} className="space-y-1.5">
              <Label htmlFor={p.name} className="text-xs">
                {p.label}
              </Label>
              {p.type === 'select' ? (
                <Select
                  value={values[p.name]}
                  onValueChange={(v) => setValue(p.name, v)}
                >
                  <SelectTrigger id={p.name}>
                    <SelectValue placeholder={p.placeholder ?? '選択'} />
                  </SelectTrigger>
                  <SelectContent>
                    {p.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={p.name}
                  type={p.type === 'number' ? 'number' : 'text'}
                  value={values[p.name]}
                  onChange={(e) => setValue(p.name, e.target.value)}
                  placeholder={p.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <Button onClick={handleExecute} disabled={isLoading} className="gap-2">
          <Play className="h-4 w-4" />
          {isLoading ? 'Executing...' : 'Try it out'}
        </Button>

        {(result !== undefined || error) && (
          <div className="pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Response
            </h4>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
                Error: {error}
              </div>
            )}
            {result !== undefined && !error && (
              <CodeBlock code={JSON.stringify(result, null, 2)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
