export function downloadCsv(filename, rows) {
  const keys = Object.keys(rows[0] || {});
  const escape = value => {
    const text = String(value ?? '');
    return '"' + (/^[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
  };
  const csv = [keys, ...rows.map(row => keys.map(key => row[key]))].map(row => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
