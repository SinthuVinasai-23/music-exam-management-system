export function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function subjectFee(grade) {
  const table = {
    'Grade 1': 110,
    'Grade 2': 150,
    'Grade 3': 190,
    'Grade 4': 235,
    'Grade 5': 285,
    Diploma: 425,
  };
  return table[grade] || 0;
}

export function classify(score) {
  if (score >= 90) return 'Distinction';
  if (score >= 75) return 'Merit';
  if (score >= 60) return 'Pass';
  return 'Review';
}

export function validateName(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Full name is required.';
  if (!/^[A-Za-z][A-Za-z\s'-]{1,78}[A-Za-z]$/.test(trimmed)) return 'Use letters, spaces, apostrophes, or hyphens only.';
  return '';
}

export function parseDob(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return { error: 'Use MM/DD/YYYY format.' };
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return { error: 'Month must be between 01 and 12.' };
  const days = new Date(year, month, 0).getDate();
  if (day < 1 || day > days) return { error: 'Day is not valid for that month.' };
  const date = new Date(year, month - 1, day);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (date > today) return { error: 'Date of birth cannot be in the future.' };
  let age = today.getFullYear() - year;
  const birthdayPassed = today.getMonth() > month - 1 || (today.getMonth() === month - 1 && today.getDate() >= day);
  if (!birthdayPassed) age -= 1;
  if (age < 6) return { error: 'Candidate must be at least 6 years old.' };
  return { date, age };
}

export function formatDobInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function validateCardNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{13,19}$/.test(digits)) return 'Enter a 13 to 19 digit card number.';
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0 ? '' : 'Card number is not valid.';
}

export function validateExpiry(value) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!match) return 'Use MM / YY format.';
  const month = Number(match[1]);
  if (month < 1 || month > 12) return 'Expiry month must be 01 to 12.';
  const year = 2000 + Number(match[2]);
  const expiry = new Date(year, month, 0, 23, 59, 59);
  if (expiry < new Date()) return 'Card is expired.';
  return '';
}

export function makePdfDownload(filename, lines) {
  try {
    const clean = lines.map((line) => String(line).replace(/[()\\]/g, ''));
    const content = clean.map((line, index) => `BT /F1 13 Tf 54 ${760 - index * 22} Td (${line}) Tj ET`).join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += `${obj}\n`;
    });
    const xrefAt = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function todayLabel() {
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date());
}
