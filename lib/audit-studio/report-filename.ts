/** Shared by the PDF response and the browser download button. */
export function auditReportFilename(site: { storeCode: string; storeName: string; visitDate: string }): string {
  const clean = (value: string) => value.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g, "-").trim();
  return `${clean(site.storeCode)}-${clean(site.storeName)}- ${clean(site.visitDate)}.pdf`;
}
