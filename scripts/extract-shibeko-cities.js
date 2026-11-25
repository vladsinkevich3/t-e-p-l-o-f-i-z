import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function extractShibeko() {
  const buf = fs.readFileSync('public/assets/aistudio/____________________________________2018_79a3b974.pdf');
  const parser = new PDFParse(new Uint8Array(buf));
  await parser.load();
  const res = await parser.getText();
  const text = res.text;

  // Search for Таблица 1.1
  const idx = text.indexOf('Таблица 1.1');
  console.log('Index of Таблица 1.1:', idx);
  if (idx !== -1) {
    console.log('Table 1.1 context:\n', text.slice(idx, idx + 4000));
  }
}

extractShibeko().catch(console.error);
