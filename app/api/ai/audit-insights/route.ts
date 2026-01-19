import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { metrics, stores, recentAudits, topFailedQuestions, sectionFails } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `
      You are a retail compliance analytics assistant. Review the audit summary below and provide a concise executive insight.

      Metrics:
      - Completed audits: ${metrics?.totalAudits ?? 0}
      - Average score: ${metrics?.avgScore ?? 0}%
      - Audits in last 30 days: ${metrics?.last30Count ?? 0}

      Top stores by audit count:
      ${Array.isArray(stores) ? stores.map((s: any) => `- ${s.name}: ${s.count} audits, ${s.avg}% avg`).join('\n') : 'None'}

      Top failed questions:
      ${Array.isArray(topFailedQuestions) ? topFailedQuestions.map((q: any) => `- ${q.question} (${q.section}): ${q.fails}/${q.total} (${q.rate}%)`).join('\n') : 'None'}

      Sections with most fails:
      ${Array.isArray(sectionFails) ? sectionFails.map((s: any) => `- ${s.section}: ${s.fails}/${s.total} (${s.rate}%)`).join('\n') : 'None'}

      Recent audits:
      ${Array.isArray(recentAudits) ? recentAudits.map((a: any) => `- ${a.store}: ${a.score}% (${a.date})`).join('\n') : 'None'}

      Return HTML only (no markdown). Structure:
      <h3>Executive Summary</h3>
      <p>...</p>
      <h3>Trends to Watch</h3>
      <ul><li>...</li></ul>
      <h3>Recommended Focus</h3>
      <ul><li>...</li></ul>
    `

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
            content: 'Provide concise analytics insights in HTML. No markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate insights', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    let text = data.choices?.[0]?.message?.content || 'Unable to generate insights.'
    text = text.replace(/```html/g, '').replace(/```/g, '').trim()

    return NextResponse.json({ content: text })
  } catch (error) {
    console.error('Error generating audit insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
