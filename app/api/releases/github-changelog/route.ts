import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GITHUB_REPO = process.env.GITHUB_REPO || 'DavidCapener182/FootAsylumKSS'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

function ghHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  }
  if (GITHUB_TOKEN) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  return headers
}

function parseUnreleasedSection(markdown: string): string | null {
  const unreleasedRegex = /##\s+\[?Unreleased\]?\s*\n([\s\S]*?)(?=\n##\s+\[?\d|$)/i
  const match = markdown.match(unreleasedRegex)
  return match ? match[1].trim() : null
}

function semverSort(tagNames: string[]): string[] {
  const parse = (t: string) => {
    const m = t.replace(/^v/, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?/)
    if (!m) return [0, 0, 0]
    return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)]
  }
  return [...tagNames].sort((a, b) => {
    const pa = parse(a)
    const pb = parse(b)
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return (pb[i] as number) - (pa[i] as number)
    }
    return 0
  })
}

/** Skip merge commits; format first line as user-facing markdown (New / Fix / bullet). */
function toUserFacingChangelog(commits: { commit: { message: string } }[], heading: string): string {
  const seen = new Set<string>()
  const bullets: string[] = []
  for (const c of commits) {
    const raw = (c.commit?.message || '').split('\n')[0].trim()
    if (!raw) continue
    if (/^Merge (pull request|branch|PR )/i.test(raw)) continue
    const normalized = raw.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)

    const featMatch = raw.match(/^feat(?:\([^)]*\))?:\s*(.+)/i)
    const fixMatch = raw.match(/^fix(?:\([^)]*\))?:\s*(.+)/i)
    const choreMatch = raw.match(/^chore(?:\([^)]*\))?:\s*(.+)/i)
    if (featMatch) {
      bullets.push(`- **New:** ${featMatch[1].trim()}`)
    } else if (fixMatch) {
      bullets.push(`- **Fix:** ${fixMatch[1].trim()}`)
    } else if (choreMatch) {
      bullets.push(`- ${choreMatch[1].trim()}`)
    } else {
      bullets.push(`- ${raw}`)
    }
  }
  if (bullets.length === 0) return `${heading}\n\n_No user-facing changes._`
  return `${heading}\n\n${bullets.join('\n')}`
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const previousVersion = searchParams.get('previousVersion')?.trim() // optional: only use if you know this tag exists on GitHub

  const [owner, repo] = GITHUB_REPO.split('/')
  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'GITHUB_REPO env must be owner/repo (e.g. DavidCapener182/FootAsylumKSS)' },
      { status: 400 }
    )
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`

  try {
    // 1) Try CHANGELOG.md – use Unreleased section if present
    const fileRes = await fetch(`${baseUrl}/contents/CHANGELOG.md`, { headers: ghHeaders() })
    if (fileRes.ok) {
      const fileJson = await fileRes.json()
      const content = fileJson.content ? Buffer.from(fileJson.content, 'base64').toString('utf-8') : ''
      const unreleased = parseUnreleasedSection(content)
      if (unreleased) {
        return NextResponse.json({ content: unreleased, source: 'changelog' })
      }
    }

    // 2) Fallback: commits since last tag, or all recent commits if no tags
    const repoRes = await fetch(`${baseUrl}`, { headers: ghHeaders() })
    if (!repoRes.ok) {
      const err = await repoRes.text()
      return NextResponse.json(
        { error: 'Failed to fetch repo. Is GITHUB_REPO correct? Private repos need GITHUB_TOKEN.', details: err },
        { status: 502 }
      )
    }
    const repoData = await repoRes.json()
    const defaultBranch = repoData.default_branch || 'main'

    let baseRef: string | null = null
    if (previousVersion) {
      const v = previousVersion.startsWith('v') ? previousVersion : `v${previousVersion}`
      baseRef = v
    } else {
      const tagsRes = await fetch(`${baseUrl}/tags?per_page=100`, { headers: ghHeaders() })
      if (tagsRes.ok) {
        const tags = await tagsRes.json()
        const names = (tags as { name: string }[]).map((t) => t.name).filter(Boolean)
        if (names.length > 0) {
          const sorted = semverSort(names)
          baseRef = sorted[0]
        }
      }
    }

    if (baseRef) {
      const compareRes = await fetch(
        `${baseUrl}/compare/${encodeURIComponent(baseRef)}...${encodeURIComponent(defaultBranch)}`,
        { headers: ghHeaders() }
      )
      if (compareRes.ok) {
        const compareData = await compareRes.json()
        const commits = (compareData.commits || []) as { commit: { message: string }; html_url?: string }[]
        const aheadBy = compareData.ahead_by ?? 0

        if (aheadBy === 0) {
          return NextResponse.json({
            content: '_No new commits since last release._',
            source: 'commits',
          })
        }

        const content = toUserFacingChangelog(commits.reverse(), `## Changes since ${baseRef}`)
        return NextResponse.json({ content, source: 'commits' })
      }
      if (compareRes.status === 404) {
        return NextResponse.json(
          { error: `Tag "${baseRef}" not found on GitHub. Create that release tag, or add a CHANGELOG.md with an ## [Unreleased] section.` },
          { status: 404 }
        )
      }
    }

    // No tags or compare failed: get recent commits on default branch (no tag required)
    const commitsRes = await fetch(`${baseUrl}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=50`, {
      headers: ghHeaders(),
    })
    if (!commitsRes.ok) {
      return NextResponse.json(
        { error: 'Could not load commits. Add a CHANGELOG.md with an ## [Unreleased] section, or create a release tag on GitHub.' },
        { status: 502 }
      )
    }
    const commitsList = (await commitsRes.json()) as { commit: { message: string } }[]
    const content = toUserFacingChangelog(commitsList, `## What's new`)
    return NextResponse.json({ content, source: 'commits' })
  } catch (e) {
    console.error('GitHub changelog error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch changelog from GitHub' },
      { status: 500 }
    )
  }
}
