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
    const currentYear = today.getFullYear()

    const auditStats = dashboardData?.auditStats || {}
    const storeActionStats = dashboardData?.storeActionStats || {}
    const combinedActionStats = dashboardData?.combinedActionStats || {}
    const complianceTracking = dashboardData?.complianceTracking || {}
    const fraStats = dashboardData?.fraStats || {}
    const complianceForecast = dashboardData?.complianceForecast || {}

    const topIncidentStores = (Array.isArray(dashboardData?.topStores) ? dashboardData.topStores : [])
      .slice(0, 5)
      .map((s: any) => ({
        store: s?.name || 'Unknown',
        storeCode: s?.code || null,
        incidents: Number(s?.count || 0),
      }))

    const topStoreActionStores = (Array.isArray(storeActionStats?.topStores) ? storeActionStats.topStores : [])
      .slice(0, 5)
      .map((s: any) => ({
        store: s?.name || 'Unknown',
        storeCode: s?.code || null,
        activeActions: Number(s?.count || 0),
        overdueActions: Number(s?.overdue || 0),
      }))

    const topForecastStores = (Array.isArray(complianceForecast?.stores) ? complianceForecast.stores : [])
      .slice(0, 5)
      .map((store: any) => ({
        store: store?.storeName || 'Unknown',
        code: store?.storeCode || null,
        region: store?.region || null,
        riskBand: store?.riskBand || null,
        riskScore: typeof store?.riskScore === 'number' ? store.riskScore : null,
        fraStatus: store?.fraStatus || null,
        latestAuditScore: typeof store?.latestAuditScore === 'number' ? store.latestAuditScore : null,
        overdueActions: Number(store?.overdueActions || 0),
        openIncidents: Number(store?.openIncidents || 0),
        drivers: Array.isArray(store?.drivers) ? store.drivers : [],
      }))

    const plannedRouteCount = Array.isArray(dashboardData?.plannedRoutes) ? dashboardData.plannedRoutes.length : 0
    const plannedStoreCount = Array.isArray(dashboardData?.plannedRoutes)
      ? dashboardData.plannedRoutes.reduce((sum: number, route: any) => {
          const stores = Array.isArray(route?.stores) ? route.stores.length : Number(route?.storeCount || 0)
          return sum + stores
        }, 0)
      : 0

    const intelligenceSnapshot = {
      asOf: currentDate,
      timeline: {
        dayOfYear,
        year: currentYear,
        auditCycle: 'Round 1 Jan-Jun, Round 2 Jul-Dec',
      },
      incidentRisk: {
        openIncidents: Number(dashboardData?.openIncidents || 0),
        underInvestigation: Number(dashboardData?.underInvestigation || 0),
        highCritical30d: Number(dashboardData?.highCritical || 0),
        overdueIncidentActions: Number(dashboardData?.overdueActions || 0),
      },
      storeActions: {
        active: Number(storeActionStats?.active || 0),
        overdue: Number(storeActionStats?.overdue || 0),
        highUrgent: Number(storeActionStats?.highUrgent || 0),
        statusCounts: storeActionStats?.statusCounts || {},
        priorityCounts: storeActionStats?.priorityCounts || {},
      },
      combinedActions: {
        incidentOverdue: Number(combinedActionStats?.incidentOverdue || 0),
        storeOverdue: Number(combinedActionStats?.storeOverdue || 0),
        totalOverdue: Number(combinedActionStats?.totalOverdue || 0),
      },
      auditCompletion: {
        totalStores: Number(auditStats?.totalStores || 0),
        firstAuditsComplete: Number(auditStats?.firstAuditsComplete || 0),
        secondAuditsComplete: Number(auditStats?.secondAuditsComplete || 0),
        firstAuditPercentage: Number(auditStats?.firstAuditPercentage || 0),
        secondAuditPercentage: Number(auditStats?.secondAuditPercentage || 0),
        fullyCompliantPercentage: Number(auditStats?.totalAuditPercentage || 0),
      },
      complianceTracking: {
        noAuditStartedCount: Number(complianceTracking?.noAuditStartedCount || 0),
        awaitingSecondAuditCount: Number(complianceTracking?.awaitingSecondAuditCount || 0),
        secondAuditPlannedCount: Number(complianceTracking?.secondAuditPlannedCount || 0),
        secondAuditUnplannedCount: Number(complianceTracking?.secondAuditUnplannedCount || 0),
        storesNeedingSecondVisitCount: Number(complianceTracking?.storesNeedingSecondVisitCount || 0),
        plannedRoutesCount: Number(complianceTracking?.plannedRoutesCount || 0),
        plannedVisitsNext14Days: Number(complianceTracking?.plannedVisitsNext14Days || 0),
      },
      fraTracking: {
        storesRequiringFRA: Number(dashboardData?.storesRequiringFRA || 0),
        required: Number(fraStats?.required || 0),
        due: Number(fraStats?.due || 0),
        overdue: Number(fraStats?.overdue || 0),
        upToDate: Number(fraStats?.upToDate || 0),
        inDateCoveragePercentage: Number(fraStats?.inDateCoveragePercentage || 0),
      },
      predictiveRisk: {
        highRiskCount: Number(complianceForecast?.highRiskCount || 0),
        mediumRiskCount: Number(complianceForecast?.mediumRiskCount || 0),
        lowRiskCount: Number(complianceForecast?.lowRiskCount || 0),
        avgRiskScore: Number(complianceForecast?.avgRiskScore || 0),
      },
      planningPipeline: {
        plannedRouteCount,
        plannedStoreCount,
      },
      topIncidentStores,
      topStoreActionStores,
      topForecastStores,
    }

    const prompt = `
      Act as a senior KSS NW compliance intelligence lead creating a concise internal briefing for Footasylum leadership.

      IMPORTANT CONTEXT:
      - Current date: ${currentDate}
      - Day of year: ${dayOfYear} (${currentYear})
      - Audit cadence: Round 1 runs Jan-Jun, Round 2 runs Jul-Dec.
      - Audits are unannounced and executed by KSS NW consultants.
      - Use all systems in your analysis: incidents, incident actions, store actions, FRA status, audit progress, visit planning, and predictive risk.

      ANALYTICS SNAPSHOT (JSON):
      ${JSON.stringify(intelligenceSnapshot, null, 2)}

      INSTRUCTIONS:
      - Do not create false urgency solely because round completion is low early in the cycle.
      - Explicitly call out store actions (including overdue/high-urgent), FRA exposure, and compliance tracking gaps.
      - Include at least one recommendation tied to each of:
        1) store actions workflow,
        2) FRA completion cadence,
        3) next-visit planning / second-audit pipeline.
      - If a metric is healthy, say so briefly.

      Return HTML only (no markdown fences) using this exact structure:
      1. <h3>Executive Summary</h3>
         - One short paragraph summarizing overall risk and operational posture.
      2. <h3>Cross-System Concerns</h3>
         - Bullet list of the key concerns across incidents, store actions, FRA, and compliance progression.
      3. <h3>Priority Store Focus</h3>
         - Bullet list naming specific stores from the snapshot and why they need attention.
      4. <h3>Recommended Actions</h3>
         - 4 concrete, practical actions for KSS NW consultants and central ops to execute in the next 30 days.

      Keep the tone professional, direct, and evidence-led.
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
            content: 'You are a senior compliance intelligence analyst. Respond with raw HTML only using <h3>, <p>, <ul>, and <li>.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
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
