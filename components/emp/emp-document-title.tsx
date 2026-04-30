'use client'

import { useEffect } from 'react'

type EmpDocumentTitleProps = {
  title: string
}

export function EmpDocumentTitle({ title }: EmpDocumentTitleProps) {
  useEffect(() => {
    const nextTitle = title.trim()
    if (nextTitle) {
      document.title = nextTitle
    }
  }, [title])

  return null
}
