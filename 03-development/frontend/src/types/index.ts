// 用户相关类型
export type UserRole = 'guest' | 'free' | 'pro' | 'admin'

export type Region = 'us' | 'cn' | 'uk' | 'jp' | 'global'

export type AgeGroup = '18-24' | '25-34' | '35-44' | '45+'

export type Ethnicity = 'asian' | 'black' | 'hispanic' | 'white' | 'other'

export type Scenario = 'POD' | 'CONTENT' | 'MARKETING' | 'DEVELOPMENT'

export type Locale = 'zh-CN' | 'en-US'

export interface UserProfile {
  userId: string
  role: UserRole
  region: Region
  ageGroup: AgeGroup
  ethnicity?: Ethnicity
  scenarios: Scenario[]
  createdAt: string
  updatedAt: string
}

export interface QuotaInfo {
  userId: string
  role: UserRole
  limits: {
    dailyFetch: number
    dailyCopy: number
    scenarioCount: number
    refreshInterval: number
  }
  usage: {
    fetchCount: number
    copyCount: number
    lastFetchAt: string | null
    lastCopyAt: string | null
  }
  resetsAt: string
}

// 热点相关类型
export interface Trend {
  id: string
  name: string
  displayName?: string
  volume: number
  growthRate: number
  category: string
  regions: string[]
  isPublic: boolean
  relatedTweets?: number
  url?: string
  keywords?: string[]
  demographics?: {
    ageGroups: string[]
    regions: string[]
  }
  updatedAt: string
}

// 任务相关类型
export interface Task {
  id: string
  trendId: string
  scenario: Scenario
  type: string
  title: string
  content: string
  wordCount: number
  templateId: string
  createdAt: string
}

export interface ScenarioTasks {
  scenario: Scenario
  scenarioName: string
  tasks: Task[]
}

// API响应类型
export interface ApiResponse<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// 请求类型
export interface GenerateTasksRequest {
  trendId: string
  scenarios?: Scenario[]
  userId?: string
}

export interface UpdateProfileRequest {
  region?: Region
  ageGroup?: AgeGroup
  ethnicity?: Ethnicity | null
  scenarios?: Scenario[]
}
