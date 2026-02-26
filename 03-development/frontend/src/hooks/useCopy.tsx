'use client'

import { useState } from 'react'
import { copyToClipboard } from '@/lib/utils'

export function useCopy() {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const copy = async (text: string): Promise<boolean> => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
    return success
  }

  return { copy, isCopied, copiedText }
}
