function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function extractLastQuestion(value: string): string | null {
  const normalized = collapseWhitespace(value)
  if (!normalized) return null

  const finalQuestionIndex = normalized.lastIndexOf('?')
  if (finalQuestionIndex === -1) return null

  const upToQuestion = normalized.slice(0, finalQuestionIndex + 1)
  const separators = ['. ', '! ', '; ', ': ']

  let startIndex = 0
  for (const separator of separators) {
    const idx = upToQuestion.lastIndexOf(separator)
    if (idx !== -1) {
      startIndex = Math.max(startIndex, idx + separator.length)
    }
  }

  let candidate = collapseWhitespace(upToQuestion.slice(startIndex))

  // If the sentence boundary did not isolate a question well, try pulling from known interrogative starts.
  const questionStartMatch = candidate.match(
    /(Are|Is|Do|Does|Can|Has|Have|Were|Was|Will|Should|Could|Would|H&S|COSHH|Fire|Stock|Premises|Working)\b[\s\S]*\?$/i
  )
  if (questionStartMatch) {
    candidate = collapseWhitespace(questionStartMatch[0])
  }

  // Remove common section prefixes that can be included in pasted audit text.
  candidate = candidate
    .replace(/^(Fire Safety|General Site Information|Statutory Testing|Store Compliance|Training|COSHH)\s+/i, '')
    .replace(/^(Working at Height)\s+/i, '')
    .replace(/^(Premises and Equipment)\s+/i, '')
    .replace(/^(Fire Safety)\s+/i, '')
    .trim()

  // Discard very short/invalid candidates.
  if (candidate.split(' ').length < 3) return null

  // Ensure we only return a concise question title.
  if (candidate.length > 180) {
    const compactMatch = candidate.match(
      /(Are|Is|Do|Does|Can|Has|Have|Were|Was|Will|Should|Could|Would|H&S|COSHH|Fire|Stock|Premises|Working)\b[^?]{0,170}\?$/i
    )
    if (compactMatch) {
      candidate = collapseWhitespace(compactMatch[0])
    } else {
      candidate = `${candidate.slice(-176).trimStart().replace(/^[^A-Za-z]+/, '')}`
    }
  }

  return candidate
}

export function getStoreActionListTitle(action: any): string {
  const rawTitle = collapseWhitespace(String(action?.title || ''))
  const fallback = rawTitle || 'Store action'

  const questionFromTitle = extractLastQuestion(rawTitle)
  const questionFromSource = extractLastQuestion(String(action?.source_flagged_item || ''))
  const question = questionFromTitle || questionFromSource

  if (!question) {
    return fallback.length > 180 ? `${fallback.slice(0, 177).trimEnd()}...` : fallback
  }

  if (/\(\s*no\s*\)\s*$/i.test(question)) return question
  return `${question} (No)`
}
