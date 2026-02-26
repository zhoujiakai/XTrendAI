import { NextRequest, NextResponse } from 'next/server'
import { TaskService } from '@/services/TaskService'
import { TrendService } from '@/services/TrendService'
import { Locale, Scenario } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trendId, locale = 'zh-CN' } = body

    if (!trendId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少热点ID',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 获取热点信息
    const trend = await TrendService.getTrendById(trendId)
    if (!trend) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TREND_NOT_FOUND',
            message: '热点不存在',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // 默认使用POD场景
    const scenarios: Scenario[] = ['POD']

    // 生成任务
    const scenarioTasks = await TaskService.generateTasks({
      trend,
      scenarios,
      locale: locale as Locale,
    })

    return NextResponse.json({
      success: true,
      data: {
        trend: {
          id: trend.id,
          name: trend.name,
          displayName: trend.displayName,
        },
        scenarios: scenarioTasks,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '生成任务失败',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
