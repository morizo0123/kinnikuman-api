export const factionsSeed = [
  { slug: 'seigi', name: '正義超人' },
  { slug: 'idol', name: 'アイドル超人' },
  { slug: 'akuma', name: '悪魔超人' },
  { slug: 'zangyaku', name: '残虐超人' }
] as const;

export const choujinSeed = [
  {
    slug: 'kinnikuman',
    name: 'キン肉マン',
    realName: 'キン肉スグル',
    power: '95万パワー',
    origin: 'キン肉星',
    heightCm: 185,
    weightKg: 90,
    description:
      '『キン肉マン』の主人公。キン肉星の王子で、地球で修行しながら数々の超人と戦う。',
    factionSlugs: ['seigi', 'idol']
  },
  {
    slug: 'terryman',
    name: 'テリーマン',
    realName: null,
    power: '95万パワー',
    origin: 'アメリカ・テキサス州',
    heightCm: 188,
    weightKg: 95,
    description:
      'テキサス出身のアメリカン超人。キン肉マンの親友であり、永遠のライバル。',
    factionSlugs: ['seigi', 'idol']
  },
  {
    slug: 'ramenman',
    name: 'ラーメンマン',
    realName: null,
    power: '97万パワー',
    origin: '中国',
    heightCm: 208,
    weightKg: 130,
    description:
      '中国出身の超人。かつては残虐超人として恐れられたが、後に正義超人となる。',
    factionSlugs: ['idol', 'seigi', 'zangyaku']
  },
  {
    slug: 'robinmask',
    name: 'ロビンマスク',
    realName: null,
    power: '96万パワー',
    origin: 'イギリス',
    heightCm: 217,
    weightKg: 155,
    description: 'イギリス出身の鎧の超人。気品溢れる紳士的な戦いぶりが特徴。',
    factionSlugs: ['idol', 'seigi']
  },
  {
    slug: 'warsman',
    name: 'ウォーズマン',
    realName: null,
    power: '100万パワー',
    origin: 'ロシア',
    heightCm: 210,
    weightKg: 150,
    description: 'ロシア出身のサイボーグ超人。100万パワーを誇る。',
    factionSlugs: ['idol', 'seigi']
  },
  {
    slug: 'wolfman',
    name: 'ウルフマン',
    realName: null,
    power: '80万パワー',
    origin: '日本',
    heightCm: 190,
    weightKg: 102,
    description: '日本出身の超人。和の心を持つ戦士。',
    factionSlugs: ['idol', 'seigi']
  },
  {
    slug: 'brocken_jr',
    name: 'ブロッケンJr.',
    realName: null,
    power: '90万パワー',
    origin: 'ドイツ',
    heightCm: 195,
    weightKg: 90,
    description: 'ドイツ出身の超人。父ブロッケンマンの仇を討つために戦う。',
    factionSlugs: ['idol', 'seigi']
  },
  {
    slug: 'buffaloman',
    name: 'バッファローマン',
    realName: null,
    power: '1000万パワー',
    origin: 'スペイン',
    heightCm: 250,
    weightKg: 220,
    description: '1000万パワーを誇る悪魔超人。7人の悪魔超人のリーダー。',
    factionSlugs: ['idol', 'akuma']
  },
  {
    slug: 'geronimo',
    name: 'ジェロニモ',
    realName: null,
    power: '83万パワー',
    origin: 'アメリカ',
    heightCm: 180,
    weightKg: 80,
    description:
      'アメリカ・ネイティブの血を引く超人。人間でありながら超人と戦う。',
    factionSlugs: ['idol', 'seigi']
  }
] as const;
