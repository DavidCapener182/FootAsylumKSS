import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export interface FRASummarizeResponse {
  escapeRoutesSummary?: string
  fireSafetyTrainingSummary?: string
  managementReviewStatement?: string
  significantFindings?: string[]
  riskRatingJustification?: string
  premisesDescription?: string
}

/**
 * Uses ChatGPT to summarize H&S audit PDF text into FRA-ready content.
 * Returns structured fields for escape routes, training, management review,
 * significant findings, risk rating justification, and premises description.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const { pdfText, premisesName } = await request.json()
    if (!pdfText || typeof pdfText !== 'string') {
      return NextResponse.json(
        { error: 'pdfText is required and must be a string' },
        { status: 400 }
      )
    }

    // Truncate to ~10k chars to stay within token limits
    const truncatedText = pdfText.length > 12000 ? pdfText.substring(0, 12000) + '\n\n[Text truncated...]' : pdfText

    const prompt = `You are a UK fire safety assessor preparing a Fire Risk Assessment (FRA) for retail premises. Below is extracted text from a Health & Safety audit. Summarise ONLY the fire-relevant findings into FRA-ready content. Use professional, evidence-led language. Phrase as "Observed during recent inspections" or "At the time of assessment" where appropriate. Do not invent findings—only include what the text supports.

Return a JSON object with these exact keys (use null if no relevant evidence):
- escapeRoutesSummary: 1-2 sentences on escape routes, final exits, obstructions, signage. Null if nothing relevant.
- fireSafetyTrainingSummary: 1-2 sentences on fire safety training, drills, induction, toolbox talks. Null if nothing relevant.
- managementReviewStatement: 1 sentence, e.g. "This assessment has been informed by recent health and safety inspections and site observations." or similar. Null if inappropriate.
- significantFindings: array of 2-4 sentences summarising key fire safety findings (detection, escape, fire doors, management). Must be evidence-based.
- riskRatingJustification: 1-2 sentences justifying a Tolerable or Moderate risk rating based on evidence. Null if insufficient evidence.
- premisesDescription: Brief 2-3 sentence description of the premises layout if the audit provides useful detail. Null otherwise.

${premisesName ? `Premises name: ${premisesName}` : ''}

H&S AUDIT TEXT:
---
${truncatedText}
---

Return ONLY valid JSON, no markdown or extra text.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a UK fire safety assessor. Return only valid JSON. Do not use markdown code blocks.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('[FRA-SUMMARIZE] OpenAI API error:', errData)
      return NextResponse.json(
        { error: 'Failed to generate summaries', details: errData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '').trim()) as FRASummarizeResponse

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('[FRA-SUMMARIZE] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to summarize audit' },
      { status: 500 }
    )
  }
}
