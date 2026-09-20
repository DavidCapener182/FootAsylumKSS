import { effectiveResponse, interviewEntries } from "./staff-interviews";
import { interviewAssessment, practicalDefinition } from "./interview-practical";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditBundle, StudioQuestion } from "./types";
import { scoreAudit, formatScore } from "./scoring";
import { responseNotes } from "./practical-checks";
import { MANAGER_QUESTION_GROUPS, managerReferenceNotes } from "./manager-questions";

const ink = rgb(0.08, 0.16, 0.12),
  muted = rgb(0.35, 0.39, 0.36),
  green = rgb(0.24, 0.38, 0.27),
  paper = rgb(0.94, 0.96, 0.95),
  rule = rgb(0.81, 0.85, 0.83),
  red = rgb(0.73, 0.03, 0.14),
  amber = rgb(0.62, 0.38, 0.04);
const W = 595.28,
  H = 841.89,
  M = 42,
  CW = W - M * 2;
/** Uses the frozen snapshot only. No operational data is fetched while rendering. */
export async function generateReport(
  b: AuditBundle,
  read: (path: string) => Promise<Buffer>,
): Promise<Buffer> {
  const pdf = await PDFDocument.create(),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const score = scoreAudit(b.template, b.audit.document),
    doc = {
      ...b.audit.document,
      responses: Object.fromEntries(b.template.sections.flatMap(s => s.checks.map(q =>
        [q.id, effectiveResponse(b.audit.document, b.template, q.id)],
      ))),
    };
  let page!: PDFPage,
    y = 0;
  const normalize = (s: string) =>
    s
      .replace(/\r/g, "")
      .replace(/[\u2011\u2010]/g, "-")
      .replace(/\u202f|\u00a0/g, " ");
  const line = (
    s: string,
    x: number,
    baseline: number,
    size = 10,
    font: PDFFont = regular,
    color = ink,
  ) => {
    try {
      page.drawText(normalize(s), { x, y: baseline, size, font, color });
    } catch {
      throw new Error(
        "The report contains characters that the PDF font cannot render. No incomplete report was saved.",
      );
    }
  };
  let flowTitle = "Audit checks";
  const newPage = (title: string) => {
    page = pdf.addPage([W, H]);
    y = H - 65;
    page.drawRectangle({ x: M, y: H - 39, width: CW, height: 2, color: green });
    line("KSS / FOOTASYLUM     AUDIT STUDIO", M, H - 28, 8, bold, ink);
    line(title, M, y, 16, bold);
    y -= 24;
  };
  const ensure = (height: number) => {
    if (y - height < 55) newPage(`${flowTitle} — continued`);
  };
  const wrap = (text: string, size: number, font: PDFFont, width: number) => {
    const lines: string[] = [];
    for (const block of normalize(text || "—").split("\n")) {
      let current = "";
      for (const word of block.split(/\s+/)) {
        let fragment = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(fragment + char, size) > width) {
            if (current) {
              lines.push(current);
              current = "";
            }
            lines.push(fragment);
            fragment = "";
          }
          fragment += char;
        }
        if (
          current &&
          font.widthOfTextAtSize(`${current} ${fragment}`, size) > width
        ) {
          lines.push(current);
          current = "";
        }
        current = current ? `${current} ${fragment}` : fragment;
      }
      lines.push(current);
    }
    return lines;
  };
  const paragraph = (
    text: string,
    size = 10,
    font: PDFFont = regular,
    color = ink,
    width = CW,
    x = M,
  ) => {
    for (const value of wrap(text, size, font, width)) {
      ensure(size + 5);
      line(value, x, y, size, font, color);
      y -= size + 4;
    }
    y -= 4;
  };
  const heading = (text: string) => {
    ensure(65);
    y -= 5;
    paragraph(text, 10.5, bold);
  };
  const sectionHeading = (title: string, detail = "", minimumSpace = 100) => {
    ensure(minimumSpace);
    y -= 6;
    page.drawRectangle({
      x: M,
      y: y - 22,
      width: CW,
      height: 29,
      color: paper,
    });
    line(title, M + 9, y - 10, 10.5, bold);
    if (detail)
      line(
        detail,
        W - M - 9 - bold.widthOfTextAtSize(detail, 9),
        y - 10,
        9,
        bold,
        green,
      );
    y -= 34;
  };
  const divider = () => {
    page.drawLine({
      start: { x: M, y },
      end: { x: W - M, y },
      thickness: 0.5,
      color: rule,
    });
    y -= 6;
  };
  const detailRow = (label: string, value: string, width = CW) => {
    const valueWidth = width * 0.6 - 12;
    const lines = wrap(value || "Not recorded", 9, regular, valueWidth);
    const labels = wrap(label, 9, bold, width * 0.4 - 12);
    const height = Math.max(lines.length, labels.length) * 12 + 12;
    ensure(height);
    labels.forEach((v, i) => line(v, M + 8, y - 10 - i * 12, 9, bold));
    lines.forEach((v, i) => line(v, M + width * 0.4, y - 10 - i * 12, 9));
    y -= height;
    page.drawLine({
      start: { x: M, y },
      end: { x: M + width, y },
      thickness: 0.5,
      color: rule,
    });
  };
  const questionRow = (q: StudioQuestion) => {
    const r = doc.responses[q.id];
    const label =
      r.answer === "no"
        ? "No"
        : r.answer === "na"
          ? "N/A"
          : !r.verified
            ? "Not verified"
            : r.answer === "yes"
              ? "Yes"
              : "Unanswered";
    const color =
      label === "No"
        ? red
        : label === "Yes"
          ? green
          : label === "N/A"
            ? muted
            : amber;
    const lines = wrap(q.question, 10, bold, CW - 151);
    const height = Math.max(38, lines.length * 13 + 14);
    ensure(height + 12);
    line(q.id, M, y - 13, 8, regular, muted);
    lines.forEach((v, i) => line(v, M + 33, y - 13 - i * 13, 10, bold));
    page.drawRectangle({
      x: W - M - 105,
      y: y - height + 5,
      width: 105,
      height: height - 5,
      color,
    });
    line(
      label,
      W - M - 52.5 - bold.widthOfTextAtSize(label, 10) / 2,
      r.answer === "no" ? y - (height - 5) / 2 - 3 : y - 16,
      10,
      bold,
      rgb(1, 1, 1),
    );
    const points =
      r.answer === "na"
        ? "Excluded"
        : `${r.answer === "yes" && r.verified ? q.weight : 0} / ${q.weight} points`;
    if (r.answer !== "no")
      line(
        points,
        W - M - 52.5 - regular.widthOfTextAtSize(points, 8) / 2,
        y - 28,
        8,
        regular,
        rgb(1, 1, 1),
      );
    y -= height + 3;
  };
  const interviews = (questionId: string, summary = false) => {
    for (const { staff, index, prompt, answer } of interviewEntries(doc, b.template, questionId)) {
      const assessment = interviewAssessment(answer, prompt.id);
      const outcome = assessment === "gap" ? "Gap identified" : assessment === "understood" ? "Understood" : assessment === "not-applicable" ? "Not applicable" : "Not assessed";
      const who = staff.colleague || `Colleague ${index + 1}`;
      if (summary || prompt.questionId !== questionId) {
        paragraph(`${who} · ${prompt.title}: ${outcome}. Full interview at ${prompt.questionId}.`, 9, regular, assessment === "gap" ? red : muted);
        continue;
      }
      ensure(110);
      sectionHeading(`${who} · ${prompt.title}`, outcome, 110);
      if (staff.role) paragraph(staff.role, 8, regular, muted);
      paragraph(answer.asked || "Question not recorded", 9, bold);
      if (answer.reply) paragraph(answer.reply, 9);
      if (answer.practical) {
        paragraph(`Task: ${answer.practical.context}`, 8, regular, muted);
        paragraph(`Reference checked: ${answer.practical.reference}`, 8, regular, muted);
        const definition = practicalDefinition(prompt.id, answer.practical.version);
        for (const criterion of definition?.criteria || []) {
          const check = answer.practical.checks[criterion.id];
          const label = check?.result === "met" ? "Correct" : check?.result === "gap" ? "Missed" : check?.result === "na" ? "N/A" : "Not observed";
          const lines = wrap(criterion.label, 8.5, regular, CW - 86);
          ensure(lines.length * 12 + 24);
          line(label, M + 8, y - 9, 8, bold, check?.result === "gap" ? red : green);
          lines.forEach((value, i) => line(value, M + 78, y - 9 - i * 12, 8.5));
          y -= lines.length * 12 + 7;
          if (check?.note) paragraph(check.note, 8, regular, muted, CW - 78, M + 78);
          divider();
        }
      }
      if (answer.outcome) paragraph(`Outcome: ${answer.outcome}`, 9);
    }
  };
  const attachments = new Map(b.evidence.map((e) => [e.id, e]));
  const supporting: Array<{ ref: string; name: string; bytes: Buffer }> = [];
  const supportingIds = new Set<string>();
  const photos = async (questionId: string, compact = false) => {
    const photoCount = doc.evidence.filter(
      (e) =>
        e.questionId === questionId &&
        attachments.get(e.id)?.file_type !== "application/pdf",
    ).length;
    const columns = photoCount === 3 || photoCount >= 5 ? 3 : 2;
    const gap = 16,
      col = (CW - gap * (columns - 1)) / columns,
      imageHeight = compact ? 135 : 155;
    type Photo = {
      img: Awaited<ReturnType<typeof pdf.embedJpg>>;
      label: string;
      caption: string;
      location: string;
    };
    let row: Photo[] = [];
    const flush = () => {
      if (!row.length) return;
      const descriptions = row.map((item) =>
        wrap(
          [
            item.label,
            item.caption,
            item.location ? `Location: ${item.location}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          8,
          regular,
          col,
        ),
      );
      const rowImageHeight = Math.min(
        imageHeight,
        Math.max(
          ...row.map((item) => (col * item.img.height) / item.img.width),
        ),
      );
      const height =
        rowImageHeight +
        16 +
        Math.max(...descriptions.map((lines) => Math.min(lines.length, 7))) *
          11;
      ensure(height + 12);
      const top = y;
      row.forEach((item, index) => {
        const x = M + index * (col + gap),
          scale = Math.min(
            col / item.img.width,
            rowImageHeight / item.img.height,
          );
        page.drawRectangle({
          x,
          y: top - rowImageHeight,
          width: col,
          height: rowImageHeight,
          color: paper,
        });
        page.drawImage(item.img, {
          x: x + (col - item.img.width * scale) / 2,
          y:
            top -
            rowImageHeight +
            (rowImageHeight - item.img.height * scale) / 2,
          width: item.img.width * scale,
          height: item.img.height * scale,
        });
        const lines =
          descriptions[index].length > 7
            ? wrap(`${item.label}\nFull caption below.`, 8, regular, col)
            : descriptions[index];
        lines.forEach((value, j) =>
          line(
            value,
            x,
            top - rowImageHeight - 13 - j * 11,
            8,
            j === 0 ? bold : regular,
            muted,
          ),
        );
      });
      y = top - height - 12;
      row.forEach((item, index) => {
        if (descriptions[index].length > 7)
          paragraph(
            [item.label, item.caption, item.location]
              .filter(Boolean)
              .join("\n"),
            9,
          );
      });
      row = [];
    };
    for (const ref of doc.evidence.filter((e) => e.questionId === questionId)) {
      const e = attachments.get(ref.id);
      if (!e || e.status !== "ready" || !e.sha256 || !e.render_path)
        throw new Error(`Missing evidence ${ref.id}`);
      const original = await read(e.source_path);
      if (createHash("sha256").update(original).digest("hex") !== e.sha256)
        throw new Error(`Evidence integrity check failed: ${e.id}`);
      const label = `${questionId} / ${e.id.slice(0, 8)} · ${e.file_name}`;
      if (e.file_type === "application/pdf") {
        flush();
        if (!supportingIds.has(e.id)) {
          supporting.push({ ref: label, name: e.file_name, bytes: original });
          supportingIds.add(e.id);
        }
        paragraph(`Supporting PDF: ${label}`, 9, bold);
        if (ref.caption) paragraph(ref.caption, 9);
        continue;
      }
      const bytes =
        e.render_path === e.source_path ? original : await read(e.render_path);
      let img;
      try {
        img = await pdf.embedJpg(bytes);
      } catch {
        throw new Error(`Unreadable report photo: ${e.id}`);
      }
      row.push({ img, label, caption: ref.caption, location: ref.location });
      if (row.length === columns) flush();
    }
    flush();
  };
  newPage("Health & Safety Audit");
  const logo = await pdf.embedJpg(
    await readFile(
      path.join(process.cwd(), "docs/audit-studio/kss-logo-v1.jpg"),
    ),
  );
  page.drawImage(logo, { x: W - M - 52, y: y - 42, width: 52, height: 52 });
  paragraph(doc.site.storeName, 22, bold, ink, CW - 75);
  paragraph(
    `${doc.site.storeCode} · ${doc.site.visitDate}`,
    10,
    regular,
    muted,
  );
  y -= 12;
  const outcomeColor =
    score.outcome === "Fail"
      ? red
      : score.outcome === "Pending" ||
          score.outcome === "Pass with recommendations"
        ? amber
        : green;
  page.drawRectangle({ x: M, y: y - 62, width: CW, height: 70, color: paper });
  line(formatScore(score.percentage), M + 12, y - 23, 28, bold, outcomeColor);
  line(
    `${score.earned} / ${score.applicable} points`,
    M + 13,
    y - 45,
    9,
    regular,
    muted,
  );
  line(
    score.outcome.toUpperCase(),
    M + 185,
    y - 17,
    score.outcome === "Pass with recommendations" ? 9 : 12,
    bold,
    outcomeColor,
  );
  const failedCount = Object.values(doc.responses).filter(
    (r) => r.answer === "no",
  ).length;
  const unverifiedCount = Object.values(doc.responses).filter(
    (r) => r.answer && r.answer !== "na" && !r.verified,
  ).length;
  line(
    `${failedCount} failed checks · ${unverifiedCount} not verified`,
    M + 185,
    y - 37,
    9,
    regular,
    muted,
  );
  y -= 78;
  detailRow("Prepared by", doc.site.auditor);
  detailRow("Visit date", doc.site.visitDate);
  detailRow("Store address", doc.site.address);
  detailRow("Template version", b.template.version);
  if (b.audit.parent_id) detailRow("Revision of", b.audit.parent_id);
  y -= 12;
  heading("Result");
  paragraph(
    score.reasons.length
      ? score.reasons.join("\n")
      : "Meets the 80% overall pass mark and 70% core-section targets. No confirmed critical failure or outstanding safety verification.",
    9,
  );
  heading("Section scores");
  const scoredSections = score.sections.filter(
    (section) =>
      b.template.sections.find((s) => s.page === section.page)!.checks.length,
  );
  for (let i = 0; i < scoredSections.length; i += 2) {
    ensure(31);
    for (let c = 0; c < 2; c++) {
      const section = scoredSections[i + c];
      if (!section) continue;
      const x = M + c * (CW / 2 + 8),
        width = CW / 2 - 16;
      const label = wrap(section.title, 8, regular, width - 56);
      label.forEach((value, j) => line(value, x, y - j * 10, 8, regular));
      const result = formatScore(section.percentage);
      line(
        result,
        x + width - bold.widthOfTextAtSize(result, 9),
        y,
        9,
        bold,
        green,
      );
      page.drawLine({
        start: { x, y: y - 20 },
        end: { x: x + width, y: y - 20 },
        thickness: 0.5,
        color: rgb(0.8, 0.84, 0.8),
      });
    }
    y -= 30;
  }
  flowTitle = "Flagged items";
  newPage("Flagged items");
  const findings = b.template.sections
    .flatMap((s) => s.checks)
    .filter((q) => {
      const r = doc.responses[q.id];
      return (
        r?.answer === "no" || (r?.answer && r.answer !== "na" && !r.verified)
      );
    });
  paragraph(
    `${findings.length} flagged ${findings.length === 1 ? "item" : "items"}`,
    10,
    bold,
    muted,
  );
  if (!findings.length) paragraph("No failed checks recorded.");
  for (const q of findings) {
    const r = doc.responses[q.id];
    ensure(100);
    paragraph(
      b.template.sections.find((s) =>
        s.checks.some((check) => check.id === q.id),
      )!.title,
      9,
      regular,
      muted,
    );
    questionRow(q);
    if (responseNotes(r)) paragraph(responseNotes(r), 9);
    interviews(q.id, true);
    if (r.action.text) paragraph(
      `Action: ${r.action.text}\nOwner: ${r.action.owner} · Due: ${r.action.dueDate}`, 9,
    );
    if (r.danger)
      paragraph(`Immediate serious danger: ${r.dangerReason}`, 10, bold);
    await photos(q.id, true);
    divider();
  }
  for (const s of b.template.sections) {
    // Section 1 is the cover. Its site photos remain with the site information below.
    if (s.page === 1) continue;
    if (s.page === 2) {
      // Preserve the original terms and improvement illustration without rewording them.
      const introduction = await PDFDocument.load(
        await readFile(
          path.join(
            process.cwd(),
            "docs/audit-studio/safetyculture-introduction-v1.pdf",
          ),
        ),
      );
      for (const original of introduction.getPages().slice(0, 1)) {
        const embedded = await pdf.embedPage(original);
        page = pdf.addPage([W, H]);
        page.drawPage(embedded, { x: 0, y: 0, width: W, height: H });
      }
      continue;
    }
    flowTitle = "Audit checks";
    if (s.page === 3) newPage("Site overview & audit checks");
    const sectionScore = score.sections.find((x) => x.page === s.page)!;
    sectionHeading(
      `${String(s.page).padStart(2, "0")} / ${s.page === 3 && doc.site.managerName !== undefined ? "Store manager Q&A" : s.title}`,
      s.checks.length
        ? `${sectionScore.earned}/${sectionScore.applicable} · ${formatScore(sectionScore.percentage)}`
        : "",
      110,
    );
    if (sectionScore.core)
      paragraph("Core section · 70% target", 8, regular, muted);
    if (s.page === 3) {
      const hasManager = MANAGER_QUESTION_GROUPS.some(g => g.questions.some(q =>
        !["staff", "maxStaff", "youngPersons", "responsibilities"].includes(q.key) && doc.site[q.key]?.trim(),
      ));
      paragraph(`Floors: ${doc.site.floors || "Not recorded"}    ·    Area: ${doc.site.area ? `${doc.site.area} ${doc.site.areaUnit}` : "Not recorded"}    ·    Exits: ${doc.site.exits || "Not recorded"}`, 9);
      if (hasManager) {
        paragraph("Manager's answers; verify against records and independent staff checks.", 8, regular, muted);
        const labels: Record<string, string> = {
          managerName: "Manager / role", staff: "Staff employed", maxStaff: "Maximum on shift",
          youngPersons: "Under 18s / arrangements", inductionArrangements: "Induction and supervision",
          assemblyPoint: "Assembly point", assemblyPointEvidence: "Location verified against",
          evacuationProcedure: "Action when the alarm sounds", evacuationAssistance: "Evacuation assistance",
          firstAidArrangements: "First-aid help and kit", incidentReporting: "Accidents and near misses",
          localRisks: "Local risks and controls", responsibilities: "Safety checks and follow-up",
        };
        for (const group of MANAGER_QUESTION_GROUPS) {
          ensure(75);
          paragraph(group.title, 9, bold);
          for (const q of group.questions) detailRow(labels[q.key] || q.question, doc.site[q.key] || "Not recorded");
          y -= 7;
        }
      } else {
        for (const [label,value] of [["Staff employed",doc.site.staff],["Maximum on shift",doc.site.maxStaff],["Under 18s",doc.site.youngPersons],["Responsibilities",doc.site.responsibilities]]) detailRow(label,value);
      }
      // Keep the interview together. Additional site records and illustrations follow it.
      ensure(85);
      heading("Site records");
      detailRow("Enforcement history",doc.site.enforcement);
      detailRow("Systems",doc.site.systems);
      if (doc.site.limitations || doc.site.previousReport) {
        if (doc.site.limitations) paragraph(`Visit limitations: ${doc.site.limitations}`,8,regular,muted);
        if (doc.site.previousReport) paragraph(`Previous report: ${doc.site.previousReport}`,8,regular,muted);
      }
      const cycle = await pdf.embedJpg(await readFile(path.join(process.cwd(), "docs/audit-studio/improvement-cycle-v1.jpg")));
      const cycleHeight=100, cycleWidth=cycle.width/cycle.height*cycleHeight;
      ensure(cycleHeight+24);
      page.drawImage(cycle,{x:W-M-cycleWidth,y:y-cycleHeight,width:cycleWidth,height:cycleHeight});
      paragraph("Plan · Do · Check · Act",10,bold,ink,CW-cycleWidth-18);
      paragraph("Plan the controls, put them into practice, check their effectiveness and follow up improvements.",9,regular,muted,CW-cycleWidth-18);
      y -= Math.max(0,cycleHeight-55)+15;
      await photos("disclaimer");
      await photos("site");
      await photos("site-information");
    }
    for (const q of s.checks) {
      const r = doc.responses[q.id];
      questionRow(q);
      const notes = responseNotes(r);
      const managerNotes = managerReferenceNotes(doc.site, q.id);
      if (managerNotes) paragraph("Manager's arrangements: see the Store manager Q&A in section 03.", 8, regular, muted);
      if (notes) paragraph(notes);
      interviews(q.id);
      if (r.answer === "na") paragraph(`Reason: ${r.naReason}`);
      if (r.answer === "no")
        paragraph(
          `Action: ${r.action.text}\nOwner: ${r.action.owner} · Due: ${r.action.dueDate}`,
          9,
        );
      if (r.danger)
        paragraph(`Immediate serious danger: ${r.dangerReason}`, 10, bold);
      await photos(q.id);
      divider();
    }
    if (s.page === 17) {
      for (const [label, value] of [
        ["Auditor", doc.signOff.auditorSignature],
        ["Store representative", doc.signOff.representativeSignature],
      ]) {
        ensure(value ? 130 : 25);
        paragraph(
          label === "Auditor"
            ? `${label}: ${doc.site.auditor}`
            : `${label}: ${doc.signOff.representative || "Unavailable"}`,
          10.5,
          bold,
        );
        if (value) {
          let signature;
          try {
            signature = await pdf.embedPng(value);
          } catch {
            throw new Error("A signature is unreadable.");
          }
          ensure(95);
          const scale = Math.min(230 / signature.width, 80 / signature.height);
          page.drawImage(signature, {
            x: M,
            y: y - signature.height * scale,
            width: signature.width * scale,
            height: signature.height * scale,
          });
          y -= 95;
        }
      }
      if (doc.signOff.unavailableReason)
        paragraph(
          `Acknowledgement unavailable: ${doc.signOff.unavailableReason}`,
        );
      await photos("sign-off");
    }
  }
  for (const attachment of supporting) {
    const source = await PDFDocument.load(attachment.bytes);
    const pages = await pdf.copyPages(source, source.getPageIndices());
    for (const p of pages) {
      const embedded = await pdf.embedPage(p);
      const target = pdf.addPage([W, H]);
      const scale = Math.min(CW / embedded.width, (H - 95) / embedded.height);
      target.drawPage(embedded, {
        x: M,
        y: 48,
        width: embedded.width * scale,
        height: embedded.height * scale,
      });
      target.drawText(attachment.ref.slice(0, 95), {
        x: M,
        y: H - 25,
        size: 8,
        font: regular,
        color: muted,
      });
    }
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText("TEST AUDIT — NOT PUBLISHED TO THE LIVE TRACKER", {
      x: M,
      y: 25,
      size: 7,
      font: bold,
      color: muted,
    });
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: W - 82,
      y: 25,
      size: 8,
      font: regular,
      color: muted,
    });
  });
  pdf.setTitle(`${doc.site.storeName} — Test H&S Audit`);
  pdf.setAuthor("KSS / Footasylum");
  pdf.setSubject(b.template.version);
  return Buffer.from(await pdf.save());
}
