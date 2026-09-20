import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { studioEnabled } from "@/lib/audit-studio/config";
import { AuditStudioWorkspace } from "@/components/audit-studio/workspace";

export default async function AuditStudioPage() {
  await requireRole(["admin"]);
  if (!studioEnabled()) notFound();
  return <AuditStudioWorkspace />;
}
