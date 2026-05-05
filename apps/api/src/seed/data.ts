export const factionsSeed = [
  { slug: 'seigi', name: '正義超人' },
  { slug: 'idol', name: 'アイドル超人' }
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
  }
] as const;
