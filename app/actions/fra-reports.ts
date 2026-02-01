'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuditInstance } from './safehub'

/**
 * Extract information from PDF text using pattern matching
 */
function extractFromPDFText(pdfText: string, patterns: { key: string; regex: RegExp; extract?: (match: RegExpMatchArray) => string }[]): Record<string, string | null> {
  const results: Record<string, string | null> = {}
  const normalizedText = pdfText.replace(/\s+/g, ' ').toLowerCase()
  
  for (const { key, regex, extract } of patterns) {
    const match = normalizedText.match(regex)
    if (match) {
      if (extract) {
        results[key] = extract(match)
      } else {
        results[key] = match[1]?.trim() || match[0]?.trim() || null
      }
    } else {
      results[key] = null
    }
  }
  
  return results
}

/**
 * Get the most recent H&S audit for a store to use as source data for FRA
 * Also checks for uploaded H&S audit PDFs
 */
export async function getLatestHSAuditForStore(storeId: string, fraInstanceId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // FRA uses ONLY uploaded PDF text - not database H&S audits
  // Get the parsed PDF text from the uploaded H&S audit PDF
  let pdfText: string | null = null
  if (fraInstanceId) {
    // Get the FRA instance to find its template_id
    const { data: fraInstance } = await supabase
      .from('fa_audit_instances')
      .select('template_id')
      .eq('id', fraInstanceId)
      .single()

    if (fraInstance?.template_id) {
      // Try to get parsed PDF text from the FRA instance's response_json
      // First, try normal first section/question
      const { data: sections } = await supabase
        .from('fa_audit_template_sections')
        .select('id, title')
        .eq('template_id', fraInstance.template_id)
        .order('order_index', { ascending: true })
      
      console.log('[FRA] Found sections for template:', sections?.length || 0)
      
      let pdfTextQuestionId: string | null = null
      
      // Try to find PDF text in any section/question
      if (sections && sections.length > 0) {
        for (const section of sections) {
          const { data: questions } = await supabase
            .from('fa_audit_template_questions')
            .select('id')
            .eq('section_id', section.id)
            .order('order_index', { ascending: true })
          
          if (questions && questions.length > 0) {
            // Check each question for PDF text
            for (const question of questions) {
              const { data: response } = await supabase
                .from('fa_audit_responses')
                .select('response_json')
                .eq('audit_instance_id', fraInstanceId)
                .eq('question_id', question.id)
                .maybeSingle()
              
              const fraPdfText = response?.response_json?.fra_pdf_text
              if (fraPdfText) {
                pdfText = fraPdfText
                console.log('[FRA] ✓ Found PDF text in question:', question.id, 'section:', section.title, 'length:', fraPdfText.length)
                break
              }
            }
            if (pdfText) break
          }
        }
      }
      
      // If not found, try the first section/question approach (for backward compatibility)
      if (!pdfText) {
        const firstSection = sections && sections.length > 0 ? sections[0] : null

        if (firstSection) {
          const { data: firstQuestion } = await supabase
            .from('fa_audit_template_questions')
            .select('id')
            .eq('section_id', firstSection.id)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (firstQuestion) {
          console.log('[FRA] Looking for PDF text in response for question:', firstQuestion.id, 'instance:', fraInstanceId)
          
          // First, check if ANY response exists for this instance/question
          const { data: allResponses, error: checkError } = await supabase
            .from('fa_audit_responses')
            .select('id, question_id, response_json')
            .eq('audit_instance_id', fraInstanceId)
          
          console.log('[FRA] All responses for instance:', allResponses?.length || 0, 'error:', checkError?.message)
          if (allResponses && allResponses.length > 0) {
            console.log('[FRA] Response question IDs:', allResponses.map((r: any) => r.question_id))
          }
          
          const { data: response, error: responseError } = await supabase
            .from('fa_audit_responses')
            .select('response_json')
            .eq('audit_instance_id', fraInstanceId)
            .eq('question_id', firstQuestion.id)
            .maybeSingle()

          if (responseError) {
            console.error('[FRA] Error retrieving PDF text:', responseError)
          } else if (response) {
            console.log('[FRA] Found response, checking for fra_pdf_text. Response keys:', Object.keys(response.response_json || {}))
            console.log('[FRA] Response JSON type:', typeof response.response_json)
            const fraPdfTextFromResponse = response?.response_json?.fra_pdf_text
            if (fraPdfTextFromResponse) {
              pdfText = fraPdfTextFromResponse
              console.log('[FRA] ✓ Retrieved parsed PDF text, length:', fraPdfTextFromResponse.length)
            } else {
              const responseJsonStr = JSON.stringify(response.response_json || {})
              console.log('[FRA] ✗ No fra_pdf_text in response_json. Response JSON (first 500 chars):', responseJsonStr.substring(0, 500))
              // Check if it's stored under a different key
              if (response.response_json) {
                const keys = Object.keys(response.response_json)
                console.log('[FRA] Available keys in response_json:', keys)
              }
            }
          } else {
            console.log('[FRA] ✗ No response found for question:', firstQuestion.id, 'instance:', fraInstanceId)
            // Try to find ANY response with fra_pdf_text - search all responses for this instance
            console.log('[FRA] Searching all responses for this instance to find fra_pdf_text...')
            const { data: allResponsesForInstance } = await supabase
              .from('fa_audit_responses')
              .select('question_id, response_json')
              .eq('audit_instance_id', fraInstanceId)
            
            if (allResponsesForInstance && allResponsesForInstance.length > 0) {
              console.log('[FRA] Found', allResponsesForInstance.length, 'responses for this instance')
              // Check each response for fra_pdf_text
              for (const resp of allResponsesForInstance) {
                const text = resp.response_json?.fra_pdf_text
                if (text) {
                  pdfText = text
                  console.log('[FRA] ✓ Found PDF text in question:', resp.question_id, 'length:', text.length)
                  break
                }
              }
              if (!pdfText) {
                console.log('[FRA] ✗ Checked all', allResponsesForInstance.length, 'responses, none contain fra_pdf_text')
                // Log what keys are actually in the responses
                allResponsesForInstance.forEach((resp: any) => {
                  const keys = Object.keys(resp.response_json || {})
                  console.log('[FRA] Question', resp.question_id, 'has keys:', keys)
                })
              }
            } else {
              console.log('[FRA] ✗ No responses found for this instance at all')
            }
          }
          } else {
            console.log('[FRA] ✗ No first question found')
          }
        } else {
          console.log('[FRA] No first section found for template:', fraInstance?.template_id)
        }
      }
      
      // If still not found, search ALL responses for this instance
      if (!pdfText) {
        console.log('[FRA] Searching all responses for this instance to find fra_pdf_text...')
        const { data: allResponsesForInstance } = await supabase
          .from('fa_audit_responses')
          .select('question_id, response_json')
          .eq('audit_instance_id', fraInstanceId)
        
        if (allResponsesForInstance && allResponsesForInstance.length > 0) {
          console.log('[FRA] Found', allResponsesForInstance.length, 'responses for this instance')
          // Check each response for fra_pdf_text
          for (const resp of allResponsesForInstance) {
            const text = resp.response_json?.fra_pdf_text
            if (text) {
              pdfText = text
              console.log('[FRA] ✓ Found PDF text in question:', resp.question_id, 'length:', text.length)
              break
            }
          }
          if (!pdfText) {
            console.log('[FRA] ✗ Checked all', allResponsesForInstance.length, 'responses, none contain fra_pdf_text')
            // Log what keys are actually in the responses
            allResponsesForInstance.forEach((resp: any) => {
              const keys = Object.keys(resp.response_json || {})
              console.log('[FRA] Question', resp.question_id, 'has keys:', keys)
            })
          }
        } else {
          console.log('[FRA] ✗ No responses found for this instance at all')
        }
      }
    } else {
      console.log('[FRA] No FRA instance or template_id found')
    }
  }

  // FRA doesn't use database H&S audits - only uploaded PDF
  // Return null for audit, only PDF text
  return {
    audit: null,
    pdfText
  }
}

/**
 * Map H&S audit data to FRA report structure
 */
export async function mapHSAuditToFRAData(fraInstanceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get the FRA audit instance
  const fraInstance = await getAuditInstance(fraInstanceId)
  
  if (!fraInstance || (fraInstance.fa_audit_templates as any)?.category !== 'fire_risk_assessment') {
    throw new Error('Invalid FRA audit instance')
  }

  const store = fraInstance.fa_stores as any
  const storeId = store.id

  // Check for saved custom data and edited extracted data (from review page)
  const { data: sections } = await supabase
    .from('fa_audit_template_sections')
    .select('id')
    .eq('template_id', fraInstance.template_id)
    .order('order_index', { ascending: true })

  let customData: any = null
  let editedExtractedData: any = null

  if (sections && sections.length > 0) {
    const firstSection = sections[0]
    const { data: firstQuestion } = await supabase
      .from('fa_audit_template_questions')
      .select('id')
      .eq('section_id', firstSection.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstQuestion) {
      const { data: customResponse } = await supabase
        .from('fa_audit_responses')
        .select('response_json')
        .eq('audit_instance_id', fraInstanceId)
        .eq('question_id', firstQuestion.id)
        .maybeSingle()

      if (customResponse?.response_json) {
        if (customResponse.response_json.fra_custom_data) {
          customData = customResponse.response_json.fra_custom_data
        }
        if (customResponse.response_json.fra_extracted_data) {
          editedExtractedData = customResponse.response_json.fra_extracted_data
        }
      }
    }
  }

  // If no edited data from first question, check any response for fra_extracted_data
  if (!editedExtractedData) {
    const { data: allResponses } = await supabase
      .from('fa_audit_responses')
      .select('response_json')
      .eq('audit_instance_id', fraInstanceId)
    for (const row of allResponses || []) {
      if (row?.response_json?.fra_extracted_data) {
        editedExtractedData = row.response_json.fra_extracted_data
        break
      }
    }
  }

  // Get the most recent H&S audit for this store (check for uploaded PDFs too)
  const hsAuditResult = await getLatestHSAuditForStore(storeId, fraInstanceId)
  const hsAudit = hsAuditResult.audit
  const pdfText = hsAuditResult.pdfText
  
  // Extract data from PDF text if available
  let pdfExtractedData: Record<string, string | null> = {}
  if (pdfText) {
    console.log('[FRA] Extracting data from PDF text, length:', pdfText.length)
    console.log('[FRA] PDF text sample (first 1000 chars):', pdfText.substring(0, 1000))
    
    // Use original text (not normalized) for better matching
    const originalText = pdfText
    
    // Store Manager - try multiple patterns
    let storeManagerMatch = originalText.match(/(?:signature of person in charge of store at time of assessment|signature of person in charge|person in charge)[\s:]*([^\n\r]+?)(?:\*\*|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|pm|gmt)/i)
    if (!storeManagerMatch) {
      storeManagerMatch = originalText.match(/(?:store manager name|manager name)[\s:]*([^\n\r]+?)(?:\n|$)/i)
    }
    if (storeManagerMatch) {
      let managerName = storeManagerMatch[1]?.trim() || ''
      managerName = managerName.replace(/\*\*/g, '')
        .replace(/\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/gi, '')
        .replace(/\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)/gi, '')
        .replace(/\d{1,2}\s+(?:am|pm|AM|PM)\s+gmt/gi, '')
        .trim()
      if (managerName.length > 0) {
        pdfExtractedData.storeManager = managerName
        console.log('[FRA] Found store manager from PDF:', managerName)
      }
    }

    // Fire Panel Location
    const firePanelMatch = originalText.match(/(?:location of fire panel|fire panel location)[\s:]*([^\n\r]+?)(?:\n|$|is panel|panel free)/i)
    if (firePanelMatch) {
      pdfExtractedData.firePanelLocation = firePanelMatch[1]?.trim() || null
      console.log('[FRA] Found fire panel location from PDF:', pdfExtractedData.firePanelLocation)
    }

    // Fire Panel Faults
    const firePanelFaultsMatch = originalText.match(/(?:is panel free of faults|panel free of faults|panel faults)[\s:]*([^\n\r]+?)(?:\n|$|location of emergency)/i)
    if (firePanelFaultsMatch) {
      pdfExtractedData.firePanelFaults = firePanelFaultsMatch[1]?.trim() || null
      console.log('[FRA] Found fire panel faults from PDF:', pdfExtractedData.firePanelFaults)
    }

    // Emergency Lighting Switch
    const emergencyLightingMatch = originalText.match(/(?:location of emergency lighting test switch|emergency lighting test switch|emergency lighting switch)[\s:]*([^\n\r]+?)(?:\n|$|photo|photograph)/i)
    if (emergencyLightingMatch) {
      pdfExtractedData.emergencyLightingSwitch = emergencyLightingMatch[1]?.trim() || null
      console.log('[FRA] Found emergency lighting switch from PDF:', pdfExtractedData.emergencyLightingSwitch)
    }

    // Number of Floors
    let floorsMatch = originalText.match(/(?:number of floors|floors?)[\s:]*(\d+)/i)
    if (!floorsMatch) {
      const generalSiteSection = originalText.match(/general site information[\s\S]{0,500}number of floors[\s:]*(\d+)/i)
      if (generalSiteSection) {
        floorsMatch = generalSiteSection
      }
    }
    if (floorsMatch) {
      pdfExtractedData.numberOfFloors = floorsMatch[1] || null
      console.log('[FRA] Found number of floors from PDF:', pdfExtractedData.numberOfFloors)
    }

    // Operating Hours
    let operatingHoursMatch = originalText.match(/(?:operating hours|trading hours|opening hours|store hours)[\s:]*([^\n\r]+?)(?:\n|$|sleeping|number of)/i)
    if (!operatingHoursMatch) {
      const siteInfoSection = originalText.match(/(?:general|site)[\s\S]{0,300}(?:operating|trading|opening|store)[\s:]*hours?[\s:]*([^\n\r]+?)(?:\n|$)/i)
      if (siteInfoSection) {
        operatingHoursMatch = siteInfoSection
      }
    }
    if (operatingHoursMatch) {
      pdfExtractedData.operatingHours = operatingHoursMatch[1]?.trim() || null
      console.log('[FRA] Found operating hours from PDF:', pdfExtractedData.operatingHours)
    }

    // Conducted Date
    let conductedDateMatch = originalText.match(/(?:conducted on|conducted at|assessment date)[\s:]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i)
    if (!conductedDateMatch) {
      const conductedSection = originalText.match(/conducted[\s\S]{0,100}(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i)
      if (conductedSection) {
        conductedDateMatch = conductedSection
      }
    }
    if (conductedDateMatch) {
      pdfExtractedData.conductedDate = conductedDateMatch[1] || null
      console.log('[FRA] Found conducted date from PDF:', pdfExtractedData.conductedDate)
    }

    // Square Footage
    const squareFootageMatch = originalText.match(/(?:square footage|square meterage|floor area)[\s:]*([^\n\r]*?\d+[^\n\r]*?)(?:\n|$|number of|occupancy)/i)
    if (squareFootageMatch) {
      pdfExtractedData.squareFootage = squareFootageMatch[1]?.trim() || null
      console.log('[FRA] Found square footage from PDF:', pdfExtractedData.squareFootage)
    }

    // H&S audit evidence for FRA: obstructed fire exits / escape routes
    const escapeObstructedMatch = originalText.match(/(?:fire\s+exit|escape\s+route|delivery\s+door).*?(?:blocked|obstructed|partially\s+blocked|restricted|pallets|boxes)/i)
      || originalText.match(/(?:blocked|obstructed|partially\s+blocked).*?(?:fire\s+exit|escape\s+route|delivery\s+door|stockroom|rear\s+fire\s+door)/i)
      || originalText.match(/(?:pallets|boxes).*?(?:fire\s+exit|delivery\s+door|stockroom|escape)/i)
    if (escapeObstructedMatch) {
      pdfExtractedData.escapeRoutesObstructed = 'yes'
      console.log('[FRA] Found escape route obstruction from PDF (evidence-led FRA)')
    }

    // Combustible storage / escape route compromise
    const combustibleEscapeMatch = originalText.match(/(?:combustible|storage).*?(?:escape\s+route|compromised)/i)
      || originalText.match(/(?:escape\s+route).*?(?:compromised|combustible)/i)
    if (combustibleEscapeMatch) {
      pdfExtractedData.combustibleStorageEscapeCompromise = 'yes'
      console.log('[FRA] Found combustible storage / escape compromise from PDF')
    }

    // Fire safety training shortfall (toolbox not 100%, induction incomplete)
    const trainingShortfallMatch = originalText.match(/(?:toolbox|fire\s+safety\s+training).*?(?:not\s+100%|incomplete)/i)
      || originalText.match(/(?:induction\s+training).*?incomplete/i)
      || originalText.match(/training\s+not\s+at\s+100%|incomplete\s+for\s+(?:two\s+)?staff/i)
    if (trainingShortfallMatch) {
      pdfExtractedData.fireSafetyTrainingShortfall = 'yes'
      console.log('[FRA] Found fire safety training shortfall from PDF')
    }

    console.log('[FRA] Final PDF Extracted Data:', pdfExtractedData)
  }

  // Debug logging - comprehensive
  console.log('[FRA] ===== H&S AUDIT DEBUG =====')
  console.log('[FRA] H&S Audit found:', !!hsAudit)
  console.log('[FRA] PDF Text found:', !!pdfText, pdfText ? `(${pdfText.length} chars)` : '')
  if (hsAudit) {
    console.log('[FRA] H&S Audit ID:', (hsAudit as any).id)
    console.log('[FRA] H&S Audit conducted_at:', (hsAudit as any).conducted_at)
    console.log('[FRA] H&S Audit template_id:', (hsAudit as any).template_id)
    console.log('[FRA] H&S Audit template (nested):', (hsAudit as any).fa_audit_templates)
    console.log('[FRA] H&S Audit responses count:', (hsAudit as any)?.responses?.length ?? 0)
  } else {
    console.log('[FRA] No H&S audit found for store:', storeId)
  }
  console.log('[FRA] ==========================')

  // Helper to get answer from H&S audit responses
  const getHSAnswer = (questionText: string): any => {
    const audit = hsAudit as any
    if (!audit?.responses) return null
    
    // Find question by text match (case-insensitive, partial)
    const question = audit.responses.find((r: any) => {
      // We need to get the question text from the question_id
      // For now, we'll search by section and question patterns
      return false // Will be enhanced with question lookup
    })
    
    return null
  }

  // Helper to get answer by section/question pattern
  const getAnswerBySection = (sectionTitle: string, questionPattern: string): any => {
    if (!hsAudit) return null
    
    // This is a simplified version - in production, we'd need to fetch the template
    // and match questions properly. For now, we'll extract from responses.
    return null
  }

  // Extract data from H&S audit responses
  // We'll need to fetch the template to match questions properly
  // If we have an H&S audit, get its template
  let hsTemplateData = null
  if (hsAudit) {
    const templateId = (hsAudit as any).template_id || (hsAudit as any).fa_audit_templates?.id
    if (templateId) {
      const { data: sections } = await supabase
        .from('fa_audit_template_sections')
        .select(`
          *,
          fa_audit_template_questions (*)
        `)
        .eq('template_id', templateId)
        .order('order_index', { ascending: true })

      if (sections) {
        hsTemplateData = { sections }
        console.log('[FRA] Template sections loaded:', sections.length)
        const totalQuestions = sections.reduce((sum, s) => sum + ((s as any).fa_audit_template_questions?.length || 0), 0)
        console.log('[FRA] Total questions in template:', totalQuestions)
      } else {
        console.log('[FRA] No sections found for template:', templateId)
      }
    } else {
      console.log('[FRA] No template_id found in H&S audit. Audit structure:', Object.keys(hsAudit))
    }
  } else {
    console.log('[FRA] No H&S audit found for store:', storeId)
  }

  // Helper to find answer by question text pattern (from database responses)
  const findAnswer = (questionPattern: string): { value: any; comment?: string } | null => {
    const audit = hsAudit as any
    if (!audit?.responses || !hsTemplateData) {
      return null
    }

    // Normalize pattern for matching
    const normalizedPattern = questionPattern.toLowerCase().trim()
    let matchCount = 0
    
    // Find question matching pattern - try exact match first, then partial
    for (const section of hsTemplateData.sections) {
      const questions = (section as any).fa_audit_template_questions || []
      for (const question of questions) {
        const questionText = question.question_text?.toLowerCase() || ''
        
        // Try exact match first, then partial match (check if pattern is contained in question text)
        if (questionText === normalizedPattern || questionText.includes(normalizedPattern) || normalizedPattern.includes(questionText)) {
          matchCount++
          const response = audit.responses.find((r: any) => r.question_id === question.id)
          if (response) {
            const responseValue = response.response_value || response.response_json
            const responseComment = typeof response.response_json === 'object' && response.response_json?.comment
              ? response.response_json.comment
              : undefined
            
            console.log(`[FRA] findAnswer("${questionPattern}"): Found match!`, {
              questionText: question.question_text,
              questionId: question.id,
              responseValue,
              responseComment,
              hasValue: responseValue !== null && responseValue !== undefined && responseValue !== ''
            })
            
            // Only return if we have actual data
            if (responseValue !== null && responseValue !== undefined && responseValue !== '') {
              return {
                value: responseValue,
                comment: responseComment
              }
            } else if (responseComment) {
              return {
                value: null,
                comment: responseComment
              }
            }
          } else {
            console.log(`[FRA] findAnswer("${questionPattern}"): Question matched but no response found`, {
              questionText: question.question_text,
              questionId: question.id
            })
          }
        }
      }
    }
    
    if (matchCount === 0) {
      console.log(`[FRA] findAnswer("${questionPattern}"): No matching questions found`)
    }
    
    return null
  }

  // Extract specific data points - prioritize edited data, then PDF text, then database responses
  const generalSiteInfo = editedExtractedData?.numberOfFloors
    ? { value: editedExtractedData.numberOfFloors, comment: undefined }
    : pdfExtractedData.numberOfFloors 
      ? { value: pdfExtractedData.numberOfFloors, comment: undefined }
      : findAnswer('Number of floors')
        || findAnswer('floors')
        || findAnswer('number of floors')
  const fireExits = findAnswer('Number of Fire Exits')
  const staffCount = findAnswer('Number of Staff employed')
  const maxStaff = findAnswer('Maximum number of staff working')
  const youngPersons = findAnswer('Young persons')
  const enforcementAction = findAnswer('enforcement action')
  const squareFootage = editedExtractedData?.squareFootage
    ? { value: editedExtractedData.squareFootage, comment: undefined }
    : pdfExtractedData.squareFootage
      ? { value: pdfExtractedData.squareFootage, comment: undefined }
      : findAnswer('Square Footage') || findAnswer('Square Meterage')
  
  // Store manager name from signature - prioritize edited data, then PDF, then database
  const storeManagerName = editedExtractedData?.storeManager
    ? { value: editedExtractedData.storeManager, comment: undefined }
    : pdfExtractedData.storeManager
      ? { value: pdfExtractedData.storeManager, comment: undefined }
      : findAnswer('Store Manager Name') 
        || findAnswer('Store Manager')
        || findAnswer('Manager Name')
  const storeManagerSignature = findAnswer('Signature of Person in Charge of store at time of assessment')
    || findAnswer('Signature of Person in Charge')
    || findAnswer('Person in Charge')
    || findAnswer('signature of person in charge')
    || findAnswer('person in charge')
  
  // Debug logging
  console.log('[FRA] ===== STORE MANAGER DEBUG =====')
  console.log('[FRA] Store Manager Name found:', !!storeManagerName)
  if (storeManagerName) {
    console.log('[FRA] Store Manager Name value:', storeManagerName.value)
    console.log('[FRA] Store Manager Name comment:', storeManagerName.comment)
  }
  console.log('[FRA] Store Manager Signature found:', !!storeManagerSignature)
  if (storeManagerSignature) {
    console.log('[FRA] Store Manager Signature value:', storeManagerSignature.value)
    console.log('[FRA] Store Manager Signature comment:', storeManagerSignature.comment)
    console.log('[FRA] Store Manager Signature value type:', typeof storeManagerSignature.value)
  }
  console.log('[FRA] ===============================')
  
  // Extract name from signature if it's a structured object
  let extractedManagerName: string | null = null
  if (storeManagerSignature) {
    const sigValue = storeManagerSignature.value
    const sigComment = storeManagerSignature.comment
    // Check if it's a JSON object with name field
    if (typeof sigValue === 'object' && sigValue !== null) {
      extractedManagerName = (sigValue as any).name || (sigValue as any).signature_name || null
    } else if (typeof sigValue === 'string' && sigValue.length > 0) {
      // Try to extract name from string (might be formatted as "Name - Date" or "Name **")
      const nameMatch = sigValue.match(/^([^*–-]+)/)
      if (nameMatch) {
        extractedManagerName = nameMatch[1].trim().replace(/\*\*/g, '').trim()
      }
    }
    // Also check comment field
    if (!extractedManagerName && sigComment) {
      const commentMatch = sigComment.match(/^([^*–-]+)/)
      if (commentMatch) {
        extractedManagerName = commentMatch[1].trim().replace(/\*\*/g, '').trim()
      }
    }
  }
  
  // Use PDF extracted manager name if available
  if (pdfExtractedData.storeManager && !extractedManagerName) {
    extractedManagerName = pdfExtractedData.storeManager
  }
  
  console.log('[FRA] Extracted Manager Name:', extractedManagerName)
  
  // Try to find occupancy calculation data
  const occupancyData = findAnswer('occupancy') || findAnswer('capacity')

  /** Parse floor area string to a number (m²). Handles "3000", "650 m²", "Approximately 650 m²", etc. */
  const parseFloorAreaM2 = (s: string | null | undefined): number | null => {
    if (!s || typeof s !== 'string') return null
    const trimmed = s.trim()
    const match = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:m²|sq\.?\s*m|square\s*m|m2)?/i) ?? trimmed.match(/(\d+(?:\.\d+)?)/)
    if (!match) return null
    const n = parseFloat(match[1])
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const floorAreaStr = customData?.floorArea || squareFootage?.value || squareFootage?.comment || ''
  const floorAreaNum = parseFloorAreaM2(floorAreaStr)
  const hasManualOccupancy = !!(customData?.occupancy?.trim() || occupancyData?.value || occupancyData?.comment)
  const defaultOccupancyText = 'To be calculated based on floor area'
  const occupancyFromFloorArea =
    !hasManualOccupancy &&
    floorAreaNum != null &&
    floorAreaNum >= 10
      ? `Approximately ${Math.round(floorAreaNum / 2)} persons based on 2 m² per person`
      : null
  
  // Try to find operating hours - prioritize edited data, then PDF, then database
  const operatingHoursData = editedExtractedData?.operatingHours
    ? { value: editedExtractedData.operatingHours, comment: undefined }
    : pdfExtractedData.operatingHours
      ? { value: pdfExtractedData.operatingHours, comment: undefined }
      : findAnswer('operating hours') 
        || findAnswer('trading hours')
        || findAnswer('opening hours')
        || findAnswer('store hours')
  
  // Debug logging
  console.log('[FRA] Operating Hours found:', !!operatingHoursData, operatingHoursData?.value || operatingHoursData?.comment)

  // Fire Safety section data
  const fraAvailable = findAnswer('FRA available')
  const combustibleMaterials = findAnswer('Combustible materials are stored correctly')
  const fireDoorsClosed = findAnswer('Fire doors closed and not held open')
  const fireDoorsCondition = findAnswer('Fire doors in a good condition')
  const intumescentStrips = findAnswer('intumescent strips')
  const structureCondition = findAnswer('Structure found to be in a good condition')
  const fireExitRoutes = findAnswer('Fire exit routes clear')
  const fireExtinguishers = findAnswer('Fire Extinguishers clear')
  const callPoints = findAnswer('call points clear')
  const weeklyFireTests = findAnswer('Weekly Fire Tests')
  const fireDrill = findAnswer('Fire drill has been carried out')
  const emergencyLighting = findAnswer('Emergency Lighting test')
  const sprinklerClearance = findAnswer('50mm clearance from stock to sprinkler head')
  const sprinklerSystemAnswer = findAnswer('Sprinkler System')
  const hasSprinklers = sprinklerSystemAnswer?.value === 'Yes' || sprinklerClearance?.value === 'Yes' || sprinklerSystemAnswer?.comment?.toLowerCase().includes('sprinkler')
  const plugsExtensionLeads = findAnswer('plugs and Extension leads')

  // Statutory Testing
  const fireAlarmMaintenance = findAnswer('Fire Alarm Maintenance')
  const emergencyLightingMaintenance = findAnswer('Emergency Lighting Maintenance')
  const fireExtinguisherService = findAnswer('Fire Extinguisher Service')

  // Training
  const trainingInduction = findAnswer('H&S induction training')
  const trainingToolbox = findAnswer('toolbox refresher training')

  // Contractor & Visitor Safety
  const contractorManagement = findAnswer('contractors managed')
  const visitorSigning = findAnswer('visitors signing in')

  // COSHH
  const coshhSheets = findAnswer('COSHH data sheets available')

  // Working at Height
  const laddersNumbered = findAnswer('ladders clearly numbered')

  // Evidence-led flags from PDF or H&S audit responses
  const escapeObstructed = pdfExtractedData.escapeRoutesObstructed === 'yes' ||
    (fireExitRoutes && String(fireExitRoutes.value).toLowerCase() === 'no')
  const combustibleEscapeCompromise = pdfExtractedData.combustibleStorageEscapeCompromise === 'yes' ||
    (combustibleMaterials && String(combustibleMaterials.value).toLowerCase() === 'no')
  const fireSafetyTrainingShortfall = pdfExtractedData.fireSafetyTrainingShortfall === 'yes' ||
    trainingInduction?.value === 'No' || trainingToolbox?.value === 'No'

  // Get auditor name
  let auditorName = 'Admin User'
  if (fraInstance.conducted_by_user_id) {
    const { data: auditorProfile } = await supabase
      .from('fa_profiles')
      .select('full_name')
      .eq('id', fraInstance.conducted_by_user_id)
      .single()
    if (auditorProfile?.full_name) {
      auditorName = auditorProfile.full_name
    }
  }

  // Extract premises description from H&S audit
  const premisesDescription = findAnswer('Number of floors') || findAnswer('floors')
  const floorsInfo = premisesDescription?.value || premisesDescription?.comment || generalSiteInfo?.value || generalSiteInfo?.comment || '1'

  // Fire Alarm System - extract location and panel status - prioritize edited data, then PDF, then database
  const firePanelLocation = editedExtractedData?.firePanelLocation
    ? { value: editedExtractedData.firePanelLocation, comment: undefined }
    : pdfExtractedData.firePanelLocation
      ? { value: pdfExtractedData.firePanelLocation, comment: undefined }
      : findAnswer('Location of Fire Panel')
        || findAnswer('Fire Panel Location')
        || findAnswer('Fire Alarm Panel Location')
        || findAnswer('Panel Location')
        || findAnswer('fire panel')
  const firePanelFaults = editedExtractedData?.firePanelFaults
    ? { value: editedExtractedData.firePanelFaults, comment: undefined }
    : pdfExtractedData.firePanelFaults
      ? { value: pdfExtractedData.firePanelFaults, comment: undefined }
      : findAnswer('Is panel free of faults')
        || findAnswer('Panel free of faults')
        || findAnswer('Fire panel free of faults')
        || findAnswer('Panel faults')
        || findAnswer('panel free')
  
  // Debug logging
  console.log('[FRA] Fire Panel Location found:', !!firePanelLocation, firePanelLocation?.value || firePanelLocation?.comment)
  console.log('[FRA] Fire Panel Faults found:', !!firePanelFaults, firePanelFaults?.value || firePanelFaults?.comment)
  
  // Format panel faults answer
  let panelFaultsText = 'Panel status to be verified'
  if (firePanelFaults) {
    const faultsValue = String(firePanelFaults.value || '').toLowerCase()
    if (faultsValue === 'yes' || faultsValue === 'y') {
      panelFaultsText = firePanelFaults.comment || 'No faults'
    } else if (faultsValue === 'no' || faultsValue === 'n') {
      panelFaultsText = firePanelFaults.comment || 'Faults present - to be verified'
    } else if (firePanelFaults.comment) {
      panelFaultsText = firePanelFaults.comment
    }
  }

  // Emergency Lighting - extract test switch location - prioritize edited data, then PDF, then database
  const emergencyLightingSwitchLocation = editedExtractedData?.emergencyLightingSwitch
    ? { value: editedExtractedData.emergencyLightingSwitch, comment: undefined }
    : pdfExtractedData.emergencyLightingSwitch
      ? { value: pdfExtractedData.emergencyLightingSwitch, comment: undefined }
      : findAnswer('Location of Emergency Lighting Test Switch') 
        || findAnswer('Emergency Lighting Test Switch')
        || findAnswer('Emergency Lighting Switch')
        || findAnswer('emergency lighting test')
        || findAnswer('lighting test switch')
  
  // Debug logging
  console.log('[FRA] Emergency Lighting Switch Location found:', !!emergencyLightingSwitchLocation, emergencyLightingSwitchLocation?.value || emergencyLightingSwitchLocation?.comment)

  // Format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Build FRA data structure with debug source tracking
  const appointedPersonValue = extractedManagerName 
    || storeManagerName?.value 
    || storeManagerName?.comment 
    || (typeof storeManagerSignature?.value === 'object' && storeManagerSignature.value !== null 
      ? (storeManagerSignature.value as any).name || (storeManagerSignature.value as any).signature_name
      : typeof storeManagerSignature?.value === 'string' 
        ? storeManagerSignature.value.split(/[–-]/)[0]?.trim()
        : storeManagerSignature?.comment?.split(/[–-]/)[0]?.trim())
    || 'Store Manager'
  console.log('[FRA] Final Appointed Person Value:', appointedPersonValue)
  
  // Assessment date should ALWAYS come from H&S audit conducted date if available
  // Check edited data first, then PDF, then database audit, then FRA instance
  const hsAuditConductedAt = editedExtractedData?.conductedDate
    ? (() => {
        // Try to parse the date from edited data
        const dateStr = editedExtractedData.conductedDate
        const dateMatch = dateStr.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i)
        if (dateMatch) {
          const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
          const day = parseInt(dateMatch[1])
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)]
          const year = parseInt(dateMatch[3])
          return new Date(year, month, day).toISOString()
        }
        // Try parsing as ISO string
        try {
          return new Date(dateStr).toISOString()
        } catch {
          return null
        }
      })()
    : pdfExtractedData.conductedDate
      ? (() => {
          // Try to parse the date from PDF text
          const dateMatch = pdfExtractedData.conductedDate.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i)
          if (dateMatch) {
            const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
            const day = parseInt(dateMatch[1])
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)]
            const year = parseInt(dateMatch[3])
            return new Date(year, month, day).toISOString()
          }
          return null
        })()
      : (hsAudit as any)?.conducted_at
    
  const assessmentDateValue = hsAuditConductedAt 
    ? formatDate(hsAuditConductedAt)
    : formatDate(fraInstance.conducted_at || fraInstance.created_at)
  const assessmentStartTimeValue = hsAuditConductedAt
    ? formatDateTime(hsAuditConductedAt)?.split(' ').slice(-3).join(' ') || null
    : formatDateTime(fraInstance.conducted_at || fraInstance.created_at)?.split(' ').slice(-3).join(' ') || null
  
  // Debug logging
  console.log('[FRA] ===== ASSESSMENT DATE DEBUG =====')
  console.log('[FRA] Has H&S Audit:', !!hsAudit)
  console.log('[FRA] PDF Conducted Date:', pdfExtractedData.conductedDate)
  console.log('[FRA] H&S Audit conducted_at (raw):', hsAuditConductedAt)
  console.log('[FRA] FRA Instance conducted_at:', fraInstance.conducted_at)
  console.log('[FRA] FRA Instance created_at:', fraInstance.created_at)
  console.log('[FRA] Final Assessment Date:', assessmentDateValue)
  console.log('[FRA] Final Assessment Start Time:', assessmentStartTimeValue)
  console.log('[FRA] =================================')
  
  const returnData = {
    // Cover page data
    clientName: 'Footasylum Ltd',
    _sources: {
      clientName: 'DEFAULT',
      premises: 'DATABASE',
      address: 'DATABASE',
      responsiblePerson: 'DEFAULT',
      ultimateResponsiblePerson: 'DEFAULT',
      appointedPerson: (extractedManagerName || storeManagerName?.value || storeManagerName?.comment || storeManagerSignature?.value) ? (pdfExtractedData.storeManager ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT',
      assessorName: 'DATABASE',
      assessmentDate: hsAuditConductedAt ? (pdfExtractedData.conductedDate ? 'PDF' : 'H&S_AUDIT') : 'FRA_INSTANCE',
      assessmentStartTime: hsAuditConductedAt ? (pdfExtractedData.conductedDate ? 'PDF' : 'H&S_AUDIT') : 'FRA_INSTANCE',
      assessmentEndTime: 'N/A',
      assessmentReviewDate: hsAuditConductedAt ? (pdfExtractedData.conductedDate ? 'PDF_CALCULATED' : 'H&S_AUDIT_CALCULATED') : 'FRA_INSTANCE_CALCULATED',
      buildDate: customData?.buildDate ? 'CUSTOM' : 'WEB_SEARCH', // Will be searched, fallback to default if not found
      propertyType: 'DEFAULT',
      description: generalSiteInfo?.value || generalSiteInfo?.comment ? (pdfExtractedData.numberOfFloors ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT',
      numberOfFloors: generalSiteInfo?.value || generalSiteInfo?.comment ? (pdfExtractedData.numberOfFloors ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT',
      floorArea: customData?.floorArea ? 'CUSTOM' : (squareFootage?.value || squareFootage?.comment ? (pdfExtractedData.squareFootage ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT'),
      occupancy: customData?.occupancy ? 'CUSTOM' : (occupancyFromFloorArea ? 'FRA_INSTANCE_CALCULATED' : (occupancyData?.value || occupancyData?.comment ? 'H&S_AUDIT' : 'DEFAULT')),
      operatingHours: customData?.operatingHours ? 'CUSTOM' : (operatingHoursData?.value || operatingHoursData?.comment ? (pdfExtractedData.operatingHours ? 'PDF' : 'H&S_AUDIT') : 'WEB_SEARCH'),
      storeOpeningTimes: operatingHoursData?.value || operatingHoursData?.comment ? (pdfExtractedData.operatingHours ? 'PDF' : 'H&S_AUDIT') : 'WEB_SEARCH',
      accessDescription: 'CHATGPT',
      fireAlarmPanelLocation: firePanelLocation?.value || firePanelLocation?.comment ? (pdfExtractedData.firePanelLocation ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT',
      fireAlarmPanelFaults: firePanelFaults?.value || firePanelFaults?.comment ? (pdfExtractedData.firePanelFaults ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT',
      emergencyLightingTestSwitchLocation: emergencyLightingSwitchLocation?.value || emergencyLightingSwitchLocation?.comment ? (pdfExtractedData.emergencyLightingSwitch ? 'PDF' : 'H&S_AUDIT') : 'DEFAULT',
      fireAlarmDescription: 'DEFAULT',
      fireAlarmMaintenance: fireAlarmMaintenance?.comment ? 'H&S_AUDIT' : 'DEFAULT',
      emergencyLightingDescription: 'DEFAULT',
      emergencyLightingMaintenance: emergencyLightingMaintenance?.comment ? 'H&S_AUDIT' : 'DEFAULT',
      fireExtinguishersDescription: 'DEFAULT',
      fireExtinguisherService: fireExtinguisherService?.comment ? 'H&S_AUDIT' : 'DEFAULT',
      sprinklerDescription: hasSprinklers ? 'H&S_AUDIT' : 'DEFAULT',
      sprinklerClearance: hasSprinklers ? (sprinklerClearance?.value === 'Yes' ? 'H&S_AUDIT' : 'DEFAULT') : 'N/A',
      internalFireDoors: (fireDoorsCondition?.value || fireDoorsCondition?.comment || intumescentStrips?.value || intumescentStrips?.comment) ? 'H&S_AUDIT' : 'DEFAULT',
      historyOfFires: enforcementAction?.value ? 'H&S_AUDIT' : 'DEFAULT',
      sourcesOfIgnition: 'DEFAULT',
      sourcesOfFuel: 'DEFAULT',
      sourcesOfOxygen: 'DEFAULT',
      peopleAtRisk: 'DEFAULT',
      significantFindings: (pdfText || hsAudit) ? 'H&S_AUDIT' : 'DEFAULT',
      recommendedControls: 'H&S_AUDIT_MIXED',
      escapeRoutesEvidence: escapeObstructed ? 'H&S_AUDIT' : 'N/A',
      fireSafetyTrainingNarrative: fireSafetyTrainingShortfall ? 'H&S_AUDIT' : 'DEFAULT',
      managementReviewStatement: (pdfText || hsAudit) ? 'H&S_AUDIT' : 'N/A',
      sourcesOfFuelCoshhNote: 'DEFAULT',
    } as Record<string, string>,
    premises: `Footasylum – ${store.store_name}`,
    address: [
      store.address_line_1,
      store.city,
      store.postcode,
      store.region
    ].filter(Boolean).join('\n'),
    responsiblePerson: 'Footasylum Ltd',
    ultimateResponsiblePerson: 'Chief Financial Officer Footasylum Ltd',
    appointedPerson: appointedPersonValue as string,
    assessorName: auditorName,
    assessmentDate: assessmentDateValue,
    assessmentStartTime: assessmentStartTimeValue,
    assessmentEndTime: null, // Not tracked in current system
    assessmentReviewDate: hsAuditConductedAt 
      ? formatDate(new Date(new Date(hsAuditConductedAt).setFullYear(new Date(hsAuditConductedAt).getFullYear() + 1)).toISOString())
      : formatDate(new Date(new Date(fraInstance.conducted_at || fraInstance.created_at).setFullYear(new Date(fraInstance.conducted_at || fraInstance.created_at).getFullYear() + 1)).toISOString()),

    // About the Property (customData.buildDate overrides when set)
    buildDate: customData?.buildDate || '2009', // Will be updated by web search if available
    propertyType: 'Retail unit used for the sale of branded fashion apparel and footwear to members of the public.',
    description: (() => {
      const numFloors = generalSiteInfo?.value || generalSiteInfo?.comment || '1'
      const floorsNum = parseInt(String(numFloors).replace(/\D/g, '')) || 1
      
      if (floorsNum === 1) {
        return `The premises operates over one level (Ground Floor) and comprises a main sales floor to the front of the unit with associated back-of-house areas to the rear, including stockroom, office and staff welfare facilities.
The unit is of modern construction, consisting primarily of steel frame with blockwork, modern internal wall finishes and commercial-grade floor coverings.
The premises is a mid-unit with adjoining retail occupancies to either side.`
      } else {
        const floorNames = floorsNum === 2 
          ? 'Ground Floor and First Floor'
          : floorsNum === 3
          ? 'Ground Floor, First Floor and Second Floor'
          : `Ground Floor and ${floorsNum - 1} upper level(s)`
        
        return `The premises is arranged over ${floorsNum} level(s) (${floorNames}) and comprises:
• Main sales floor to the front of the unit
• Stockroom, staff welfare facilities and management office to the rear
• Rear service corridor providing access to final exits
The unit is of modern construction, consisting primarily of steel frame with blockwork, modern internal wall finishes and commercial-grade floor coverings.
The premises is a mid-unit with adjoining retail occupancies to either side.`
      }
    })(),
    numberOfFloors: generalSiteInfo?.value || generalSiteInfo?.comment || '1',
    floorArea: customData?.floorArea || squareFootage?.value || squareFootage?.comment || 'To be confirmed', // Use custom data if available
    floorAreaComment: !customData?.floorArea && !squareFootage?.value && !squareFootage?.comment ? 'Please add floor area information' : null,
    occupancy: customData?.occupancy || occupancyData?.value || occupancyData?.comment || occupancyFromFloorArea || 'To be calculated based on floor area',
    occupancyComment: occupancyFromFloorArea ? null : (!customData?.occupancy && !occupancyData?.value && !occupancyData?.comment ? 'Please add occupancy information or it will be calculated based on floor area (2 m² per person)' : null),
    operatingHours: customData?.operatingHours || operatingHoursData?.value || operatingHoursData?.comment || 'To be confirmed',
    operatingHoursComment: !customData?.operatingHours && !operatingHoursData?.value && !operatingHoursData?.comment ? 'Please add operating hours information' : null,
    sleepingRisk: 'No sleeping occupants',
    internalFireDoors: (() => {
      // Check if fire doors are in good condition and intumescent strips are present
      const doorsGood = fireDoorsCondition?.value === 'Yes' || fireDoorsCondition?.value === true || 
                       (typeof fireDoorsCondition?.value === 'string' && fireDoorsCondition.value.toLowerCase().includes('yes'))
      const stripsPresent = intumescentStrips?.value === 'Yes' || intumescentStrips?.value === true ||
                            (typeof intumescentStrips?.value === 'string' && intumescentStrips.value.toLowerCase().includes('yes'))
      
      if (doorsGood && stripsPresent) {
        return 'All internal fire doors within the premises are of an appropriate fire-resisting standard and form part of the building\'s passive fire protection measures. Intumescent strips are present and in good condition.'
      } else if (doorsGood && !stripsPresent) {
        return 'Internal fire doors within the premises are of an appropriate fire-resisting standard and form part of the building\'s passive fire protection measures. However, intumescent strips require attention to ensure full compliance with fire safety standards.'
      } else if (fireDoorsCondition?.comment) {
        return fireDoorsCondition.comment
      } else {
        return 'All internal fire doors within the premises are of an appropriate fire-resisting standard and form part of the building\'s passive fire protection measures. Fire door condition and intumescent strip presence should be verified during the assessment.'
      }
    })(),
    historyOfFires: enforcementAction?.value === 'None' ? 'No reported fire-related incidents in the previous 12 months.' : 'No reported fire-related incidents in the previous 12 months.',

    // Fire Alarm System
    fireAlarmDescription: `The premises is protected by an electronic fire detection and alarm system installed in accordance with BS 5839-1:2017 and the Regulatory Reform (Fire Safety) Order 2005, Article 13(1)(a). The system is a Grade A, Category L1, plus Type M fire alarm system, which aligns with Footasylum Ltd's standard specification for retail premises.
The fire alarm system is fully operational and provides automatic fire detection coverage throughout all areas of the premises. Smoke detector units are positioned throughout the sales floor and back-of-house areas to provide early warning of fire and to maximise evacuation time in the event of an emergency.
Manual call points are provided throughout the premises and are positioned in accordance with BS 5839 requirements for a normal risk environment.`,
    fireAlarmPanelLocation: firePanelLocation?.value || firePanelLocation?.comment || 'To be confirmed',
    fireAlarmPanelLocationComment: !firePanelLocation?.value && !firePanelLocation?.comment ? 'Please add fire panel location' : null,
    fireAlarmPanelFaults: panelFaultsText,
    fireAlarmPanelFaultsComment: !firePanelFaults?.value && !firePanelFaults?.comment ? 'Please verify panel status' : null,
    fireAlarmMaintenance: fireAlarmMaintenance?.comment || 'Fire alarm servicing is completed at six-monthly intervals, in line with statutory and British Standard requirements.',

    // Emergency Lighting
    emergencyLightingDescription: `Emergency escape lighting is installed throughout the premises in accordance with BS 5266-1 to illuminate escape routes and exits in the event of a failure of the normal lighting supply.
The emergency lighting system was observed to be operational at the time of assessment.`,
    emergencyLightingTestSwitchLocation: emergencyLightingSwitchLocation?.value || emergencyLightingSwitchLocation?.comment || 'To be confirmed',
    emergencyLightingTestSwitchLocationComment: !emergencyLightingSwitchLocation?.value && !emergencyLightingSwitchLocation?.comment ? 'Please add emergency lighting test switch location' : null,
    emergencyLightingMaintenance: emergencyLightingMaintenance?.comment || 'Monthly functional tests and annual full-duration tests are undertaken by competent persons, with records maintained as part of the store\'s health and safety compliance checks.',

    // Portable Fire-Fighting Equipment
    fireExtinguishersDescription: `Portable fire-fighting equipment is provided throughout the premises in appropriate locations, including near final exits and areas of increased electrical risk. Fire extinguishers are suitable for the identified risks within the store environment and are mounted on brackets or stands with clear signage.
Fire extinguishers are subject to annual inspection and servicing by a suitably competent contractor in accordance with BS 5306.`,
    fireExtinguisherService: fireExtinguisherService?.comment || 'Fire extinguishers were observed to be in position, clearly visible and unobstructed.',

    // Sprinkler & Smoke Extraction - only if sprinklers exist
    hasSprinklers: hasSprinklers,
    sprinklerDescription: hasSprinklers 
      ? `The premises is protected by an automatic sprinkler system forming part of the overall fire safety strategy. The system is designed to control the spread of fire at an early stage, limit fire growth and reduce the volume of smoke generated, thereby improving life safety outcomes in the event of a fire.
Sprinkler heads are installed throughout the premises in accordance with the original system design and relevant standards. Adequate clearance must be always maintained between stored stock and sprinkler heads to ensure effective operation and to prevent impairment of the system.`
      : 'The premises is not protected by an automatic sprinkler system. Fire safety is managed through other means including fire detection and alarm systems, emergency lighting, and portable fire-fighting equipment.',
    sprinklerClearance: hasSprinklers 
      ? (sprinklerClearance?.value === 'Yes' ? 'Adequate clearance maintained' : 'Clearance to be verified')
      : 'N/A - No sprinkler system installed',

    // Fire Hazards (Stage 1)
    sourcesOfIgnition: [
      'Electrical installations and equipment',
      'Lighting and display lighting',
      'Portable electrical equipment',
      'Heat generated from electrical faults',
      'Deliberate ignition (arson)'
    ],
    sourcesOfFuel: [
      'Retail stock including clothing and footwear',
      'Cardboard and packaging materials',
      'Display fixtures and fittings',
      'Office furniture and furnishings',
      'Cleaning materials (low risk, non-flammable)'
    ],
    sourcesOfOxygen: [
      'Natural airflow within the premises',
      'Mechanical ventilation systems',
      'Open doors during trading hours'
    ],

    // People at Risk (Stage 2)
    peopleAtRisk: [
      'Employees – including full-time, part-time and temporary staff working within the store',
      'Members of the public – customers and visitors present during trading hours',
      'Contractors and visitors – including maintenance personnel and other third parties who may be unfamiliar with the premises',
      'Young persons – where employed, subject to appropriate risk assessment and controls'
    ],

    // Evidence-led narrative: escape routes (prefer edited from review screen)
    escapeRoutesEvidence: (editedExtractedData?.escapeRoutesEvidence?.trim())
      || (escapeObstructed
        ? 'Observed during recent inspections: fire exits and delivery doors were partially blocked by pallets and boxes (stockroom and rear fire door), restricting effective escape width during evacuation.'
        : null),

    // Evidence-led narrative: fire safety training (prefer edited from review screen)
    fireSafetyTrainingNarrative: (editedExtractedData?.fireSafetyTrainingNarrative?.trim())
      || (fireSafetyTrainingShortfall
        ? 'Fire safety training is delivered via induction and toolbox talks; refresher completion is monitored, with improvements currently underway.'
        : 'Fire safety training is delivered via induction and toolbox talks; records are maintained.'),

    // Management & Review: prefer edited from review screen
    managementReviewStatement: (editedExtractedData?.managementReviewStatement?.trim())
      || ((pdfText || hsAudit)
        ? 'This assessment has been informed by recent health and safety inspections and site observations.'
        : null),

    // COSHH reference for Sources of fuel (brief; detail in H&S only)
    sourcesOfFuelCoshhNote: 'Cleaning materials are low-risk and non-flammable. COSHH is managed under a separate assessment.',

    // Significant Findings (evidence-led; use edited escape text from review when present)
    significantFindings: (() => {
      const editedEscape = editedExtractedData?.escapeRoutesEvidence?.trim()
      const escapeSentence = editedEscape
        || (escapeObstructed
          ? 'Observed during recent inspections: fire exits and delivery doors were partially blocked by pallets and boxes (stockroom and rear fire door), restricting effective escape width during evacuation.'
          : 'Escape routes were clearly identifiable and generally maintained free from obstruction.')
      const detectionFinding = 'The premises is provided with appropriate fire detection and alarm systems, emergency lighting, fire-fighting equipment and clearly defined escape routes. These systems were observed to be in place and operational, supporting safe evacuation in the event of a fire.'
      const fireDoorsFinding = 'Fire doors and compartmentation arrangements were observed to be in satisfactory condition, with doors not wedged open and fitted with intact intumescent protection. ' + escapeSentence
      const managementFinding = 'Routine fire safety management arrangements are in place, including weekly fire alarm testing, monthly emergency lighting checks and scheduled servicing of fire safety systems by competent contractors. Fire drills have been conducted, and records are maintained.'
      return [detectionFinding, fireDoorsFinding, managementFinding]
    })(),

    // Recommended Controls (obstruction when edited text or PDF/findAnswer)
    recommendedControls: [
      trainingInduction?.value === 'No' ? 'Ensure all staff fire safety training is completed, recorded and kept up to date, including induction training for new starters and periodic refresher training.' : null,
      trainingToolbox?.value === 'No' ? 'Reinforce toolbox refresher training completion to meet the 100% target for the last 12 months.' : null,
      contractorManagement?.value === 'No' ? 'Reinforce contractor and visitor management procedures, including signing-in arrangements and briefing on emergency procedures.' : null,
      coshhSheets?.value === 'No' ? 'Ensure fire safety documentation relevant to the premises is available on site and maintained in an accessible format, including COSHH safety data sheets.' : null,
      laddersNumbered?.value === 'No' ? 'Ensure all ladders and steps are clearly numbered for identification purposes.' : null,
      (editedExtractedData?.escapeRoutesEvidence?.trim() || escapeObstructed) ? 'Address obstruction of fire exits and delivery doors (e.g. pallets, boxes) to maintain effective escape width; ensure escape routes and final exits are always kept clear and unobstructed.' : 'Continue to ensure escape routes and final exits are always kept clear and unobstructed.',
      combustibleEscapeCompromise ? 'Maintain good housekeeping standards; ensure combustible materials and packaging do not compromise escape routes.' : 'Maintain good housekeeping standards, particularly in relation to the control and storage of combustible materials and packaging.',
      'Continue routine testing, inspection and servicing of fire alarm systems, emergency lighting and fire-fighting equipment in accordance with statutory requirements and British Standards.',
      'Ensure internal fire doors are maintained in effective working order and are not wedged or held open.',
      'Continue to conduct and record fire drills at appropriate intervals to ensure staff familiarity with evacuation procedures.'
    ].filter(Boolean) as string[],

    // Store data for reference
    store: store,
    hsAuditDate: hsAudit ? formatDate((hsAudit as any).conducted_at || (hsAudit as any).created_at) : null,
    fraInstance: fraInstance,
    // Photos from H&S audit
    photos: (hsAudit as any)?.media || null,
    // Risk Rating (Middlesbrough FRA alignment)
    riskRatingLikelihood: (editedExtractedData as any)?.riskRatingLikelihood || 'Normal',
    riskRatingConsequences: (editedExtractedData as any)?.riskRatingConsequences || 'Moderate Harm',
    summaryOfRiskRating: (editedExtractedData as any)?.summaryOfRiskRating || 'Taking into account the nature of the building and the occupants, as well as the fire protection and procedural arrangements observed at the time of this fire risk assessment, it is considered that the consequences for life safety in the event of fire would be: Moderate Harm. Accordingly, it is considered that the risk from fire at these premises is: Tolerable.',
    actionPlanLevel: (editedExtractedData as any)?.actionPlanLevel || 'Tolerable',
    // Recommended Actions: use edited action plan if set; otherwise derive from PDF/H&S findings
    actionPlanItems: (() => {
      const edited = (editedExtractedData as any)?.actionPlanItems
      if (edited && Array.isArray(edited) && edited.length > 0) {
        return edited
      }
      type ActionItem = { recommendation: string; priority: 'Low' | 'Medium' | 'High'; dueNote?: string }
      const derived: ActionItem[] = []
      const hasEscapeIssue = !!(editedExtractedData?.escapeRoutesEvidence?.trim() || escapeObstructed)
      if (hasEscapeIssue) {
        derived.push({
          priority: 'High',
          recommendation: 'Address obstruction of fire exits and delivery doors (e.g. pallets, boxes); ensure escape routes and final exits are kept clear and unobstructed.',
        })
      }
      if (trainingInduction?.value === 'No') {
        derived.push({
          priority: 'Medium',
          recommendation: 'Ensure all staff fire safety training is completed, including induction training for new starters and periodic refresher training.',
        })
      }
      if (trainingToolbox?.value === 'No') {
        derived.push({
          priority: 'Medium',
          recommendation: 'Reinforce toolbox refresher training completion to meet the 100% target for the last 12 months.',
        })
      }
      if (combustibleEscapeCompromise) {
        derived.push({
          priority: 'Medium',
          recommendation: 'Maintain good housekeeping; ensure combustible materials and packaging do not compromise escape routes.',
        })
      }
      if (coshhSheets?.value === 'No') {
        derived.push({
          priority: 'Low',
          recommendation: 'Ensure fire safety documentation including COSHH safety data sheets is available on site and maintained.',
        })
      }
      if (laddersNumbered?.value === 'No') {
        derived.push({
          priority: 'Low',
          recommendation: 'Ensure all ladders and steps are clearly numbered for identification purposes.',
        })
      }
      const priorityOrder = { High: 0, Medium: 1, Low: 2 }
      derived.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      derived.push({
        priority: 'Low',
        recommendation: 'Continue routine checks and testing of fire alarm, emergency lighting and fire-fighting equipment.',
      })
      return derived
    })(),
    sitePremisesPhotos: (editedExtractedData as any)?.sitePremisesPhotos || null,
  }
  
  // Update sources for arrays (significantFindings already set evidence-led when pdfText/hsAudit)
  returnData._sources = {
    ...returnData._sources,
    sourcesOfIgnition: 'DEFAULT',
    sourcesOfFuel: 'DEFAULT',
    sourcesOfOxygen: 'DEFAULT',
    peopleAtRisk: 'DEFAULT',
    recommendedControls: trainingInduction?.value === 'No' || trainingToolbox?.value === 'No' || contractorManagement?.value === 'No' || coshhSheets?.value === 'No' || laddersNumbered?.value === 'No' ? 'H&S_AUDIT_MIXED' : 'DEFAULT',
  }
  
  // Return the data with sources
  return returnData
}
