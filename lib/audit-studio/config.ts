export function studioEnabled() {
  return process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED === "true";
}
