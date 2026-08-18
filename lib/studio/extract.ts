import ExcelJS from 'exceljs';
import { unzipSync, strFromU8 } from 'fflate';

/**
 * Conversion en texte des formats bureautiques que Claude ne lit pas
 * nativement (Excel, Word). Le résultat est ensuite transmis au modèle
 * comme du texte, ou stocké tel quel comme fiche de référence.
 */

export const XLSX_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export const DOCX_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function isSpreadsheet(fileType: string, fileName: string): boolean {
  return XLSX_TYPES.includes(fileType) || /\.(xlsx|xlsm|xls)$/i.test(fileName);
}

export function isWordDocument(fileType: string, fileName: string): boolean {
  return DOCX_TYPES.includes(fileType) || /\.docx$/i.test(fileName);
}

/** Rend une cellule Excel sous forme de texte lisible. */
function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toLocaleDateString('fr-FR');
    if ('text' in v && typeof v.text === 'string') return v.text;
    if ('result' in v) return String((v as { result: unknown }).result ?? '');
    if ('richText' in v) {
      return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('');
    }
    return '';
  }
  return String(v);
}

/**
 * Transforme un classeur en texte tabulé, feuille par feuille.
 * Le format tabulé conserve l'alignement des colonnes, ce qui aide le
 * modèle à relier une matière à son prix.
 */
export async function extractSpreadsheet(data: Buffer, maxChars = 150_000): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ArrayBuffer);

  const parts: string[] = [];
  let total = 0;

  for (const ws of wb.worksheets) {
    if (total >= maxChars) break;
    const lines: string[] = [`--- Feuille : ${ws.name} ---`];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => cells.push(cellText(cell).trim()));
      // Une ligne entièrement vide n'apporte rien au modèle.
      if (cells.some((c) => c !== '')) lines.push(cells.join('\t'));
    });
    const chunk = lines.join('\n');
    total += chunk.length;
    parts.push(chunk);
  }

  const text = parts.join('\n\n').slice(0, maxChars);
  if (!text.trim()) throw new Error('Classeur vide ou illisible');
  return text;
}

/** Extrait le texte d'un .docx (document.xml du paquet ZIP). */
export function extractWordDocument(data: Buffer, maxChars = 150_000): string {
  const files = unzipSync(new Uint8Array(data));
  const doc = files['word/document.xml'];
  if (!doc) throw new Error('Document Word illisible');

  const xml = strFromU8(doc);
  const text = xml
    // Les sauts de paragraphe et de ligne deviennent de vrais retours.
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br\s*\/>/g, '\n')
    .replace(/<w:tab\s*\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) throw new Error('Document Word vide');
  return text.slice(0, maxChars);
}

/**
 * Renvoie le texte d'un fichier bureautique, ou null si le format n'est
 * pas concerné (l'appelant transmet alors le fichier tel quel au modèle).
 */
export async function extractOfficeText(
  fileName: string,
  fileType: string,
  data: Buffer
): Promise<string | null> {
  if (isSpreadsheet(fileType, fileName)) return extractSpreadsheet(data);
  if (isWordDocument(fileType, fileName)) return extractWordDocument(data);
  return null;
}
