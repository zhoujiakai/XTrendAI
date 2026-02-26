import { NextRequest, NextResponse } from 'next/server'

// X API 配置
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || ''

// WOEID 映射
const WOEID_MAP: Record<string, number> = {
  'us': 23424977,
  'cn': 23424781,
  'uk': 23424975,
  'jp': 23424856,
  'global': 1
}

export async function GET(request: NextRequest) {
  try {
    // 检查配置
    if (!X_BEARER_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_CONFIG',
            message: 'X Bearer Token 未配置',
            details: '请检查 .env.local 中的 X_BEARER_TOKEN'
          }
        },
        { status: 500 }
      )
    }

    // 获取地区参数
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || 'global'
    const woeid = WOEID_MAP[region] || 1

    // X API v1.1 端点
    const apiUrl = `https://api.twitter.com/1.1/trends/place.json?id=${woeid}`

    console.log('[X Proxy] Fetching trends from X API:', { region, woeid, apiUrl })

    // 发送请求到 X API (使用 Bearer Token)
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[X Proxy] X API Error:', response.status, response.statusText, errorText)

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'X_API_ERROR',
            message: `X API 请求失败: ${response.status} ${response.statusText}`,
            details: errorText
          }
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    const trends = data[0]?.trends || []

    console.log('[X Proxy] Got trends:', trends.length, 'items')

    // 转换为标准格式
    const normalizedTrends = trends.map((trend: any, index: number) => ({
      id: `x-trend-${Date.now()}-${index}`,
      name: trend.name,
      displayName: trend.name,
      volume: trend.tweet_volume || 0,
      growthRate: 0, // X API v1.1 不提供增长率
      category: 'unknown',
      regions: [region],
      isPublic: true,
      relatedTweets: trend.tweet_volume || 0,
      url: trend.url,
      keywords: trend.name.split(/\s+/).filter((w: string) => w.startsWith('#')).map((w: string) => w.substring(1)),
      updatedAt: new Date().toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: {
        trends: normalizedTrends,
        total: normalizedTrends.length,
        source: 'x-api',
        region,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[X Proxy] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '代理服务错误',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}
