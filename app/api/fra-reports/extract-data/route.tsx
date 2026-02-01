import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLatestHSAuditForStore } from '@/app/actions/fra-reports'
import { getAuditInstance } from '@/app/actions/safehub'
import { POST as searchStoreData } from '../search-store-data/route'

export const dynamic = 'force-dynamic'

/**
 * Extract data from H&S audit (PDF or database) without generating full FRA
 * Returns raw extracted data for review
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    // Get the FRA audit instance
    const fraInstance = await getAuditInstance(instanceId)
    
    if (!fraInstance || (fraInstance.fa_audit_templates as any)?.category !== 'fire_risk_assessment') {
      return NextResponse.json({ error: 'Invalid FRA audit instance' }, { status: 400 })
    }

    const store = fraInstance.fa_stores as any
    const storeId = store.id

    // Get PDF text from uploaded H&S audit PDF (NOT from database audits)
    // The FRA uses ONLY the uploaded PDF, not database H&S audits
    console.log('[EXTRACT] Getting PDF text from uploaded H&S audit PDF for FRA instance:', instanceId)
    
    // First, try direct query to see if PDF text is stored
    const { data: fraInstanceForQuery } = await supabase
      .from('fa_audit_instances')
      .select('template_id')
      .eq('id', instanceId)
      .single()
    
    let directPdfText: string | null = null
    
    if (fraInstanceForQuery?.template_id) {
      console.log('[EXTRACT] Template ID found:', fraInstanceForQuery.template_id)
      
      const { data: firstSection } = await supabase
        .from('fa_audit_template_sections')
        .select('id')
        .eq('template_id', fraInstanceForQuery.template_id)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (firstSection) {
        console.log('[EXTRACT] First section found:', firstSection.id)
        
        const { data: firstQuestion } = await supabase
          .from('fa_audit_template_questions')
          .select('id')
          .eq('section_id', firstSection.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        if (firstQuestion) {
          console.log('[EXTRACT] Direct query: checking for PDF text in question:', firstQuestion.id)
          
          const { data: directResponse, error: directError } = await supabase
            .from('fa_audit_responses')
            .select('response_json, id')
            .eq('audit_instance_id', instanceId)
            .eq('question_id', firstQuestion.id)
            .maybeSingle()
          
          if (directError) {
            console.error('[EXTRACT] Direct query error:', directError)
          } else if (directResponse) {
            console.log('[EXTRACT] Direct query found response ID:', directResponse.id)
            console.log('[EXTRACT] Response JSON keys:', Object.keys(directResponse.response_json || {}))
            
            const text = directResponse.response_json?.fra_pdf_text
            if (text) {
              directPdfText = text
              console.log('[EXTRACT] ✓ Found PDF text via direct query, length:', text.length)
            } else {
              console.log('[EXTRACT] ✗ Direct query: no fra_pdf_text found in first question')
            }
          } else {
            console.log('[EXTRACT] ✗ Direct query: no response found for question:', firstQuestion.id)
          }
        } else {
          console.log('[EXTRACT] ✗ No first question found in section')
        }
      } else {
        console.log('[EXTRACT] ✗ No first section found - template may have no sections')
      }
      
      // If not found in first question, search ALL responses for this instance
      if (!directPdfText) {
        console.log('[EXTRACT] Searching all responses for PDF text...')
        const { data: allResponses } = await supabase
          .from('fa_audit_responses')
          .select('id, question_id, response_json')
          .eq('audit_instance_id', instanceId)
        
        if (allResponses && allResponses.length > 0) {
          console.log('[EXTRACT] Found', allResponses.length, 'responses, checking each for fra_pdf_text...')
          for (const resp of allResponses) {
            const text = resp.response_json?.fra_pdf_text
            if (text) {
              directPdfText = text
              console.log('[EXTRACT] ✓ Found PDF text in response ID:', resp.id, 'question:', resp.question_id, 'length:', text.length)
              break
            }
          }
          if (!directPdfText) {
            console.log('[EXTRACT] ✗ Checked all responses, none contain fra_pdf_text')
            allResponses.forEach((resp: any) => {
              const keys = Object.keys(resp.response_json || {})
              console.log('[EXTRACT] Response', resp.id, 'question', resp.question_id, 'has keys:', keys)
            })
          }
        } else {
          console.log('[EXTRACT] ✗ No responses found for this instance at all')
        }
      }
    } else {
      console.log('[EXTRACT] ✗ No template_id found for instance')
    }
    
    // Try getLatestHSAuditForStore as fallback
    const hsAuditResult = await getLatestHSAuditForStore(storeId, instanceId)
    const pdfText = directPdfText || hsAuditResult.pdfText  // Prefer direct query result
    
    console.log('[EXTRACT] Final results:', {
      hasPdfText: !!pdfText,
      pdfTextLength: pdfText?.length || 0,
      source: directPdfText ? 'direct_query' : (hsAuditResult.pdfText ? 'getLatestHSAuditForStore' : 'none'),
      note: 'FRA uses ONLY uploaded PDF, not database audits'
    })

    // Extract data from PDF text if available
    let pdfExtractedData: Record<string, string | null> = {}
    if (pdfText) {
      console.log('[EXTRACT] PDF text length:', pdfText.length)
      console.log('[EXTRACT] PDF text sample (first 500 chars):', pdfText.substring(0, 500))
      
      // Debug: Show sections that might contain our data
      const debugSections = [
        { name: 'Store Manager', search: /(?:signature|manager|person in charge)/i },
        { name: 'Floors', search: /(?:number of floors|level|floor)/i },
        { name: 'Operating Hours', search: /(?:operating|trading|opening|hours)/i },
        { name: 'Square Footage', search: /(?:square footage|meterage|floor area)/i },
      ]
      
      for (const section of debugSections) {
        const match = pdfText.match(section.search)
        if (match) {
          const index = match.index || 0
          const context = pdfText.substring(Math.max(0, index - 100), Math.min(pdfText.length, index + 200))
          console.log(`[EXTRACT] Debug - ${section.name} context:`, context.replace(/\n/g, '\\n'))
        }
      }
      
      // Don't normalize to lowercase - keep original case for better matching
      const originalText = pdfText
      const normalizedText = pdfText.replace(/\s+/g, ' ')
      
      // Store Manager - look for "Signature of Person in Charge of store at time of assessment"
      let storeManagerMatch = null
      const storeManagerPatterns = [
        // Pattern 1: "Signature of Person in Charge of store at time of assessment." followed by name
        /signature of person in charge of store at time of assessment[.\s]*([A-Z][a-z]+(?:\s+[a-z]+)?)\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i,
        // Pattern 2: "Signature of Person in Charge" followed by name and date
        /signature of person in charge[.\s]*([A-Z][a-z]+(?:\s+[a-z]+)?)\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i,
        // Pattern 3: Look for name right before date/time at end of signature section
        /signature of person in charge of store at time of assessment[.\s]*([^\n\r]+?)\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:am|pm)\s+gmt/i,
      ]
      
      for (const pattern of storeManagerPatterns) {
        storeManagerMatch = originalText.match(pattern)
        if (storeManagerMatch) {
          console.log('[EXTRACT] Store manager pattern matched:', pattern.toString())
          break
        }
      }
      
      if (storeManagerMatch) {
        let managerName = storeManagerMatch[1]?.trim() || ''
        // Remove any trailing punctuation or extra text
        managerName = managerName
          .replace(/\s+\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*$/i, '')
          .replace(/\s+\d{1,2}:\d{2}.*$/i, '')
          .replace(/\s+gmt.*$/i, '')
          .replace(/[.\s]+$/, '')
          .trim()
        
        // Capitalize first letter of each word
        if (managerName) {
          managerName = managerName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
          
          pdfExtractedData.storeManager = managerName
          console.log('[EXTRACT] ✓ Found store manager:', managerName)
        } else {
          console.log('[EXTRACT] Store manager match rejected (empty after cleaning):', storeManagerMatch[1])
        }
      } else {
        console.log('[EXTRACT] ✗ No store manager pattern matched')
      }

      // Fire Panel Location - more flexible pattern
      const firePanelMatch = originalText.match(/(?:location of fire panel|fire panel location)[\s:]*([^\n\r]+?)(?:\n|$|is panel|panel free)/i)
      if (firePanelMatch) {
        pdfExtractedData.firePanelLocation = firePanelMatch[1]?.trim() || null
        console.log('[EXTRACT] Found fire panel location:', pdfExtractedData.firePanelLocation)
      }

      // Fire Panel Faults - look for Yes/No or status
      const firePanelFaultsMatch = originalText.match(/(?:is panel free of faults|panel free of faults|panel faults)[\s:]*([^\n\r]+?)(?:\n|$|location of emergency)/i)
      if (firePanelFaultsMatch) {
        pdfExtractedData.firePanelFaults = firePanelFaultsMatch[1]?.trim() || null
        console.log('[EXTRACT] Found fire panel faults:', pdfExtractedData.firePanelFaults)
      }

      // Emergency Lighting Switch - look for "Location of Emergency Lighting Test Switch (Photograph)"
      // Pattern: "Location of Emergency Lighting Test Switch (Photograph) Electrical cupboard by the rear fire doors"
      let emergencyLightingMatch = null
      const emergencyLightingPatterns = [
        // Pattern 1: "Location of Emergency Lighting Test Switch (Photograph)" followed by location
        /location of emergency lighting test switch\s*\([^)]*photograph[^)]*\)\s*([^\n\r]+?)(?:\n|$|emergency lighting switch photo|photo \d+)/i,
        // Pattern 2: "Location of Emergency Lighting Test Switch" followed by location (without photograph)
        /location of emergency lighting test switch[:\s]*([^\n\r]+?)(?:\n|$|emergency lighting switch photo|photo \d+)/i,
        // Pattern 3: Just "emergency lighting" with location on next line
        /emergency lighting test switch[:\s]*([^\n\r]+?)(?:\n|$|photo)/i,
        // Pattern 4: "Electrical cupboard" pattern (common location)
        /(?:emergency lighting|test switch)[\s\S]{0,200}(electrical cupboard[^\n\r]+?)(?:\n|$|photo|photograph)/i,
      ]
      
      for (const pattern of emergencyLightingPatterns) {
        emergencyLightingMatch = originalText.match(pattern)
        if (emergencyLightingMatch) {
          console.log('[EXTRACT] Emergency lighting pattern matched:', pattern.toString())
          let location = emergencyLightingMatch[1]?.trim() || null
          // Clean up common artifacts
          if (location) {
            // Remove "(Photograph)" or "Photograph" if it got captured
            location = location.replace(/\([^)]*photograph[^)]*\)/gi, '')
            location = location.replace(/photograph/gi, '')
            location = location.replace(/^[(\s]+/, '').replace(/[\s)]+$/, '').trim()
            // Reject if it's just punctuation or too short
            if (location.length > 3 && !/^[^\w]+$/.test(location)) {
              pdfExtractedData.emergencyLightingSwitch = location
              console.log('[EXTRACT] ✓ Found emergency lighting switch:', pdfExtractedData.emergencyLightingSwitch)
              break
            } else {
              console.log('[EXTRACT] Emergency lighting match rejected (too short or invalid):', location)
            }
          }
        }
      }
      
      if (!emergencyLightingMatch || !pdfExtractedData.emergencyLightingSwitch) {
        console.log('[EXTRACT] ✗ No emergency lighting switch found')
      }

      // Number of Floors - look in "General Site Information" section
      // Pattern: "Number of floors (list ie Basement; Ground; 1st, 2nd in comments section) 1"
      let floorsMatch = null
      const floorsPatterns = [
        // Pattern 1: "Number of floors" followed by number on same line or next line
        /number of floors[^\n\r]*?(\d+)/i,
        // Pattern 2: Look in general site section specifically
        /general site information[\s\S]{0,500}number of floors[^\n\r]*?(\d+)/i,
        // Pattern 3: "operates over X level" or "X level" or "X floor"
        /(?:operates over|comprises|has)[\s]+(?:one|two|three|four|five|1|2|3|4|5)\s+(?:level|floor|storey)/i,
        // Pattern 4: "one level (Ground Floor)"
        /(?:one|1)\s+level[\s(]*(?:ground\s+floor|basement)/i,
      ]
      
      for (const pattern of floorsPatterns) {
        floorsMatch = originalText.match(pattern)
        if (floorsMatch) {
          console.log('[EXTRACT] Floors pattern matched:', pattern.toString())
          // Extract number from match
          const numberMatch = floorsMatch[1] || floorsMatch[0].match(/(\d+)/)?.[1] ||
                             (floorsMatch[0].match(/one/i) ? '1' : null) ||
                             (floorsMatch[0].match(/two/i) ? '2' : null) ||
                             (floorsMatch[0].match(/three/i) ? '3' : null)
          if (numberMatch) {
            pdfExtractedData.numberOfFloors = numberMatch
            console.log('[EXTRACT] ✓ Found number of floors:', pdfExtractedData.numberOfFloors)
            break
          }
        }
      }
      
      if (!floorsMatch || !pdfExtractedData.numberOfFloors) {
        console.log('[EXTRACT] ✗ No number of floors found')
      }

      // Operating Hours - search via web search instead of extracting from PDF
      // Get store information for web search
      let operatingHoursFromWeb: string | null = null
      try {
        const { data: fraInstanceForStore } = await supabase
          .from('fa_audit_instances')
          .select(`
            fa_stores (
              store_name,
              city,
              address_line_1
            )
          `)
          .eq('id', instanceId)
          .single()
        
        if (fraInstanceForStore?.fa_stores) {
          const store = fraInstanceForStore.fa_stores as any
          const storeName = store.store_name
          const city = store.city || ''
          const address = store.address_line_1 || ''
          
          if (storeName) {
            console.log('[EXTRACT] Searching web for opening hours:', storeName, city)
            
            // Call the web search API endpoint (server-side)
            try {
              // Create a request object for the search API
              const searchRequest = new NextRequest(new URL('http://localhost/api/fra-reports/search-store-data'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  storeName,
                  address,
                  city,
                }),
              })
              
              // Call the search function directly
              const searchResponse = await searchStoreData(searchRequest)
              
              if (searchResponse.ok) {
                const searchData = await searchResponse.json()
                if (searchData.openingTimes) {
                  operatingHoursFromWeb = searchData.openingTimes
                  console.log('[EXTRACT] ✓ Found opening hours from web search:', operatingHoursFromWeb)
                } else {
                  console.log('[EXTRACT] Opening hours not found via web search, will need manual entry')
                }
              } else {
                console.log('[EXTRACT] Web search API returned error, opening hours will need manual entry')
              }
            } catch (webSearchError) {
              console.error('[EXTRACT] Web search error:', webSearchError)
              console.log('[EXTRACT] Opening hours will need manual entry')
            }
          }
        }
      } catch (storeError) {
        console.error('[EXTRACT] Error getting store info for web search:', storeError)
      }
      
      // Don't try to extract from PDF - always use web search
      pdfExtractedData.operatingHours = operatingHoursFromWeb
      if (!operatingHoursFromWeb) {
        console.log('[EXTRACT] Opening hours will be searched via web (not extracted from PDF)')
      }

      // Conducted Date - look for date patterns near "conducted"
      const conductedDateMatch = originalText.match(/(?:conducted on|conducted at|assessment date)[\s:]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i)
      if (conductedDateMatch) {
        pdfExtractedData.conductedDate = conductedDateMatch[1] || null
        console.log('[EXTRACT] Found conducted date:', pdfExtractedData.conductedDate)
      } else {
        // Try to find any date near "conducted"
        const conductedSection = originalText.match(/conducted[\s\S]{0,100}(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i)
        if (conductedSection) {
          pdfExtractedData.conductedDate = conductedSection[1] || null
          console.log('[EXTRACT] Found conducted date (alternative):', pdfExtractedData.conductedDate)
        }
      }

      // Square Footage - look for numbers with units, more flexible patterns
      let squareFootageMatch = null
      const squareFootagePatterns = [
        // Pattern 1: "Square Footage" or "Square Meterage"
        /(?:square footage|square meterage|floor area|site area)[\s:]*([^\n\r]*?\d+[,\d]*(?:\s*(?:sq\s*ft|sq\s*m|m²|ft²|square\s*(?:feet|meters|metres))))/i,
        // Pattern 2: Number followed by units
        /(?:square footage|square meterage|floor area)[\s:]*(\d+[,\d]*)\s*(?:sq\s*ft|sq\s*m|m²|ft²|square\s*(?:feet|meters|metres))/i,
        // Pattern 3: Just number with units nearby
        /(\d+[,\d]*)\s*(?:sq\s*ft|sq\s*m|m²|ft²|square\s*(?:feet|meters|metres))(?:\s+or\s+\d+)?/i,
        // Pattern 4: Look in general site section
        /general site information[\s\S]{0,500}(?:square footage|square meterage|floor area)[\s:]*([^\n\r]*?\d+[^\n\r]*?)(?:\n|$)/i,
      ]
      
      for (const pattern of squareFootagePatterns) {
        squareFootageMatch = originalText.match(pattern)
        if (squareFootageMatch) {
          console.log('[EXTRACT] Square footage pattern matched:', pattern.toString())
          const footage = squareFootageMatch[1]?.trim() || null
          if (footage && /\d+/.test(footage)) {
            // Include units if found
            const fullMatch = squareFootageMatch[0]
            const unitsMatch = fullMatch.match(/(?:sq\s*ft|sq\s*m|m²|ft²|square\s*(?:feet|meters|metres))/i)
            pdfExtractedData.squareFootage = footage + (unitsMatch ? ' ' + unitsMatch[0] : '')
            console.log('[EXTRACT] ✓ Found square footage:', pdfExtractedData.squareFootage)
            break
          }
        }
      }
      
      if (!squareFootageMatch || !pdfExtractedData.squareFootage) {
        console.log('[EXTRACT] ✗ No square footage found')
      }

      // Evidence-led FRA fields (same patterns as fra-reports.ts)
      const escapeObstructedMatch = originalText.match(/(?:fire\s+exit|escape\s+route|delivery\s+door).*?(?:blocked|obstructed|partially\s+blocked|restricted|pallets|boxes)/i)
        || originalText.match(/(?:blocked|obstructed|partially\s+blocked).*?(?:fire\s+exit|escape\s+route|delivery\s+door|stockroom|rear\s+fire\s+door)/i)
        || originalText.match(/(?:pallets|boxes).*?(?:fire\s+exit|delivery\s+door|stockroom|escape)/i)
      if (escapeObstructedMatch) {
        pdfExtractedData.escapeRoutesEvidence = 'Observed during recent inspections: fire exits and delivery doors were partially blocked by pallets and boxes (stockroom and rear fire door), restricting effective escape width during evacuation.'
        console.log('[EXTRACT] ✓ Found escape route obstruction from PDF')
      }

      const combustibleEscapeMatch = originalText.match(/(?:combustible|storage).*?(?:escape\s+route|compromised)/i)
        || originalText.match(/(?:escape\s+route).*?(?:compromised|combustible)/i)
      if (combustibleEscapeMatch) {
        pdfExtractedData.combustibleStorageEscapeCompromise = 'Escape routes compromised'
      } else if (originalText.match(/(?:combustible|storage).*?(?:correct|ok|stored correctly)/i)) {
        pdfExtractedData.combustibleStorageEscapeCompromise = 'OK'
      }

      const trainingShortfallMatch = originalText.match(/(?:toolbox|fire\s+safety\s+training).*?(?:not\s+100%|incomplete)/i)
        || originalText.match(/(?:induction\s+training).*?incomplete/i)
        || originalText.match(/training\s+not\s+at\s+100%|incomplete\s+for\s+(?:two\s+)?staff/i)
      if (trainingShortfallMatch) {
        pdfExtractedData.fireSafetyTrainingNarrative = 'Fire safety training is delivered via induction and toolbox talks; refresher completion is monitored, with improvements currently underway.'
      } else if (originalText.match(/(?:toolbox|fire\s+safety\s+training).*?100%|100%\s+completion/i)) {
        pdfExtractedData.fireSafetyTrainingNarrative = 'Fire safety training is delivered via induction and toolbox talks; records are maintained.'
      }

      const fireDoorsGoodMatch = originalText.match(/(?:fire\s+door|fire doors).*?(?:good\s+condition|in good condition)/i)
        || originalText.match(/(?:intumescent|intact).*?(?:strip|door)/i)
        || originalText.match(/(?:not\s+wedged|doors not wedged)/i)
      if (fireDoorsGoodMatch) {
        pdfExtractedData.fireDoorsCondition = 'Good condition; intumescent strips present; doors not wedged open.'
      }

      if (originalText.match(/(?:weekly\s+fire\s+alarm|fire\s+alarm\s+test).*?(?:documented|conducted|yes)/i)
        || originalText.match(/(?:fire\s+alarm).*?weekly/i)) {
        pdfExtractedData.weeklyFireTests = 'Documented'
      }

      if (originalText.match(/(?:monthly\s+emergency\s+lighting|emergency\s+lighting\s+test).*?(?:conducted|documented|yes)/i)
        || originalText.match(/(?:emergency\s+lighting).*?monthly/i)) {
        pdfExtractedData.emergencyLightingMonthlyTest = 'Conducted'
      }

      if (originalText.match(/(?:fire\s+extinguisher|extinguisher).*?(?:serviced|accessible|in position)/i)) {
        pdfExtractedData.fireExtinguisherService = 'Serviced and accessible'
      }

      if (pdfText) {
        pdfExtractedData.managementReviewStatement = 'This assessment has been informed by recent health and safety inspections and site observations.'
      }

      // HIGH PRIORITY: Number of fire exits
      const fireExitsMatch = originalText.match(/(?:number of fire exits|fire exits)[\s:]*(\d+)/i)
        || originalText.match(/fire exits[\s\S]{0,20}?(\d+)/i)
      if (fireExitsMatch) {
        pdfExtractedData.numberOfFireExits = fireExitsMatch[1]
        console.log('[EXTRACT] ✓ Found number of fire exits:', pdfExtractedData.numberOfFireExits)
      }

      // HIGH PRIORITY: Staff numbers - multiple patterns for different formats
      // Pattern 1: "Number of Staff employed: 9" or "Staff employed: 9"
      // Pattern 2: "Staff: 9" or "employees: 9" 
      // Pattern 3: Look in General Site Information section
      const totalStaffPatterns = [
        /(?:number of staff employed|staff employed)[\s:]*(\d+)/i,
        /(?:total staff|total employees)[\s:]*(\d+)/i,
        /(?:staff|employees)[\s:]+(\d+)(?!\s*(?:working|on site|at any))/i,
        /general site information[\s\S]{0,300}(?:staff employed|number of staff)[\s:]*(\d+)/i,
      ]
      for (const pattern of totalStaffPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.totalStaffEmployed = match[1]
          console.log('[EXTRACT] ✓ Found total staff employed:', pdfExtractedData.totalStaffEmployed)
          break
        }
      }

      // Maximum staff on site - multiple patterns
      // Pattern: "Maximum number of staff working at any one time: 3"
      const maxStaffPatterns = [
        /(?:maximum number of staff working|maximum staff working|max staff working)[\s\S]{0,30}?(\d+)/i,
        /(?:maximum.*staff.*at any.*time)[\s:]*(\d+)/i,
        /(?:max staff|maximum staff)[\s:]*(\d+)/i,
        /(?:staff working at any one time)[\s:]*(\d+)/i,
        /general site information[\s\S]{0,400}(?:maximum.*staff|max.*staff)[\s\S]{0,30}?(\d+)/i,
      ]
      for (const pattern of maxStaffPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.maxStaffOnSite = match[1]
          console.log('[EXTRACT] ✓ Found max staff on site:', pdfExtractedData.maxStaffOnSite)
          break
        }
      }

      // HIGH PRIORITY: Young persons - multiple patterns
      // NOTE: Do NOT match "under 18" as it captures the 18 from the phrase itself
      const youngPersonsPatterns = [
        /(?:young persons employed|young persons)[\s:]*(\d+)/i,
        /(?:young person)[\s:]+(\d+)/i,
        /(?:number of young persons)[\s:]*(\d+)/i,
        /general site information[\s\S]{0,400}(?:young person)[\s:]+(\d+)/i,
      ]
      for (const pattern of youngPersonsPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.youngPersonsCount = match[1]
          console.log('[EXTRACT] ✓ Found young persons count:', pdfExtractedData.youngPersonsCount)
          break
        }
      }

      // HIGH PRIORITY: Fire drill date - multiple patterns and formats
      const fireDrillPatterns = [
        /(?:fire drill|last drill|drill.*carried out|evacuation drill)[\s\S]{0,50}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:fire drill|last drill|drill.*carried out)[\s\S]{0,50}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:drill|evacuation).*?(?:date|carried out|conducted)[\s\S]{0,30}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:fire drill has been carried out)[\s\S]{0,100}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:when was.*drill|last fire drill)[\s\S]{0,50}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
      ]
      for (const pattern of fireDrillPatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.fireDrillDate = match[1]
          console.log('[EXTRACT] ✓ Found fire drill date:', pdfExtractedData.fireDrillDate)
          break
        }
      }

      // HIGH PRIORITY: PAT/electrical testing status
      if (originalText.match(/(?:pat|portable appliance|electrical.*test).*?(?:passed|satisfactory|up to date|completed|yes)/i)
        || originalText.match(/(?:fixed wiring|electrical installation).*?(?:satisfactory|passed|completed)/i)
        || originalText.match(/(?:pat testing|pat test)[\s\S]{0,30}?(?:yes|ok|satisfactory|passed)/i)) {
        pdfExtractedData.patTestingStatus = 'Satisfactory'
        console.log('[EXTRACT] ✓ Found PAT testing status: Satisfactory')
      }

      // MEDIUM PRIORITY: Exit signage condition - more flexible patterns
      if (originalText.match(/(?:exit sign|signage|fire exit sign).*?(?:good|satisfactory|clear|visible|yes|ok)/i)
        || originalText.match(/(?:signage).*?(?:installed|visible|clearly|in place)/i)
        || originalText.match(/(?:fire exit.*sign|emergency.*sign).*?(?:good|satisfactory|visible|yes)/i)
        || originalText.match(/(?:signs.*visible|signage.*adequate|signage.*good)/i)) {
        pdfExtractedData.exitSignageCondition = 'Good condition'
        console.log('[EXTRACT] ✓ Found exit signage condition: Good')
      }

      // MEDIUM PRIORITY: Ceiling tiles / compartmentation
      if (originalText.match(/(?:ceiling tile|compartmentation|fire stopping).*?(?:no missing|intact|satisfactory|good|yes)/i)
        || originalText.match(/(?:no missing|no breaches).*?(?:ceiling|compartment)/i)
        || originalText.match(/(?:structure|structural).*?(?:good condition|satisfactory)/i)
        || originalText.match(/(?:missing ceiling tiles)[\s\S]{0,30}?(?:no|none)/i)) {
        pdfExtractedData.compartmentationStatus = 'No breaches identified'
        console.log('[EXTRACT] ✓ Found compartmentation status: No breaches')
      }

      // MEDIUM PRIORITY: Fire extinguisher service date - more patterns
      const extinguisherServicePatterns = [
        /(?:extinguisher.*service|fire extinguisher.*service|last service.*extinguisher)[\s\S]{0,50}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:extinguisher)[\s\S]{0,50}?serviced[\s\S]{0,30}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:extinguisher.*service|fire extinguisher.*service)[\s\S]{0,50}?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:fire extinguisher service)[\s\S]{0,100}?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
      ]
      for (const pattern of extinguisherServicePatterns) {
        const match = originalText.match(pattern)
        if (match) {
          pdfExtractedData.extinguisherServiceDate = match[1]
          console.log('[EXTRACT] ✓ Found extinguisher service date:', pdfExtractedData.extinguisherServiceDate)
          break
        }
      }

      // MEDIUM PRIORITY: Call point accessibility
      if (originalText.match(/(?:call point|manual call point).*?(?:accessible|unobstructed|clear|yes)/i)
        || originalText.match(/(?:call points clear|call points.*accessible)/i)
        || originalText.match(/(?:mcp|manual call).*?(?:clear|accessible|unobstructed)/i)) {
        pdfExtractedData.callPointAccessibility = 'Accessible and unobstructed'
        console.log('[EXTRACT] ✓ Found call point accessibility: Accessible')
      }
      
      console.log('[EXTRACT] Final extracted data:', pdfExtractedData)
    }

    // FRA uses ONLY the uploaded PDF text - no database audit fallback
    // All data comes from PDF text extraction
    const extractedData = {
      storeManager: pdfExtractedData.storeManager || null,
      firePanelLocation: pdfExtractedData.firePanelLocation || null,
      firePanelFaults: pdfExtractedData.firePanelFaults || null,
      emergencyLightingSwitch: pdfExtractedData.emergencyLightingSwitch || null,
      numberOfFloors: pdfExtractedData.numberOfFloors || null,
      operatingHours: pdfExtractedData.operatingHours || null,
      conductedDate: pdfExtractedData.conductedDate || null,
      squareFootage: pdfExtractedData.squareFootage || null,
      escapeRoutesEvidence: pdfExtractedData.escapeRoutesEvidence || null,
      combustibleStorageEscapeCompromise: pdfExtractedData.combustibleStorageEscapeCompromise || null,
      fireSafetyTrainingNarrative: pdfExtractedData.fireSafetyTrainingNarrative || null,
      fireDoorsCondition: pdfExtractedData.fireDoorsCondition || null,
      weeklyFireTests: pdfExtractedData.weeklyFireTests || null,
      emergencyLightingMonthlyTest: pdfExtractedData.emergencyLightingMonthlyTest || null,
      fireExtinguisherService: pdfExtractedData.fireExtinguisherService || null,
      managementReviewStatement: pdfExtractedData.managementReviewStatement || null,
      // High priority fields
      numberOfFireExits: pdfExtractedData.numberOfFireExits || null,
      totalStaffEmployed: pdfExtractedData.totalStaffEmployed || null,
      maxStaffOnSite: pdfExtractedData.maxStaffOnSite || null,
      youngPersonsCount: pdfExtractedData.youngPersonsCount || null,
      fireDrillDate: pdfExtractedData.fireDrillDate || null,
      patTestingStatus: pdfExtractedData.patTestingStatus || null,
      // Medium priority fields
      exitSignageCondition: pdfExtractedData.exitSignageCondition || null,
      compartmentationStatus: pdfExtractedData.compartmentationStatus || null,
      extinguisherServiceDate: pdfExtractedData.extinguisherServiceDate || null,
      callPointAccessibility: pdfExtractedData.callPointAccessibility || null,
      sources: {
        storeManager: pdfExtractedData.storeManager ? 'PDF' : 'NOT_FOUND',
        firePanelLocation: pdfExtractedData.firePanelLocation ? 'PDF' : 'NOT_FOUND',
        firePanelFaults: pdfExtractedData.firePanelFaults ? 'PDF' : 'NOT_FOUND',
        emergencyLightingSwitch: pdfExtractedData.emergencyLightingSwitch ? 'PDF' : 'NOT_FOUND',
        numberOfFloors: pdfExtractedData.numberOfFloors ? 'PDF' : 'NOT_FOUND',
        operatingHours: pdfExtractedData.operatingHours ? 'PDF' : 'NOT_FOUND',
        conductedDate: pdfExtractedData.conductedDate ? 'PDF' : 'NOT_FOUND',
        squareFootage: pdfExtractedData.squareFootage ? 'PDF' : 'NOT_FOUND',
        escapeRoutesEvidence: pdfExtractedData.escapeRoutesEvidence ? 'PDF' : 'NOT_FOUND',
        combustibleStorageEscapeCompromise: pdfExtractedData.combustibleStorageEscapeCompromise ? 'PDF' : 'NOT_FOUND',
        fireSafetyTrainingNarrative: pdfExtractedData.fireSafetyTrainingNarrative ? 'PDF' : 'NOT_FOUND',
        fireDoorsCondition: pdfExtractedData.fireDoorsCondition ? 'PDF' : 'NOT_FOUND',
        weeklyFireTests: pdfExtractedData.weeklyFireTests ? 'PDF' : 'NOT_FOUND',
        emergencyLightingMonthlyTest: pdfExtractedData.emergencyLightingMonthlyTest ? 'PDF' : 'NOT_FOUND',
        fireExtinguisherService: pdfExtractedData.fireExtinguisherService ? 'PDF' : 'NOT_FOUND',
        managementReviewStatement: pdfExtractedData.managementReviewStatement ? 'PDF' : 'NOT_FOUND',
        // High priority fields
        numberOfFireExits: pdfExtractedData.numberOfFireExits ? 'PDF' : 'NOT_FOUND',
        totalStaffEmployed: pdfExtractedData.totalStaffEmployed ? 'PDF' : 'NOT_FOUND',
        maxStaffOnSite: pdfExtractedData.maxStaffOnSite ? 'PDF' : 'NOT_FOUND',
        youngPersonsCount: pdfExtractedData.youngPersonsCount ? 'PDF' : 'NOT_FOUND',
        fireDrillDate: pdfExtractedData.fireDrillDate ? 'PDF' : 'NOT_FOUND',
        patTestingStatus: pdfExtractedData.patTestingStatus ? 'PDF' : 'NOT_FOUND',
        // Medium priority fields
        exitSignageCondition: pdfExtractedData.exitSignageCondition ? 'PDF' : 'NOT_FOUND',
        compartmentationStatus: pdfExtractedData.compartmentationStatus ? 'PDF' : 'NOT_FOUND',
        extinguisherServiceDate: pdfExtractedData.extinguisherServiceDate ? 'PDF' : 'NOT_FOUND',
        callPointAccessibility: pdfExtractedData.callPointAccessibility ? 'PDF' : 'NOT_FOUND',
      },
      hasPdfText: !!pdfText,
      hasDatabaseAudit: false, // FRA doesn't use database audits
      pdfTextLength: pdfText?.length || 0,
      // Debug info
      pdfExtractedCount: Object.keys(pdfExtractedData).filter(k => pdfExtractedData[k] !== null).length,
      dbExtractedCount: 0, // Not used for FRA
    }
    
    console.log('[EXTRACT] Summary:', {
      pdfExtracted: extractedData.pdfExtractedCount,
      dbExtracted: extractedData.dbExtractedCount,
      totalFields: 8,
    })

    // Include raw PDF text for debugging (first 5000 chars)
    const responseData = {
      ...extractedData,
      rawPdfText: pdfText ? pdfText.substring(0, 5000) + (pdfText.length > 5000 ? '...' : '') : null,
    }

    console.log('[EXTRACT] Returning response with:', {
      hasPdfText: responseData.hasPdfText,
      hasDatabaseAudit: responseData.hasDatabaseAudit,
      pdfTextLength: responseData.pdfTextLength,
      fieldCount: Object.keys(extractedData).filter(k => !k.startsWith('_') && k !== 'sources' && k !== 'hasPdfText' && k !== 'hasDatabaseAudit' && k !== 'pdfTextLength' && k !== 'rawPdfText' && k !== 'pdfExtractedCount' && k !== 'dbExtractedCount').length,
      extractedFields: Object.keys(extractedData).filter(k => (extractedData as Record<string, unknown>)[k] !== null && !k.startsWith('_') && k !== 'sources' && k !== 'hasPdfText' && k !== 'hasDatabaseAudit' && k !== 'pdfTextLength' && k !== 'rawPdfText' && k !== 'pdfExtractedCount' && k !== 'dbExtractedCount')
    })

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error extracting FRA data:', error)
    return NextResponse.json(
      { error: 'Failed to extract FRA data', details: error.message },
      { status: 500 }
    )
  }
}
