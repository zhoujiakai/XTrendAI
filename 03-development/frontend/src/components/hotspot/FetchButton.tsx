'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface FetchButtonProps {
  isFetching: boolean
  lastUpdated: string | null
  onClick: () => void
}

export function FetchButton({ isFetching, lastUpdated, onClick }: FetchButtonProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        {lastUpdated ? (
          <>
            {t('home.lastUpdate')}: {new Date(lastUpdated).toLocaleTimeString()}
          </>
        ) : (
          <>点击按钮获取最新热点</>
        )}
      </div>
      <Button
        onClick={onClick}
        disabled={isFetching}
        className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 px-6 font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 disabled:opacity-70"
      >
        {isFetching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            {t('home.fetchTrends')}
          </>
        )}
      </Button>
    </div>
  )
}
