'use client'

import { Trend } from '@/types'
import { TrendCard } from './TrendCard'

interface TrendListProps {
  trends: Trend[]
}

export function TrendList({ trends }: TrendListProps) {
  if (trends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-6xl">📭</div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          暂无热点数据
        </h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          点击"获取最新热点"按钮获取数据
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {trends.map((trend, index) => (
        <TrendCard key={trend.id} trend={trend} index={index} />
      ))}
    </div>
  )
}
