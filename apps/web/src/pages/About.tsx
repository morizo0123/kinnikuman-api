export function About() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">About</h1>
      <p className="text-muted-foreground mb-4">
        このサイトは個人の学習プロジェクトです。 バックエンドフレームワーク
        Hono、ORM Drizzle、DB Turso を使って構築しました。
      </p>
      <p className="text-muted-foreground">
        フロントエンドは React + Vite + shadcn/ui。
      </p>
    </div>
  );
}
