import { EmpMasterTemplatesClient } from '@/components/emp/emp-master-templates-client'
import { requireEmpAccess } from '@/lib/emp/access'

export default async function CrowdManagementMasterTemplatesPage() {
  await requireEmpAccess()

  return <EmpMasterTemplatesClient />
}
