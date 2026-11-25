import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function parseClimatology() {
  const buf = fs.readFileSync('public/assets/aistudio/___2_04_04_2026___________________________74ec5669.pdf');
  const parser = new PDFParse(new Uint8Array(buf));
  await parser.load();
  const text = (await parser.getText()).text;

  // Let's print Table 4.1 section
  const t41_idx = text.indexOf('Таблица 4.1');
  const t42_idx = text.indexOf('Таблица 4.2');
  const t43_idx = text.indexOf('Таблица 4.3');
  const t44_idx = text.indexOf('Таблица 4.4');
  const t45_idx = text.indexOf('Таблица 4.5');
  const t46_idx = text.indexOf('Таблица 4.6');

  console.log('=== TABLE 4.1 (first 2500 chars) ===');
  console.log(text.slice(t41_idx, t41_idx + 2500));

  console.log('=== TABLE 4.2 (first 2500 chars) ===');
  console.log(text.slice(t42_idx, t42_idx + 2500));

  console.log('=== TABLE 4.5 (first 2000 chars) ===');
  console.log(text.slice(t45_idx, t45_idx + 2000));
}

parseClimatology().catch(console.error);
