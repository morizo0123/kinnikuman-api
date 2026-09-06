import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="border-b pb-6 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">About</h1>

        <p className="mt-3 text-lg text-muted-foreground">
          KinnikumanAPI の背景と技術構成について。
        </p>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            プロジェクトの目的
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            バックエンド未経験の状態から、PokéAPI のような REST API を
            自分で作ってみるための個人学習プロジェクトです。 スキーマ設計から
            API 実装、フロントエンド、デザインまで、
            フルスタックの一連の開発サイクルを体験することを目的にしています。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            技術スタック
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">バックエンド</CardTitle>
                <CardDescription>
                  Hono (Web フレームワーク)、Drizzle ORM、
                  <br />
                  Turso (libSQL) をベースに TypeScript で構築。
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">フロントエンド</CardTitle>
                <CardDescription>
                  React + Vite + TypeScript。UI ライブラリは shadcn/ui、
                  <br />
                  状態管理は TanStack Query。
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            クレジット
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            『キン肉マン』はゆでたまご先生の作品で、集英社より刊行されています。
            本サイトはファンによる非公式の学習プロジェクトです。
          </p>
        </section>
      </div>
    </div>
  );
}
