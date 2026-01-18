import { NextResponse } from 'next/server'
import { seedFootAsylumSafetyCultureTemplate } from '@/app/actions/safehub'

export async function POST() {
  try {
    const result = await seedFootAsylumSafetyCultureTemplate()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to seed template' },
      { status: 500 }
    )
  }
}
