import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <section className="text-center py-12">
        <h1 className="flex justify-center items-center text-5xl md:text-6xl font-bold tracking-tight mb-6">
          <Zap className="h-14 w-14 text-primary" fill="currentColor" />
          <span className="text-primary">Kinnikuman</span>API
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          キン肉マンに登場するキャラクター情報を取得する REST API。
          <br />
          PokéAPI に着想を得て作った個人学習プロジェクトです。
        </p>

        <div className="flex gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/docs">API Docs を見る →</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/about">プロジェクトについて</Link>
          </Button>
        </div>
      </section>

      <section className="mt20">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
          何ができるか
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>超人 (Choujin)</CardTitle>
              <CardDescription>
                キン肉マン、テリーマンなど登場超人の詳細情報を取得。身長・体重・出身・所属軍団まで。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>軍団 (Faction)</CardTitle>
              <CardDescription>
                正義超人、悪魔超人、完璧超人始祖など、軍団単位で所属メンバーを取得できる。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ページネーション & フィルタ</CardTitle>
              <CardDescription>
                REST API の定番機能。limit/offset でページング、faction
                で軍団絞り込み。
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
