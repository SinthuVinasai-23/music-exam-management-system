import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function SignatureCanvas({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2926';
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  function point(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((event.clientY - rect.top) / rect.height) * canvasRef.current.height,
    };
  }

  function start(event) {
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setDrawing(true);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    onChange(canvasRef.current.toDataURL('image/png'), 'drawn');
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    onChange('', '');
  }

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result, 'uploaded');
    reader.readAsDataURL(file);
  }

  return (
    <div className="signature-block">
      <div className="signature-toolbar">
        <button type="button" onClick={clear}>Clear</button>
        <label className="upload-button">
          <Upload size={14} /> Upload
          <input type="file" accept="image/png,image/jpeg" onChange={upload} />
        </label>
      </div>
      <canvas
        ref={canvasRef}
        width="900"
        height="210"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => setDrawing(false)}
        onPointerLeave={() => setDrawing(false)}
        aria-label="Applicant e-signature canvas"
      />
      {!value && <span className="signature-placeholder">Sign Here</span>}
    </div>
  );
}
