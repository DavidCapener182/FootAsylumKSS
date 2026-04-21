import { ArrowLeft, ClipboardList, Eye, FileText, type LucideIcon } from 'lucide-react'

export type CmpChromeNavItem = {
  href: string
  label: string
  icon: LucideIcon
  action?: undefined
}

const CMP_WORKSPACE_HREF = '/admin/crowd-management-plans'
const CMP_MASTER_TEMPLATES_HREF = '/admin/crowd-management-plans/master-templates'

function isCmpMasterTemplatesPath(pathname?: string | null): boolean {
  return String(pathname || '').startsWith(CMP_MASTER_TEMPLATES_HREF)
}

export function isCmpSectionPath(pathname?: string | null): boolean {
  return String(pathname || '').startsWith(CMP_WORKSPACE_HREF)
}

export function getCmpPageTitle(pathname?: string | null): string {
  const currentPath = String(pathname || '')

  if (!isCmpSectionPath(currentPath)) {
    return 'Crowd Management Plans'
  }

  if (currentPath === CMP_WORKSPACE_HREF) {
    return 'CMP Workspace'
  }

  if (isCmpMasterTemplatesPath(currentPath)) {
    return 'Master Templates'
  }

  if (currentPath.endsWith('/preview')) {
    return 'Preview & Export'
  }

  return 'Plan Builder'
}

export function getCmpNavItems(pathname?: string | null): CmpChromeNavItem[] {
  const currentPath = String(pathname || '')
  const match = isCmpMasterTemplatesPath(currentPath)
    ? null
    : currentPath.match(/^\/admin\/crowd-management-plans\/([^/]+)(\/preview)?$/)
  const currentPlanHref = match ? `/admin/crowd-management-plans/${match[1]}` : null
  const previewHref = match ? `${currentPlanHref}/preview` : null

  return [
    { href: CMP_WORKSPACE_HREF, label: 'CMP Workspace', icon: ClipboardList },
    { href: CMP_MASTER_TEMPLATES_HREF, label: 'Master Templates', icon: FileText },
    ...(currentPlanHref ? [{ href: currentPlanHref, label: 'Plan Builder', icon: FileText }] : []),
    ...(previewHref ? [{ href: previewHref, label: 'Preview & Export', icon: Eye }] : []),
    { href: '/admin', label: 'Back to Admin', icon: ArrowLeft },
  ]
}

export function isCmpNavItemActive(pathname: string | null | undefined, href: string): boolean {
  const currentPath = String(pathname || '')

  if (href === CMP_WORKSPACE_HREF) {
    return currentPath === href
  }

  if (href === '/admin') {
    return currentPath === href
  }

  return currentPath === href || currentPath.startsWith(`${href}/`)
}
