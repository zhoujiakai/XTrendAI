'use client'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { useUser } from '@/hooks/useUser'
import { Settings, User } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  const { locale, setLocale, t } = useI18n()
  const { isProfileComplete } = useUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/80 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/80">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <span className="text-sm font-bold text-white">X</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">XTrendAI</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
              className="gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <span className="text-base">
                {locale === 'zh-CN' ? '🇨🇳' : '🇺🇸'}
              </span>
              <span className="hidden md:inline">{locale === 'zh-CN' ? '中文' : 'EN'}</span>
            </Button>
          </div>

          {/* Profile Button */}
          <Link href="/profile">
            <Button
              variant={isProfileComplete ? 'ghost' : 'default'}
              size="sm"
              className={isProfileComplete
                ? 'gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                : 'gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-indigo-700'
              }
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isProfileComplete ? t('common.save') : '设置'}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
