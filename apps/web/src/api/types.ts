// 一覧レスポンスの共通型
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// 一覧で返される最小情報
export type ChoujinListItem = {
  slug: string;
  name: string;
  url: string;
};

export type FactionListItem = {
  slug: string;
  name: string;
  url: string;
};

// 詳細レスポンス
export type ChoujinDetail = {
  slug: string;
  name: string;
  real_name: string | null;
  power: string | null;
  origin: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  description: string | null;
  factions: {
    slug: string;
    name: string;
    url: string;
  }[];
};

export type FactionDetail = {
  slug: string;
  name: string;
  choujins: {
    slug: string;
    name: string;
    url: string;
  }[];
};
