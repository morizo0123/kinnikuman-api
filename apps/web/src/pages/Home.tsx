import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🦸 KinnikumanAPI</h1>
      <p className="text-muted-foreground mb-6">
        キン肉マンに登場するキャラクターの情報を取得できる REST API です。
        PokéAPI に着想を得て作りました。
      </p>
      <p>
        詳しい使い方は{' '}
        <Link to="/docs" className="underline">
          Docs
        </Link>{' '}
        をご覧ください。
      </p>
    </div>
  );
}
