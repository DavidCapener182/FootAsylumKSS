import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { FRARow } from '@/components/fra/fra-table'
import { FRATrackerClient } from '@/components/fra/fra-tracker-client'

async function getStoreFRAs() {
  const supabase = createClient()
  
  // Use same base query as audit tracker to ensure we get all stores
  // Don't select fire_risk_assessment_pct here - fetch it separately if it exists
  const { data, error } = await supabase
    .from('fa_stores')
    .select('id, store_code, store_name, region, city, is_active, compliance_audit_1_date, compliance_audit_2_date')
    .order('region', { ascending: true })
    .order('store_name', { ascending: true })

  if (error) {
    console.error('Error fetching store FRAs:', error)
    return []
  }

  // Add FRA columns (will be null if columns don't exist yet - migration not run)
  const storesWithFRA = (data || []).map(store => ({
    ...store,
    fire_risk_assessment_date: null as string | null,
    fire_risk_assessment_pdf_path: null as string | null,
    fire_risk_assessment_notes: null as string | null,
    fire_risk_assessment_pct: null as number | null,
  }))

  // Try to fetch FRA data if columns exist
  if (storesWithFRA.length > 0) {
    try {
      const storeIds = storesWithFRA.map(s => s.id)
      // Try to fetch with percentage first, fallback to without if column doesn't exist
      let { data: fraData, error: fraError } = await supabase
        .from('fa_stores')
        .select('id, fire_risk_assessment_date, fire_risk_assessment_pdf_path, fire_risk_assessment_notes, fire_risk_assessment_pct')
        .in('id', storeIds)
      
      // If error is about missing column, try without percentage
      if (fraError && fraError.message?.includes('fire_risk_assessment_pct')) {
        const { data: fraDataWithoutPct, error: fraError2 } = await supabase
          .from('fa_stores')
          .select('id, fire_risk_assessment_date, fire_risk_assessment_pdf_path, fire_risk_assessment_notes')
          .in('id', storeIds)
        
        if (!fraError2 && fraDataWithoutPct) {
          // Add missing percentage field for type safety and downstream usage
          fraData = fraDataWithoutPct.map(f => ({
            ...f,
            fire_risk_assessment_pct: null,
          }))
          fraError = null
        }
      }
      
      if (fraData && !fraError) {
        const fraMap = new Map(fraData.map(f => [f.id, f]))
        storesWithFRA.forEach(store => {
          const fra = fraMap.get(store.id)
          if (fra) {
            store.fire_risk_assessment_date = fra.fire_risk_assessment_date
            store.fire_risk_assessment_pdf_path = fra.fire_risk_assessment_pdf_path
            store.fire_risk_assessment_notes = fra.fire_risk_assessment_notes
            // Only set percentage if it exists in the data
            if ('fire_risk_assessment_pct' in fra) {
              store.fire_risk_assessment_pct = (fra as any).fire_risk_assessment_pct || null
            }
          }
        })
      }
    } catch (e) {
      // FRA columns don't exist yet - that's okay, they'll all be null
      console.log('FRA columns not available yet (migration may not be run):', e)
    }
  }

  return storesWithFRA || []
}

export default async function FireRiskAssessmentPage() {
  const { profile } = await requireRole(['admin', 'ops', 'readonly'])
  const stores = await getStoreFRAs()

  return <FRATrackerClient stores={stores as FRARow[]} userRole={profile.role} />
}
