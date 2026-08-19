import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8')

describe('application zoom accessibility contract', () => {
  it('does not restrict browser zoom or mount a document zoom normalizer', () => {
    const rootLayout = readSource('app/layout.tsx')

    expect(rootLayout).not.toContain('maximumScale')
    expect(rootLayout).not.toContain('userScalable')
    expect(rootLayout).not.toContain('ScreenZoomNormalizer')
    expect(
      existsSync(path.join(process.cwd(), 'components/layout/screen-zoom-normalizer.tsx'))
    ).toBe(false)
  })

  it('uses dynamic viewport units without CSS zoom compensation', () => {
    const globalCss = readSource('app/globals.css')
    const viewportConsumers = [
      readSource('app/(protected)/layout.tsx'),
      readSource('components/layout/sidebar-client.tsx'),
      readSource('components/ui/dialog.tsx'),
    ].join('\n')

    expect(globalCss).not.toContain('--app-zoom')
    expect(globalCss).not.toContain('h-screen-zoom')
    expect(viewportConsumers).not.toContain('h-screen-zoom')
    expect(viewportConsumers).toContain('100dvh')
  })
})
