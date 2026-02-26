'use client'

import { useState, useEffect } from 'react'
import { Trend } from '@/types'
import { Header } from '@/components/layout/Header'
import { TrendList } from '@/components/hotspot/TrendList'
import { FetchButton } from '@/components/hotspot/FetchButton'
import { Loader2 } from 'lucide-react'

function HomeContent() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const fetchTrends = async () => {
    setIsFetching(true)
    try {
      const response = await fetch('/api/trends')

      // 先检查响应状态
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[fetchTrends] Response not OK:', response.status, response.statusText, errorText)
        return
      }

      const result = await response.json()

      if (result.success) {
        setTrends(result.data.trends)
        setLastUpdated(result.data.lastUpdated)
      } else {
        console.error('[fetchTrends] API returned error:', result.error)
      }
    } catch (error) {
      console.error('[fetchTrends] Exception caught:', error)
    } finally {
      setIsFetching(false)
      setIsInitialLoad(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <Header />

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {/* Hero Section */}
        <section className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            实时热点追踪
          </div>

          <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            今日热点
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            X平台热点驱动的智能任务生成
          </p>
        </section>

        {/* Fetch Button */}
        <div className="mb-6">
          <FetchButton
            isFetching={isFetching}
            lastUpdated={lastUpdated}
            onClick={fetchTrends}
          />
        </div>

        {/* Trends List */}
        <section>
          {isInitialLoad ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="mt-4 text-sm text-zinc-500">加载热点中...</p>
            </div>
          ) : (
            <TrendList trends={trends} />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
        <p>© 2026 XTrendAI. Powered by X Trends API</p>
      </footer>
    </div>
  )
}

export default function Home() {
  return <HomeContent />
}
