'use client'

import { I18nProvider } from '@/hooks/useI18n'
import { UserProvider } from '@/hooks/useUser'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </I18nProvider>
  )
}
