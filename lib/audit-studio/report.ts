import { questionEarned, staffDeduction, effectiveResponse, interviewEntries, isInterviewDerived } from "./staff-interviews";
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
  options: { presentation?: boolean } = {},
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
  const sectionHeading = (title: string, detail = "", minimumSpace = 100, detailColor = green) => {
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
        detailColor,
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
    const awarded = questionEarned(b.audit.document, b.template, q.id, q.weight);
    const partial = awarded > 0 && awarded < q.weight;
    const label = partial ? "Partial" :
      !r.answer ? "Unanswered" : r.answer === "no"
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
      r.answer === "no" && !partial ? y - (height - 5) / 2 - 3 : y - 16,
      10,
      bold,
      rgb(1, 1, 1),
    );
    const points =
      r.answer === "na"
        ? "Excluded"
        : `${awarded} / ${q.weight} points`;
    if (r.answer !== "no" || partial)
      line(
        points,
        W - M - 52.5 - regular.widthOfTextAtSize(points, 8) / 2,
        y - 28,
        8,
        regular,
        rgb(1, 1, 1),
      );
    y -= height + 9;
  };
  const interviews = (questionId: string, summary = false) => {
    for (const { staff, index, prompt, answer } of interviewEntries(doc, b.template, questionId)) {
      const assessment = interviewAssessment(answer, prompt.id);
      const outcome = assessment === "gap" ? (answer.gapSeverity === "minor" ? "Minor omission" : answer.gapSeverity === "incorrect" ? "Incorrect answer" : answer.gapSeverity === "unsafe" ? "Unsafe demonstration" : "Gap identified") : assessment === "understood" ? "Understood" : assessment === "not-applicable" ? "Not applicable" : "Not assessed";
      const who = staff.colleague || `Colleague ${index + 1}`;
      if (summary || prompt.questionId !== questionId) {
        paragraph(`${who} · ${prompt.title}: ${outcome}. Full interview at ${prompt.questionId}.`, 9, regular, assessment === "gap" ? red : muted);
        continue;
      }
      const previousFlow = flowTitle;
      flowTitle = `Staff interview / check ${questionId}`;
      const interviewSpace = (height: number) => {
        if (y - height < 55) {
          newPage(`${flowTitle} — continued`);
          paragraph(`${who} · ${prompt.title}`, 9, bold);
        }
      };
      const questionLines = wrap(answer.asked || "Question not recorded", 9.5, bold, CW - 28);
      const reply = answer.reply || "No separate spoken answer recorded. See the observed demonstration below.";
      const replyLines = wrap(reply, 10, regular, CW - 28);
      // Keep the speaker, question and answer together for normal-length interviews.
      ensure(Math.min(570, 105 + questionLines.length * 14 + replyLines.length * 14));
      sectionHeading(`STAFF INTERVIEW · ${questionId}`, outcome, 0, assessment === "gap" ? red : assessment === "understood" ? green : muted);
      paragraph(who, 10, bold);
      if (staff.role) paragraph(`${staff.role} · ${prompt.title}`, 8.5, regular, muted);
      const interviewBox = (label: string, text: string, answerBox = false) => {
        const size = answerBox ? 10 : 9.5, font = answerBox ? regular : bold;
        const lines = wrap(text, size, font, CW - 28);
        let offset = 0;
        while (offset < lines.length) {
          const labelLines = wrap(`${label}${offset ? " (CONTINUED)" : ""}`, 7.5, bold, CW - 28);
          const extraLabel = (labelLines.length - 1) * 10;
          interviewSpace(65 + extraLabel);
          const count = Math.max(1, Math.min(lines.length - offset, Math.floor((y - 55 - 39 - extraLabel) / 14)));
          const height = count * 14 + 33 + extraLabel;
          page.drawRectangle({x: M, y: y - height, width: CW, height,
            color: answerBox ? rgb(0.94, 0.96, 0.99) : paper});
          page.drawRectangle({x: M, y: y - height, width: 3, height,
            color: answerBox ? rgb(0.25, 0.40, 0.59) : green});
          labelLines.forEach((v, i) => line(v, M + 14, y - 14 - i * 10, 7.5, bold, muted));
          lines.slice(offset, offset + count).forEach((value, i) => line(value, M + 14, y - 31 - extraLabel - i * 14, size, font));
          y -= height + 7;
          offset += count;
        }
      };
      interviewBox("QUESTION ASKED", answer.asked || "Question not recorded");
      interviewBox(`${who} — ${staff.role || "Staff"} — answer`, reply, true);
      if (answer.practical) {
        y -= 9;
        interviewSpace(105);
        paragraph("AUDITOR'S OBSERVATIONS", 8, bold, muted);
        detailRow("Task demonstrated", answer.practical.context);
        detailRow("Reference checked", answer.practical.reference);
        y -= 7;
        const definition = practicalDefinition(prompt.id, answer.practical.version);
        for (const criterion of definition?.criteria || []) {
          const check = answer.practical.checks[criterion.id];
          const label = check?.result === "met" ? "Correct" : check?.result === "gap" ? "Missed" : check?.result === "na" ? "N/A" : "Not observed";
          const lines = wrap(criterion.label, 8.5, regular, CW - 86);
          const notes = check?.note ? wrap(check.note, 8, regular, CW - 86) : [];
          interviewSpace(Math.min(550, lines.length * 12 + notes.length * 12 + 22));
          line(label, M + 8, y - 9, 8, bold, check?.result === "gap" ? red : check?.result === "met" ? green : muted);
          for (const value of lines) {
            interviewSpace(15);
            line(value, M + 78, y - 9, 8.5);
            y -= 12;
          }
          for (const value of notes) {
            interviewSpace(15);
            line(value, M + 78, y - 9, 8, regular, muted);
            y -= 12;
          }
          y -= 7;
          divider();
        }
      }
      if (answer.outcome) {
        interviewSpace(70);
        interviewBox("AUDITOR'S ASSESSMENT / FOLLOW-UP", answer.outcome, true);
      }
      y -= 8;
      flowTitle = previousFlow;
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
      const label = options.presentation
        ? `Photo ${e.file_name.match(/photo-(\d+)/)?.[1] || ""} · ${questionId}`
        : `${questionId} / ${e.id.slice(0, 8)} · ${e.file_name}`;
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
  newPage(options.presentation ? "Proposed Health & Safety Audit" : "Health & Safety Audit");
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
    options.presentation && !unverifiedCount ? `${failedCount} ${failedCount === 1 ? "finding" : "findings"} requiring action` : `${failedCount} failed checks · ${unverifiedCount} not verified`,
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
  if (!options.presentation) detailRow("Template version", b.template.version);
  if (b.audit.parent_id) detailRow("Revision of", b.audit.parent_id);
  y -= 12;
  heading("Result");
  paragraph(
    score.reasons.length
      ? score.reasons.join("\n")
      : options.presentation
        ? "Meets the overall pass mark and core-section targets. Complete the recorded actions."
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
        r?.answer === "no" || staffDeduction(b.audit.document, b.template, q.id, q.weight) > 0 || (r?.answer && r.answer !== "na" && !r.verified)
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
    if (sectionScore.core && !options.presentation)
      paragraph("Core section · 70% target", 8, regular, muted);
    if (s.page === 3) {
      const hasManager = MANAGER_QUESTION_GROUPS.some(g => g.questions.some(q =>
        !["staff", "maxStaff", "youngPersons", "responsibilities"].includes(q.key) && doc.site[q.key]?.trim(),
      ));
      paragraph(`Floors: ${doc.site.floors || "Not recorded"}    ·    Area: ${doc.site.area ? `${doc.site.area} ${doc.site.areaUnit}` : "Not recorded"}    ·    Exits: ${doc.site.exits || "Not recorded"}`, 9);
      if (hasManager) {
        if (!options.presentation) paragraph("Manager's answers; verify against records and independent staff checks.", 8, regular, muted);
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
      if (!options.presentation && isInterviewDerived(doc, q.id)) paragraph(r.answer === "na" ? "Not sampled this visit; excluded from the score." : "Answer calculated from the recorded staff interviews.", 8, regular, muted);
      const notes = responseNotes(r);
      const managerNotes = managerReferenceNotes(doc.site, q.id);
      if (managerNotes && !options.presentation) paragraph("Manager's arrangements: see the Store manager Q&A in section 03.", 8, regular, muted);
      if (notes) paragraph(notes);
      if (q.id === "16.03") for (const review of doc.previousActionReviews || []) {
        ensure(100);
        sectionHeading(`${review.kind} · ${review.date || "Previous visit"}`, review.outcome === "improved" ? "Improved" : review.outcome === "not-improved" ? "Not improved" : review.outcome === "not-applicable" ? "Not applicable" : "Not checked", 0);
        paragraph(review.title, 9, bold);
        if (review.detail && review.detail !== review.title) paragraph(review.detail, 9);
        if (review.note) detailRow("Review at this visit", review.note);
      }
      interviews(q.id);
      if (r.answer === "na") paragraph(`Reason: ${r.naReason}`);
      if (r.answer === "no" || staffDeduction(b.audit.document, b.template, q.id, q.weight) > 0)
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
    p.drawText(options.presentation ? "KSS / FOOTASYLUM · PROPOSED AUDIT" : doc.purpose === "store" ? "KSS / FOOTASYLUM · HEALTH & SAFETY AUDIT" : "TEST AUDIT — NOT PUBLISHED TO THE LIVE TRACKER", {
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
  pdf.setTitle(`${doc.site.storeName} — ${options.presentation ? "Proposed H&S Audit" : "H&S Audit"}`);
  pdf.setAuthor("KSS / Footasylum");
  pdf.setSubject(b.template.version);
  return Buffer.from(await pdf.save());
}
