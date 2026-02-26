import { NextRequest, NextResponse } from 'next/server'
import { TrendService } from '@/services/TrendService'
import { UserService } from '@/services/UserService'
import { ApiResponse, Trend } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // 获取用户信息（从请求头/Cookie）
    const headers = request.headers
    const user = UserService.getUserFromRequest(headers)

    // Guest用户只返回公共热点
    if (user.role === 'guest') {
      const publicTrends = await TrendService.getPublicTrends()
      return NextResponse.json<ApiResponse<{ trends: Trend[]; total: number; lastUpdated: string }>>({
        success: true,
        data: {
          trends: publicTrends.slice(0, 10),
          total: publicTrends.length,
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    }

    // 检查配额
    const quotaInfo = UserService.getQuotaInfo(user.id, headers)

    // 检查获取次数限制
    if (quotaInfo.limits.dailyFetch > 0 && quotaInfo.usage.fetchCount >= quotaInfo.limits.dailyFetch) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: '今日获取次数已达上限',
            details: {
              limit: quotaInfo.limits.dailyFetch,
              used: quotaInfo.usage.fetchCount,
              resetsAt: quotaInfo.resetsAt,
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      )
    }

    // 获取用户画像进行个性化筛选（从Cookie读取）
    let profile = UserService.getUserProfile()
    if (!profile && headers.get('cookie')) {
      // 尝试从Cookie读取用户画像
      const profileData = headers.get('cookie')?.match(/xtrendai_user_profile=([^;]+)/)?.[1]
      if (profileData) {
        try {
          profile = JSON.parse(decodeURIComponent(profileData))
        } catch {
          profile = null
        }
      }
    }

    // 获取个性化热点
    const trends = await TrendService.getFilteredTrends({
      region: profile?.region,
      ageGroup: profile?.ageGroup,
      scenarioCount: profile?.scenarios.length || 1,
      limit: 10,
    })

    // 计算下次可刷新时间
    const nextRefresh = new Date()
    if (quotaInfo.limits.refreshInterval > 0) {
      nextRefresh.setMinutes(nextRefresh.getMinutes() + quotaInfo.limits.refreshInterval)
    }

    return NextResponse.json<ApiResponse<{ trends: Trend[]; total: number; lastUpdated: string; nextRefreshAt?: string }>>({
      success: true,
      data: {
        trends,
        total: trends.length,
        lastUpdated: new Date().toISOString(),
        nextRefreshAt: quotaInfo.limits.refreshInterval > 0 ? nextRefresh.toISOString() : undefined,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /trends] Error fetching trends:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取热点失败',
          details: errorMessage,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
