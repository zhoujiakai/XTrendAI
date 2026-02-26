import { NextRequest, NextResponse } from 'next/server'
import { Locale } from '@/types'
import zhCN from '@/locales/zh-CN.json'
import enUS from '@/locales/en-US.json'

const translations = { 'zh-CN': zhCN, 'en-US': enUS }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const locale = (searchParams.get('locale') || 'zh-CN') as Locale

  return NextResponse.json({
    success: true,
    data: translations[locale],
    timestamp: new Date().toISOString(),
  })
}
