'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale } from '@/types'
import zhCN from '@/locales/zh-CN.json'
import enUS from '@/locales/en-US.json'

const translations = { 'zh-CN': zhCN, 'en-US': enUS }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
}

const defaultContext: I18nContextType = {
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key) => key,
}

const I18nContext = createContext<I18nContextType>(defaultContext)

interface I18nProviderProps {
  children: ReactNode
  defaultLocale?: Locale
}

export function I18nProvider({ children, defaultLocale = 'zh-CN' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  // 从Cookie读取语言偏好
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return undefined
    }

    const savedLocale = getCookie('xtrendai_locale') as Locale
    if (savedLocale && (savedLocale === 'zh-CN' || savedLocale === 'en-US')) {
      setLocaleState(savedLocale)
    } else {
      // 检测浏览器语言
      const browserLang = navigator.language
      if (browserLang.startsWith('zh')) {
        setLocaleState('zh-CN')
      } else {
        setLocaleState('en-US')
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    // 保存到Cookie
    document.cookie = `xtrendai_locale=${newLocale};path=/;max-age=31536000`
  }

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.')
    let value: any = translations[locale]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key not found: ${key}`)
      return key
    }

    // 替换参数
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => params[paramKey] || `{${paramKey}}`)
    }

    return value
  }

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  return context
}
