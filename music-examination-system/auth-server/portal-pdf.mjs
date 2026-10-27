import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { fileURLToPath } from "node:url";
export function applicationPdf(app) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        bufferPages: true,
        info: {
          Title: `Examination Application ${app.id}`,
          Author: "ICFA Music Examinations",
        },
      }),
      chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont(
      "Latin",
      fileURLToPath(
        new URL(
          "../node_modules/@fontsource/noto-sans-tamil/files/noto-sans-tamil-latin-400-normal.woff",
          import.meta.url,
        ),
      ),
    );
    doc.registerFont(
      "Tamil",
      fileURLToPath(
        new URL(
          "../node_modules/@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff",
          import.meta.url,
        ),
      ),
    );
    doc.font("Latin");
    const originalText = doc.text.bind(doc);
    doc.text = (value, ...args) => {
      const text = String(value);
      if (!/[\u0B80-\u0BFF]/.test(text)) {
        doc.font("Latin");
        return originalText(text, ...args);
      }
      const runs = text.match(/[\u0B80-\u0BFF]+|[^\u0B80-\u0BFF]+/g);
      const options = typeof args[0] === "object" ? args[0] : {};
      runs.forEach((run, index) => {
        doc.font(/[\u0B80-\u0BFF]/.test(run) ? "Tamil" : "Latin");
        originalText(run, { ...options, continued: index < runs.length - 1 });
      });
      return doc;
    };
    const header = () => {
      doc.fillColor("#7d0c0c").fontSize(24).text("ICFA", 48, 40);
      doc.fillColor("#6b685b").fontSize(9).text("MUSIC EXAMINATIONS");
      doc.moveTo(48, 98).lineTo(547, 98).strokeColor("#e8a3a3").stroke();
      doc
        .fillColor("#6b685b")
        .fontSize(9)
        .text(app.id + " | " + app.studentId, 365, 52, {
          width: 182,
          align: "right",
        });
      doc.x = 48;
      doc.y = 118;
    };
    header();
    doc
      .fillColor("#24251f")
      .fontSize(18)
      .text(app.documentTitle || "Examination Application");
    doc
      .fontSize(10)
      .fillColor("#68665d")
      .text(app.id + "  |  " + app.session);
    doc.moveDown();
    for (const [label, value] of [
      ["Student Name", app.candidateName || `${app.firstName} ${app.lastName}`],
      ["Student First Name", app.firstName],
      ["Student Last Name", app.lastName],
      ["Student ID", app.studentId],
      ["Preferred Medium", app.preferredMedium],
      ["Preferred Examination Location", app.preferredLocation || "Not selected"],
      ["Application Date", app.applicationDate.slice(0, 10)],
      [
        "Status",
        app.applicationStatus === "pending"
          ? "Pending Teacher Approval"
          : app.applicationStatus,
      ],
    ]) {
      doc.fillColor("#24251f").text(`${label}: ${value}`, { width: 499 });
      doc.moveDown(0.3);
    }
    doc.moveDown();
    doc.fontSize(13).text("Selected examinations");
    doc.moveDown(0.5);
    for (const entry of app.entries) {
      if (doc.y > (app.markingSheet ? 540 : 710)) {
        doc.addPage();
        header();
      }
      doc
        .fillColor("#7d0c0c")
        .fontSize(12)
        .text(`${entry.subject} — ${entry.grade}`, { width: 499 });
      doc
        .fillColor("#33332d")
        .fontSize(10)
        .text(`Teacher: ${entry.teacher}`, { width: 499 });
      doc
        .fillColor("#68665d")
        .text(`School: ${entry.teacherSchool}`, { width: 499 });
      doc.text(
        `Approval: ${entry.approvalStatus === "pending" ? "Pending Teacher Approval" : entry.approvalStatus}`,
      );
      if (entry.reviewNote)
        doc.text("Review note: " + entry.reviewNote, { width: 499 });
      if (app.markingSheet) {
        doc.moveDown(0.6);
        doc.fillColor("#242424").text("Theory Marks (out of 100): ____________________");
        doc.moveDown(0.5).text("Practical Marks (out of 100): _________________");
        doc.moveDown(0.5).text("Average Marks: _____________________________");
        doc.moveDown(0.5).text("Examiner Name / Signature: __________________");
        doc.moveDown(0.5).text("Date: _____________________________________");
      }
      doc.moveDown(0.8);
    }
    if (doc.y > 705) {
      doc.addPage();
      header();
    }
    doc
      .fontSize(9)
      .fillColor("#68665d")
      .text(
        app.markingSheet ? "For examiner completion. Record theory and practical marks out of 100. Average = (Theory + Practical) / 2." : app.admissionQR ? "Approved admission card. Present this card at your examination. Slots are assigned by the admin." : "Submission is subject to teacher approval. Examination access remains unavailable until all required approvals are complete.",
        { width: 499 },
      );
    if (app.admissionQR) {
      if (doc.y > 450) { doc.addPage(); header(); }
      const top = doc.y + 15;
      const qr = app.admissionQR.modules, unit = 280 / (qr.size + 8);
      doc.save().fillColor("#ffffff").rect(48, top, 280, 280).fill();
      doc.fillColor("#000000");
      for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
        if (qr.get(y, x)) doc.rect(48 + (x + 4) * unit, top + (y + 4) * unit, unit, unit).fill();
      }
      doc.restore();
      doc.fontSize(10).fillColor("#24251f").text("Scan for admission details", 345, top + 30, {width: 190});
      doc.fontSize(9).text("Student identity, application, subjects, levels, teachers, approval and scheduling details are included in this QR code.", 345, top + 60, {width: 190});
      doc.text("Examination date, time and venue will be assigned by the admin.", 345, top + 150, {width: 190});
    }
    const pages = doc.bufferedPageRange();
    for (let page = pages.start; page < pages.start + pages.count; page++) {
      doc.switchToPage(page);
      doc.page.margins.bottom = 25;
      doc
        .fillColor("#888477")
        .fontSize(8)
        .text("ICFA Music Examinations", 48, 806, { width: 350 });
      doc.text(`Page ${page + 1} of ${pages.count}`, 440, 806, {
        width: 107,
        align: "right",
      });
    }
    doc.end();
  });
}

export function admissionPayload(app) {
  return {
    document: "ICFA Admission Card", version: 1,
    applicationId: app.id, studentId: app.studentId,
    studentName: app.candidateName || `${app.firstName} ${app.lastName}`,
    firstName: app.firstName, lastName: app.lastName,
    session: app.session, medium: app.preferredMedium, preferredLocation: app.preferredLocation || "Not selected",
    applicationDate: app.applicationDate, updatedAt: app.updatedAt,
    status: app.applicationStatus,
    examinations: app.entries.map(e => ({subject: e.subject, level: e.grade,
      teacher: e.teacher, school: e.teacherSchool, approval: e.approvalStatus,
      approvedAt: e.teacherApprovalDate,
      date: e.examDate || "Awaiting admin assignment",
      time: e.examTime || "Awaiting admin assignment",
      venue: e.examVenue || "Awaiting admin assignment"})),
  };
}
export async function admissionPdf(app) {
  const admissionQR = QRCode.create(app.qrUrl || JSON.stringify(admissionPayload(app)), {errorCorrectionLevel: "M"});
  return applicationPdf({...app, documentTitle: "Examination Admission Card", admissionQR});
}
