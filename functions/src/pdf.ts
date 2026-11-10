/**
 * Generador mínimo de documentos PDF (sin dependencias externas).
 *
 * Soporta una página A4 con líneas de texto en Helvetica / Helvetica-Bold
 * (codificación WinAnsi, compatible con acentos del español).
 * Se utiliza para generar las facturas de cuotas que se adjuntan por mail.
 */

export interface PdfText {
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
}

const PAGE_WIDTH = 595.28; // A4 en puntos
const PAGE_HEIGHT = 841.89;

function pdfEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/** Convierte un número a texto alineado a la derecha en el ancho indicado. */
export function rightAlign(text: string, endX: number): number {
  // Ancho aproximado del carácter en Helvetica: ~0.5 * tamaño (12pt por defecto).
  return Math.max(0, endX - text.length * 6);
}

export function buildPdf(texts: PdfText[]): Buffer {
  const content = texts
    .map((item) => {
      const font = item.bold ? 'F2' : 'F1';
      return `BT /${font} ${item.size} Tf ${item.x} ${item.y} Td (${pdfEscape(item.text)}) Tj ET`;
    })
    .join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('');
  pdf += `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

export interface FacturaItem {
  descripcion: string;
  vencimiento: string;
  importe: number;
}

export function formatMoney(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-AR')}`;
}

/**
 * Construye la factura mensual de un padre con el detalle de composición
 * del total a abonar por sus hijos.
 */
export function buildFacturaPdf(opts: {
  periodo: string;
  padreNombre: string;
  padreEmail: string;
  items: FacturaItem[];
  total: number;
  pagado: number;
  saldo: number;
  facturaNumero: string;
}): Buffer {
  const margin = 50;
  const rightEdge = PAGE_WIDTH - margin;
  const texts: PdfText[] = [];

  let y = PAGE_HEIGHT - 60;
  texts.push({
    text: 'Educar para Transformar',
    x: margin,
    y,
    size: 18,
    bold: true,
  });
  y -= 18;
  texts.push({
    text: 'Centro Educativo - Factura de Cuotas',
    x: margin,
    y,
    size: 10,
  });
  y -= 22;
  texts.push({
    text: `Factura N°: ${opts.facturaNumero}`,
    x: margin,
    y,
    size: 11,
    bold: true,
  });
  texts.push({
    text: `Período: ${opts.periodo}`,
    x: rightEdge - 140,
    y,
    size: 11,
    bold: true,
  });

  y -= 26;
  texts.push({ text: 'Datos del tutor', x: margin, y, size: 12, bold: true });
  y -= 16;
  texts.push({ text: `Nombre: ${opts.padreNombre}`, x: margin, y, size: 10 });
  y -= 14;
  texts.push({ text: `Correo: ${opts.padreEmail}`, x: margin, y, size: 10 });

  y -= 26;
  texts.push({
    text: 'Detalle de la composición del total a abonar',
    x: margin,
    y,
    size: 12,
    bold: true,
  });

  y -= 8;
  const tableTop = y;
  texts.push({ text: 'Concepto', x: margin, y: tableTop, size: 9, bold: true });
  texts.push({ text: 'Vencimiento', x: 340, y: tableTop, size: 9, bold: true });
  texts.push({ text: 'Importe', x: 470, y: tableTop, size: 9, bold: true });

  y = tableTop - 6;
  texts.push({ text: '_'.repeat(105), x: margin, y, size: 9 });

  y -= 16;
  for (const item of opts.items) {
    if (y < 140) break; // Límite de una página.
    texts.push({ text: item.descripcion.slice(0, 58), x: margin, y, size: 10 });
    texts.push({ text: item.vencimiento, x: 340, y, size: 10 });
    texts.push({
      text: formatMoney(item.importe),
      x: rightAlign(formatMoney(item.importe), rightEdge),
      y,
      size: 10,
    });
    y -= 15;
  }

  y -= 10;
  texts.push({ text: '_'.repeat(105), x: margin, y, size: 9 });

  y -= 20;
  texts.push({ text: 'Total del período', x: margin, y, size: 11, bold: true });
  texts.push({
    text: formatMoney(opts.total),
    x: rightAlign(formatMoney(opts.total), rightEdge),
    y,
    size: 11,
    bold: true,
  });
  y -= 16;
  texts.push({ text: 'Ya abonado', x: margin, y, size: 11 });
  texts.push({
    text: formatMoney(opts.pagado),
    x: rightAlign(formatMoney(opts.pagado), rightEdge),
    y,
    size: 11,
  });
  y -= 16;
  texts.push({ text: 'Saldo a abonar', x: margin, y, size: 11, bold: true });
  texts.push({
    text: formatMoney(opts.saldo),
    x: rightAlign(formatMoney(opts.saldo), rightEdge),
    y,
    size: 11,
    bold: true,
  });

  y -= 40;
  texts.push({
    text: 'Gracias por confiar en Educar para Transformar.',
    x: margin,
    y,
    size: 9,
  });

  return buildPdf(texts);
}
