import { useState } from 'react';
import { Button } from '../ui/button';

type Props = {
  code: string;
};

export function CodeBlock({ code }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className="bg-muted rounded-md p-4 text-sm overflow-auto max-h-96">
        <code className="font-mono">{code}</code>
      </pre>

      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}
