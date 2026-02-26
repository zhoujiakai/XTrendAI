import { UserProfile, UserRole } from '@/types'
import { quotaConfig } from '@/config/site'

const STORAGE_KEYS = {
  USER_ID: 'xtrendai_user_id',
  USER_ROLE: 'xtrendai_user_role',
  USER_PROFILE: 'xtrendai_user_profile',
  USER_USAGE: 'xtrendai_user_usage',
}

/**
 * 检查是否在浏览器环境
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

/**
 * 生成用户ID
 */
function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 从Cookie读取值
 */
function getCookie(name: string, cookieHeader?: string): string | undefined {
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const cookie = cookies.find(c => c.startsWith(`${name}=`))
    return cookie?.split('=')[1]
  }

  if (isBrowser) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
  }

  return undefined
}

/**
 * 设置Cookie
 */
function setCookie(name: string, value: string, days = 365): void {
  if (!isBrowser) return

  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

/**
 * 从localStorage读取值
 */
function getLocalStorage(key: string): string | null {
  if (!isBrowser) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * 写入localStorage
 */
function setLocalStorage(key: string, value: string): void {
  if (!isBrowser) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore errors
  }
}

export class UserService {
  /**
   * 获取或创建当前用户（客户端）
   */
  static getCurrentUser(userId?: string, userRole?: UserRole): { id: string; role: UserRole } {
    if (userId) {
      return { id: userId, role: userRole as UserRole || 'guest' }
    }

    let storedUserId = getLocalStorage(STORAGE_KEYS.USER_ID)
    let storedRole = (getLocalStorage(STORAGE_KEYS.USER_ROLE) as UserRole) || 'guest'

    if (!storedUserId) {
      storedUserId = generateId()
      setLocalStorage(STORAGE_KEYS.USER_ID, storedUserId)
      setLocalStorage(STORAGE_KEYS.USER_ROLE, 'guest')
      setCookie(STORAGE_KEYS.USER_ID, storedUserId)
      storedRole = 'guest'
    }

    return { id: storedUserId, role: storedRole }
  }

  /**
   * 从请求头获取用户信息（服务端）
   */
  static getUserFromRequest(headers?: Headers): { id: string; role: UserRole } {
    const userId = getCookie(STORAGE_KEYS.USER_ID, headers?.get('cookie') || undefined)
    const role = getCookie(STORAGE_KEYS.USER_ROLE, headers?.get('cookie') || undefined) as UserRole

    if (userId) {
      return { id: userId, role: role || 'guest' }
    }

    // 返回默认的访客用户
    return { id: generateId(), role: 'guest' }
  }

  /**
   * 获取用户画像（客户端）
   */
  static getUserProfile(): UserProfile | null {
    if (!isBrowser) return null

    const profileData = getLocalStorage(STORAGE_KEYS.USER_PROFILE)
    if (!profileData) return null

    try {
      return JSON.parse(profileData)
    } catch {
      return null
    }
  }

  /**
   * 保存用户画像（客户端）
   */
  static saveUserProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser()
    const existing = this.getUserProfile()

    const newProfile: UserProfile = {
      userId: current.id,
      role: current.role,
      region: profile.region || 'global',
      ageGroup: profile.ageGroup || '25-34',
      ethnicity: profile.ethnicity,
      scenarios: profile.scenarios || ['POD'],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setLocalStorage(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile))
    setCookie(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile))
    return newProfile
  }

  /**
   * 获取配额信息（服务端兼容）
   */
  static getQuotaInfo(userId?: string, headers?: Headers) {
    // 服务端：从请求头获取用户信息
    const user = userId ? { id: userId, role: 'guest' as UserRole } : this.getUserFromRequest(headers)
    const role = user.role
    const limits = quotaConfig[role]

    const today = new Date().toDateString()

    // 尝试从Cookie读取使用情况
    const usageData = getCookie(STORAGE_KEYS.USER_USAGE, headers?.get('cookie') || undefined)

    let usage = {
      date: today,
      fetchCount: 0,
      copyCount: 0,
      lastFetchAt: null as string | null,
      lastCopyAt: null as string | null,
    }

    if (usageData) {
      try {
        const saved = JSON.parse(decodeURIComponent(usageData))
        if (saved.date === today) {
          usage = saved
        }
      } catch {
        // Use default
      }
    }

    // 计算重置时间
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return {
      userId: user.id,
      role,
      limits,
      usage,
      resetsAt: tomorrow.toISOString(),
    }
  }

  /**
   * 检查用户是否可以访问某个场景
   */
  static canAccessScenario(scenario: 'POD' | 'CONTENT' | 'MARKETING' | 'DEVELOPMENT', role?: UserRole): boolean {
    const userRole = role || 'guest'
    const { scenarioCount } = quotaConfig[userRole]

    if (scenarioCount === 4) return true // Pro用户可以访问所有
    if (userRole === 'guest') return scenario === 'POD' // Guest只能访问POD

    // 需要检查用户配置
    const profile = this.getUserProfile()
    if (!profile) return false

    return profile.scenarios.includes(scenario)
  }

  /**
   * 登出（客户端）
   */
  static logout(): void {
    if (!isBrowser) return

    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore
      }
    })

    // 清除cookies
    Object.values(STORAGE_KEYS).forEach(key => {
      document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
    })
  }

  /**
   * 获取公共热点（无需登录）
   */
  static shouldReturnPublicTrendsOnly(headers?: Headers): boolean {
    const user = this.getUserFromRequest(headers)
    return user.role === 'guest'
  }
}
