export function FactionDocs() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold mb-2">Faction (軍団)</h1>
        <p className="text-muted-foreground">
          超人が所属する軍団の情報を取得する API。
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-2">エンドポイント一覧</h2>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li>
            <code>GET /api/v1/faction</code> — 一覧
          </li>
          <li>
            <code>GET /api/v1/faction/:slug</code> — 詳細
          </li>
        </ul>
      </section>

      <section>
        <p className="text-sm text-muted-foreground">
          ※ 詳細は Phase 6 で実装予定。
        </p>
      </section>
    </div>
  );
}
