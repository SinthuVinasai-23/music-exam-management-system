// A dependency-free text PDF writer. The built-in font is ASCII; records are normalized before export.
export function exportPDF(title, lines) {
  const clean = (value) =>
    String(value)
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/([\\()])/g, '\\$1');
  const wrapped = lines.flatMap(
    (line) => String(line).match(/.{1,92}(?:\s|$)|.{1,92}/g) || [''],
  );
  const pages = [];
  for (let i = 0; i < Math.max(1, wrapped.length); i += 38)
    pages.push(wrapped.slice(i, i + 38));
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const ids = [];
  pages.forEach((page, index) => {
    const pageId = objects.length + 1,
      contentId = pageId + 1;
    ids.push(pageId);
    const stream =
      `BT /F1 17 Tf 45 795 Td (${clean(title)}) Tj /F1 10 Tf 0 -28 Td (${clean('Music Examination | Teacher Portal | Frontend demo')}) Tj 0 -30 Td ` +
      page.map((line) => `(${clean(line)}) Tj 0 -17 Td`).join(' ') +
      ` 0 -15 Td (Page ${index + 1} of ${pages.length}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${ids.map((id) => `${id} 0 R`).join(' ')}] /Count ${ids.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => `${String(n).padStart(10, '0')} 00000 n \n`)
      .join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replaceAll(' ', '-')}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
