import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { dashboardData } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `
      Act as a Senior Retail Compliance Officer. Analyze the following dashboard data for our retail chain:
      
      - Open Incidents: ${dashboardData.openIncidents}
      - Under Investigation: ${dashboardData.underInvestigation}
      - Overdue Actions: ${dashboardData.overdueActions}
      - High/Critical Risk Incidents (30d): ${dashboardData.highCritical}
      - Audit Completion: First Round ${dashboardData.auditStats.firstAuditPercentage}%, Second Round ${dashboardData.auditStats.secondAuditPercentage}%
      - Top Stores with Issues: ${dashboardData.topStores.map((s: any) => `${s.name} (${s.count} incidents)`).join(', ')}
      
      Please provide a response in HTML format (no markdown code blocks, just raw HTML tags like <h3>, <p>, <ul>, <li>) with the following structure:
      1. <h3>Executive Summary</h3>: A 2-sentence overview of the current risk landscape.
      2. <h3>Key Concerns</h3>: A bulleted list of the most pressing issues based on the stats.
      3. <h3>Recommended Actions</h3>: 3 specific, actionable steps for the management team to take this week.
      
      Keep the tone professional, urgent but constructive.
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
            content: 'You are a Senior Retail Compliance Officer. Provide responses in HTML format without markdown code blocks. Use proper HTML tags like <h3>, <p>, <ul>, <li> directly in your response.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate report', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    let text = data.choices?.[0]?.message?.content || 'Unable to generate report.'
    
    // Clean up markdown code blocks if OpenAI adds them despite instructions
    text = text.replace(/```html/g, '').replace(/```/g, '').trim()

    return NextResponse.json({ content: text })
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

