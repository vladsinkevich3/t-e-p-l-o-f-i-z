import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function inspectClimatology() {
  const filePath = 'public/assets/aistudio/___2_04_04_2026___________________________74ec5669.pdf';
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  console.log('=== СП 2.04.04-2026 ===');
  console.log('Pages:', data.numpages);
  
  const lines = data.text.split('\n');
  console.log('Total text lines:', lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Гродно') || line.includes('Минск') || line.includes('Таблица 4.1') || line.includes('Таблица 4.2')) {
      console.log(`Line ${i}:`, lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 5)).join(' // '));
    }
  }
}

inspectClimatology().catch(console.error);
