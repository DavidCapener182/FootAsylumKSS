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

    // Get current date context
    const today = new Date()
    const currentDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const currentMonth = today.getMonth() + 1 // 1-12 (January = 1)
    const currentYear = today.getFullYear()

    const prompt = `
      Act as a Senior Retail Compliance Officer. Analyze the following dashboard data for our retail chain:
      
      **IMPORTANT DATE CONTEXT:**
      - Current Date: ${currentDate}
      - Day of Year: ${dayOfYear} (we are ${dayOfYear} days into ${currentYear})
      - Audit Schedule: First round audits are scheduled for the FIRST HALF of the year (January-June), and second round audits are scheduled for the SECOND HALF of the year (July-December).
      - Each store needs ONE audit completed in the first half (Jan-Jun) and ONE audit completed in the second half (Jul-Dec).
      
      **DASHBOARD DATA:**
      - Open Incidents: ${dashboardData.openIncidents}
      - Under Investigation: ${dashboardData.underInvestigation}
      - Overdue Actions: ${dashboardData.overdueActions}
      - High/Critical Risk Incidents (30d): ${dashboardData.highCritical}
      - Audit Completion: First Round ${dashboardData.auditStats.firstAuditPercentage}%, Second Round ${dashboardData.auditStats.secondAuditPercentage}%
      - Top Stores with Issues: ${dashboardData.topStores.map((s: any) => `${s.name} (${s.count} incidents)`).join(', ')}
      
      **CRITICAL CONTEXT FOR ANALYSIS:**
      - We are only ${dayOfYear} days into the year. The first round of audits has a 6-month window (January-June).
      - Having ${dashboardData.auditStats.firstAuditPercentage}% completion after only ${dayOfYear} days in January is NOT concerning - there is plenty of time to complete first round audits throughout the first half of the year.
      - Second round audits are NOT expected until the second half of the year (July-December), so ${dashboardData.auditStats.secondAuditPercentage}% completion is completely normal and expected at this point.
      - When analyzing audit completion rates, consider that audits are spread across 6-month windows, not rushed at the start of each period.
      
      **OPERATIONAL CONTEXT:**
      - We are Health and Safety Consultants conducting compliance audits for the retail chain.
      - Audits are UNANNOUNCED (surprise audits) - store managers do not know when we will arrive.
      - Store managers should NOT be preparing for audits, as the purpose is to assess their normal daily operations and compliance.
      - We (the consultants) schedule and conduct the audits - store managers do not schedule audits themselves.
      - Recommendations should focus on ensuring our audit team plans and schedules audits effectively, NOT on having store managers prepare for audits.
      - Do NOT recommend that store managers schedule audits or prepare for audits - this would defeat the purpose of unannounced audits.
      
      Please provide a response in HTML format (no markdown code blocks, just raw HTML tags like <h3>, <p>, <ul>, <li>) with the following structure:
      1. <h3>Executive Summary</h3>: A 2-sentence overview of the current risk landscape, taking into account that we are early in the year and audit completion rates should be evaluated against the 6-month windows, not daily expectations.
      2. <h3>Key Concerns</h3>: A bulleted list of the most pressing issues based on the stats. Do NOT list low audit completion rates as a concern if we are early in the audit window - only flag if there are genuine compliance risks.
      3. <h3>Recommended Actions</h3>: 3 specific, actionable steps for OUR audit team (Health and Safety Consultants) to take. Focus on planning and scheduling audits effectively. Do NOT recommend store managers schedule or prepare for audits - audits must remain unannounced.
      
      Keep the tone professional, realistic, and constructive. Do not create false urgency about audit completion rates when we are early in the audit period. Remember: we conduct unannounced audits as consultants, not store managers.
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

