import { ArrowLeft, ClipboardList, Eye, FileText, type LucideIcon } from 'lucide-react'

export type EmpChromeNavItem = {
  href: string
  label: string
  icon: LucideIcon
  action?: undefined
}

const EMP_WORKSPACE_HREF = '/admin/event-management-plans'
const EMP_MASTER_TEMPLATES_HREF = '/admin/event-management-plans/master-templates'

function isEmpMasterTemplatesPath(pathname?: string | null): boolean {
  return String(pathname || '').startsWith(EMP_MASTER_TEMPLATES_HREF)
}

export function isEmpSectionPath(pathname?: string | null): boolean {
  return String(pathname || '').startsWith(EMP_WORKSPACE_HREF)
}

export function getEmpPageTitle(pathname?: string | null): string {
  const currentPath = String(pathname || '')

  if (!isEmpSectionPath(currentPath)) {
    return 'Event Management Plans'
  }

  if (currentPath === EMP_WORKSPACE_HREF) {
    return 'EMP Workspace'
  }

  if (isEmpMasterTemplatesPath(currentPath)) {
    return 'Master Templates'
  }

  if (currentPath.endsWith('/preview')) {
    return 'Preview & Export'
  }

  return 'Plan Builder'
}

export function getEmpNavItems(pathname?: string | null): EmpChromeNavItem[] {
  const currentPath = String(pathname || '')
  const match = isEmpMasterTemplatesPath(currentPath)
    ? null
    : currentPath.match(/^\/admin\/event-management-plans\/([^/]+)(\/preview)?$/)
  const currentPlanHref = match ? `/admin/event-management-plans/${match[1]}` : null
  const previewHref = match ? `${currentPlanHref}/preview` : null

  return [
    { href: EMP_WORKSPACE_HREF, label: 'EMP Workspace', icon: ClipboardList },
    { href: EMP_MASTER_TEMPLATES_HREF, label: 'Master Templates', icon: FileText },
    ...(currentPlanHref ? [{ href: currentPlanHref, label: 'Plan Builder', icon: FileText }] : []),
    ...(previewHref ? [{ href: previewHref, label: 'Preview & Export', icon: Eye }] : []),
    { href: '/admin', label: 'Back to Admin', icon: ArrowLeft },
  ]
}

export function isEmpNavItemActive(pathname: string | null | undefined, href: string): boolean {
  const currentPath = String(pathname || '')

  if (href === EMP_WORKSPACE_HREF) {
    return currentPath === href
  }

  if (href === '/admin') {
    return currentPath === href
  }

  return currentPath === href || currentPath.startsWith(`${href}/`)
}
