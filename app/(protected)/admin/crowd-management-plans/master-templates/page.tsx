import { CmpMasterTemplatesClient } from '@/components/cmp/cmp-master-templates-client'
import { requireCmpAccess } from '@/lib/cmp/access'

export default async function CrowdManagementMasterTemplatesPage() {
  await requireCmpAccess()

  return <CmpMasterTemplatesClient />
}
