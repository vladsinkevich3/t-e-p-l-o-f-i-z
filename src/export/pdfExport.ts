/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Экспорт академического расчетно-пояснительного отчета в PDF
 * согласно требованиям ГОСТ 2.105-95
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FullCourseworkCalculation } from '../logic/calculations';

export async function exportReportToPdf(elementId: string, calc: FullCourseworkCalculation): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    // Если элемента нет в DOM, запускаем стандартную печать
    window.print();
    return;
  }

  // Создаем PDF в формате A4 книжной ориентации
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const canvas = await html2canvas(element, {
    scale: 2, // повышенная четкость для печати
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const imgWidth = 210; // A4 ширина в мм
  const pageHeight = 297; // A4 высота в мм
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  // Первая страница
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Последующие страницы
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const fileName = `Пояснительная_записка_Теплофизика_${calc.cipher.cityCode}_${calc.cipher.wallCode}.pdf`;
  pdf.save(fileName);
}
