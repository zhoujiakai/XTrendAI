import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/UserService'

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers
    const user = UserService.getUserFromRequest(headers)
    const quotaInfo = UserService.getQuotaInfo(user.id, headers)

    return NextResponse.json({
      success: true,
      data: quotaInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching quota:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取配额信息失败',
          details: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
