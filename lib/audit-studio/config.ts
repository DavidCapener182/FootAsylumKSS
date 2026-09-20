// Audit Studio is available to admins unless explicitly disabled for a deployment.
// Role checks remain enforced by the page, navigation and server actions.
export function studioEnabled() {
  return process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED !== "false";
}
