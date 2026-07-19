export const FRA_TEMPLATE_VARIANTS = {
  NEW_STORE_PRE_OPENING: 'new_store_pre_opening',
  BREMONT_WATCHES: 'bremont_watches',
} as const

export type FraTemplateVariant = typeof FRA_TEMPLATE_VARIANTS[keyof typeof FRA_TEMPLATE_VARIANTS]

export type ManagedFRATemplateKind = 'new_store' | 'bremont_watches'

export interface ManagedFRATemplateDefinition {
  kind: ManagedFRATemplateKind
  title: string
  description: string
  variant: FraTemplateVariant
  assessmentContext: 'pre_opening' | 'operational'
  sectionTitle: string
  metadataQuestionText: string
  badgeLabel: string
  sourceLabel: 'PRE_OPENING' | 'BREMONT'
}

export const NEW_STORE_FRA_TEMPLATE: ManagedFRATemplateDefinition = {
  kind: 'new_store',
  title: 'New Store Fire Risk Assessment',
  description: 'Pre-opening Fire Risk Assessment for new stores before they open to the public.',
  variant: FRA_TEMPLATE_VARIANTS.NEW_STORE_PRE_OPENING,
  assessmentContext: 'pre_opening',
  sectionTitle: 'Pre-opening FRA metadata',
  metadataQuestionText: 'New store FRA metadata',
  badgeLabel: 'pre-opening FRA',
  sourceLabel: 'PRE_OPENING',
}

export const BREMONT_WATCHES_FRA_TEMPLATE: ManagedFRATemplateDefinition = {
  kind: 'bremont_watches',
  title: 'Bremont Watches Fire Risk Assessment',
  description: 'Fire Risk Assessment template for Bremont Watches retail showrooms and boutiques.',
  variant: FRA_TEMPLATE_VARIANTS.BREMONT_WATCHES,
  assessmentContext: 'operational',
  sectionTitle: 'Bremont Watches FRA metadata',
  metadataQuestionText: 'Bremont Watches FRA metadata',
  badgeLabel: 'Bremont Watches FRA',
  sourceLabel: 'BREMONT',
}

export const MANAGED_FRA_TEMPLATES = [
  NEW_STORE_FRA_TEMPLATE,
  BREMONT_WATCHES_FRA_TEMPLATE,
] as const

export function isFireRiskAssessmentCategory(category?: string | null): boolean {
  if (!category) return false
  const normalized = String(category).trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized === 'fire_risk_assessment' || normalized === 'fire_risk'
}

export function getManagedFRATemplateDefinition(
  template?: { title?: string | null; category?: string | null } | null
): ManagedFRATemplateDefinition | null {
  if (!template || !isFireRiskAssessmentCategory(template.category)) return null
  const title = String(template.title || '').trim().toLowerCase()
  return MANAGED_FRA_TEMPLATES.find((definition) => definition.title.toLowerCase() === title) || null
}

export function getManagedFRATemplateDefinitionByKind(
  kind: ManagedFRATemplateKind
): ManagedFRATemplateDefinition {
  const definition = MANAGED_FRA_TEMPLATES.find((candidate) => candidate.kind === kind)
  if (!definition) {
    throw new Error(`Unknown managed FRA template kind: ${kind}`)
  }
  return definition
}

export function getManagedFRATemplateDefinitionByVariant(
  variant?: string | null
): ManagedFRATemplateDefinition | null {
  if (!variant) return null
  return MANAGED_FRA_TEMPLATES.find((definition) => definition.variant === variant) || null
}
