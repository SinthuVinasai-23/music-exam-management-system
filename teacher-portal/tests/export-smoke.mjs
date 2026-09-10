import { writeFile, mkdir } from 'node:fs/promises';
import { exportPDF } from '../src/utils/export.js';
let blob;
// oxlint-disable-next-line typescript/no-deprecated -- Minimal browser DOM stub for a Node-only export check.
globalThis.document = { createElement: () => ({ click() {} }) };
URL.createObjectURL = value => { blob = value; return 'blob:test'; };
URL.revokeObjectURL = () => {};
exportPDF('Export Validation', Array.from({length:90},(_,i)=>`Candidate ${i+1} | Veena - Level 6 | Hall (A) | Registration \\${i}`));
await mkdir('test-results',{recursive:true});
await writeFile('test-results/export-validation.pdf', Buffer.from(await blob.arrayBuffer()));
console.log('Generated multi-page PDF with escaped content for external parser verification.');
