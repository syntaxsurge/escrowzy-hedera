'use client'

import dynamic from 'next/dynamic'

import { useTheme } from 'next-themes'
import '@uiw/react-markdown-preview/markdown.css'
import '@/styles/components/markdown-viewer.css'

const MDPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then(mod => mod.default),
  { ssr: false }
)

interface MarkdownViewerProps {
  content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const { theme } = useTheme()

  return (
    <div data-color-mode={theme === 'dark' ? 'dark' : 'light'}>
      <MDPreview
        source={content}
        style={{
          backgroundColor: 'transparent',
          color: 'inherit'
        }}
        wrapperElement={{
          'data-color-mode': theme === 'dark' ? 'dark' : 'light'
        }}
      />
    </div>
  )
}
