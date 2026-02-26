export const siteConfig = {
  name: 'XTrendAI',
  description: 'X(Twitter)热点驱动的任务生成Agent',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  version: '1.0.0',
}

export const scenarioConfig = [
  {
    id: 'POD' as const,
    name: 'POD按需打印',
    nameEn: 'POD Design',
    description: '生成POD商品的设计提示词',
    icon: '👕',
    availableFor: ['guest', 'free', 'pro'] as const,
    maxTasks: 4,
  },
  {
    id: 'CONTENT' as const,
    name: '内容创作',
    nameEn: 'Content Creation',
    description: '生成内容创作方向',
    icon: '✍️',
    availableFor: ['free', 'pro'] as const,
    maxTasks: 2,
  },
  {
    id: 'MARKETING' as const,
    name: '营销文案',
    nameEn: 'Marketing Copy',
    description: '生成营销推广文案',
    icon: '📢',
    availableFor: ['free', 'pro'] as const,
    maxTasks: 3,
  },
  {
    id: 'DEVELOPMENT' as const,
    name: '快速开发',
    nameEn: 'Quick Development',
    description: '生成开发需求描述',
    icon: '💻',
    availableFor: ['pro'] as const,
    maxTasks: 2,
  },
]

export const quotaConfig = {
  guest: {
    dailyFetch: -1, // 无限（仅公共热点）
    dailyCopy: 3,
    scenarioCount: 1,
    refreshInterval: 0,
  },
  free: {
    dailyFetch: 10,
    dailyCopy: 20,
    scenarioCount: 2,
    refreshInterval: 60,
  },
  pro: {
    dailyFetch: -1,
    dailyCopy: -1,
    scenarioCount: 4,
    refreshInterval: 5,
  },
  admin: {
    dailyFetch: -1,
    dailyCopy: -1,
    scenarioCount: 4,
    refreshInterval: 0,
  },
} as const

export const regionConfig = [
  { id: 'us' as const, name: '美国', nameEn: 'United States', flag: '🇺🇸', language: 'en' },
  { id: 'cn' as const, name: '中国', nameEn: 'China', flag: '🇨🇳', language: 'zh' },
  { id: 'uk' as const, name: '英国', nameEn: 'United Kingdom', flag: '🇬🇧', language: 'en' },
  { id: 'jp' as const, name: '日本', nameEn: 'Japan', flag: '🇯🇵', language: 'ja' },
  { id: 'global' as const, name: '全球', nameEn: 'Global', flag: '🌏', language: 'en' },
]

export const ageGroupConfig = [
  { id: '18-24' as const, name: '18-24岁', nameEn: '18-24' },
  { id: '25-34' as const, name: '25-34岁', nameEn: '25-34' },
  { id: '35-44' as const, name: '35-44岁', nameEn: '35-44' },
  { id: '45+' as const, name: '45岁以上', nameEn: '45+' },
]

export const ethnicityConfig = [
  { id: 'asian' as const, name: '亚裔', nameEn: 'Asian' },
  { id: 'black' as const, name: '非裔', nameEn: 'Black' },
  { id: 'hispanic' as const, name: '拉丁裔', nameEn: 'Hispanic' },
  { id: 'white' as const, name: '白人', nameEn: 'White' },
  { id: 'other' as const, name: '其他', nameEn: 'Other' },
]
