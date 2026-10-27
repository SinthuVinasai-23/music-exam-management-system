import { useState } from 'react';
export default function StudentPhoto({ value, onChange }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP photo up to 5 MB.'); return; }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(image.width * scale)); canvas.height = Math.max(1,Math.round(image.height * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      onChange(canvas.toDataURL('image/jpeg', .8));
    } catch { setError('Unable to read this photo. Please choose another image.'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }
  return <section className="student-photo-upload">
    <h3>Student Photo</h3><p>Upload a clear photo of the student. JPG, PNG or WebP, up to 5 MB.</p>
    {value && <img className="student-photo-preview" src={value} alt="Student photo preview" />}
    <label className="upload-button">{busy ? 'Loading photo…' : value ? 'Replace Photo' : 'Upload Photo'}<input aria-label="Student Photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload} /></label>
    {value && <button className="student-outline-btn" type="button" onClick={() => onChange('')}>Remove Photo</button>}
    {error && <p className="student-error" role="alert">{error}</p>}
  </section>;
}
