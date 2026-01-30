import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { storeAddress, auditInfo, mapUrl } = body

    if (!storeAddress) {
      return NextResponse.json({ error: 'Store address is required' }, { status: 400 })
    }

    // Use OpenAI API to generate description
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      // Fallback to generic description
      return NextResponse.json({
        description: `Entry to the site can be gained via the main front entrance doors and via the rear service entry/loading bay, which is clearly signposted externally. There is suitable access for Fire and Rescue Services from the surrounding road network. No issues were identified at the time of assessment.`
      })
    }

    const prompt = `Based on the following information about a Footasylum retail store, write a brief professional description (2-3 sentences) of access for Fire and Rescue Services. The description should mention entry points, access routes, and any relevant observations.

Store Address: ${storeAddress}
${auditInfo ? `Audit Information: ${JSON.stringify(auditInfo)}` : ''}
${mapUrl ? `A map is available showing the store location.` : ''}

Write a professional, concise description suitable for a Fire Risk Assessment document.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a fire safety assessor writing professional fire risk assessment reports.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate description')
    }

    const data = await response.json()
    const description = data.choices[0]?.message?.content || 'Entry to the site can be gained via the main front entrance doors and via the rear service entry/loading bay, which is clearly signposted externally. There is suitable access for Fire and Rescue Services from the surrounding road network. No issues were identified at the time of assessment.'

    return NextResponse.json({ description })
  } catch (error: any) {
    console.error('Error generating access description:', error)
    // Return fallback description
    return NextResponse.json({
      description: `Entry to the site can be gained via the main front entrance doors and via the rear service entry/loading bay, which is clearly signposted externally. There is suitable access for Fire and Rescue Services from the surrounding road network. No issues were identified at the time of assessment.`
    })
  }
}
