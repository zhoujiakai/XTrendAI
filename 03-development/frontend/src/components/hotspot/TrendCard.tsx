'use client'

import { useState } from 'react'
import { Trend, ScenarioTasks } from '@/types'
import { formatNumber, formatTime, getCategoryIcon, getCategoryColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, TrendingUp, ExternalLink } from 'lucide-react'
import { useCopy } from '@/hooks/useCopy'
import { useI18n } from '@/hooks/useI18n'

interface TrendCardProps {
  trend: Trend
  index: number
}

export function TrendCard({ trend, index }: TrendCardProps) {
  const { t } = useI18n()
  const [isExpanded, setIsExpanded] = useState(false)
  const [tasks, setTasks] = useState<ScenarioTasks[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { copy, isCopied } = useCopy()

  const displayName = trend.displayName || trend.name.replace(/^#/, '')
  const categoryColor = getCategoryColor(trend.category)

  const loadTasks = async () => {
    if (tasks) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trendId: trend.id }),
      })
      const result = await response.json()
      if (result.success) {
        setTasks(result.data.scenarios)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = () => {
    if (!isExpanded) {
      loadTasks()
    }
    setIsExpanded(!isExpanded)
  }

  const handleCopy = async (content: string) => {
    await copy(content)
  }

  return (
    <Card
      className="group overflow-hidden border-zinc-200/50 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-900/50"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardContent className="p-0">
        {/* Trend Header */}
        <button
          onClick={handleToggle}
          className="w-full px-5 py-4 text-left transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* Category Icon */}
              <span className="flex shrink-0 text-2xl">{getCategoryIcon(trend.category)}</span>

              {/* Trend Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {trend.name}
                  </h3>
                  {trend.url && (
                    <a
                      href={trend.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {/* Badges */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {formatNumber(trend.volume)} posts
                  </Badge>
                  {trend.growthRate > 0 && (
                    <Badge className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      {trend.growthRate}%
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {trend.category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Expand Icon */}
            <div className="flex shrink-0 items-center">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-zinc-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-zinc-400" />
              )}
            </div>
          </div>
        </button>

        {/* Tasks Section */}
        {isExpanded && (
          <div className="border-t border-zinc-200/50 bg-zinc-50/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/30">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-shimmer shimmer-bg rounded-lg"
                  />
                ))}
              </div>
            ) : tasks ? (
              <div className="space-y-4">
                {tasks.map((scenario) => (
                  <div key={scenario.scenario} className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      <span>{scenario.scenario === 'POD' ? '👕' : scenario.scenario === 'CONTENT' ? '✍️' : scenario.scenario === 'MARKETING' ? '📢' : '💻'}</span>
                      {scenario.scenarioName}
                    </h4>
                    <div className="space-y-2">
                      {scenario.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="group/task rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                {task.title}
                              </p>
                              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                                {task.content}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 h-7 px-2 text-xs opacity-0 transition-opacity group-hover/task:opacity-100"
                              onClick={() => handleCopy(task.content)}
                            >
                              {isCopied ? '已复制' : t('common.copy')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                暂无任务
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
