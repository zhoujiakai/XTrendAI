import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/UserService'
import { UserProfile } from '@/types'

// GET /api/user/profile - 获取用户画像
export async function GET(request: NextRequest) {
  try {
    // 从Cookie读取用户画像
    const headers = request.headers
    const profileData = headers.get('cookie')?.match(/xtrendai_user_profile=([^;]+)/)?.[1]

    let profile: UserProfile | null = null
    if (profileData) {
      try {
        profile = JSON.parse(decodeURIComponent(profileData))
      } catch {
        profile = null
      }
    }

    // 如果Cookie中没有，尝试从localStorage读取（需要从客户端传过来）
    // 或者返回null，让客户端处理

    return NextResponse.json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户画像失败',
          details: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile - 更新用户画像
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // 创建用户画像对象
    const user = UserService.getUserFromRequest(request.headers)
    const profile: UserProfile = {
      userId: user.id,
      role: user.role,
      region: body.region || 'global',
      ageGroup: body.ageGroup || '25-34',
      ethnicity: body.ethnicity,
      scenarios: body.scenarios || ['POD'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 设置Cookie（30天有效期）
    const cookieValue = encodeURIComponent(JSON.stringify(profile))
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)

    const response = NextResponse.json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    })

    // 设置Cookie
    response.cookies.set('xtrendai_user_profile', cookieValue, {
      expires,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新用户画像失败',
          details: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
