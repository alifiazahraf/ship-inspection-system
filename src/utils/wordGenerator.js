// Word (.docx) generator for "Foto Temuan" report: finding text (NC) with before/after photos per ship.
// Layout follows the office template "Foto Temuan - Inspeksi MV <ship>.docx".
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';
import companyLogo from '../assets/images/company-logo.png';
import { parsePhotoUrls } from './photoUtils';

// Page geometry in twips (1/20 pt), copied from the template (US Letter)
const PAGE = { width: 12240, height: 15840, marginTop: 990, marginRight: 1440, marginBottom: 900, marginLeft: 990 };
const TABLE_WIDTH = 10887;
const TABLE_INDENT = -147;
const COLUMN_WIDTHS = [5358, 5529];
// Header: company block (logo + name) on the left, report title on the right
const HEADER_LEFT_WIDTH = 4100;
const LOGO_COLUMN_WIDTH = 800;

// Photo size inside a cell, in pixels (docx converts px at 96 dpi)
const PHOTO_MAX_WIDTH = 340;
const PHOTO_MAX_HEIGHT = 300;
// Source images are downscaled before embedding to keep the file small
const EMBED_MAX_DIMENSION = 1200;
const EMBED_JPEG_QUALITY = 0.8;

const BODY_FONT = 'Arial';
const TITLE_FONT = 'Times New Roman';

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load image'));
  img.src = src;
});

/**
 * Fetch an image and re-encode it as a downscaled JPEG.
 * @returns {Promise<{data: Uint8Array, width: number, height: number} | null>}
 */
const fetchPhotoForWord = async (url) => {
  let objectUrl;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    objectUrl = URL.createObjectURL(await response.blob());
    const img = await loadImage(objectUrl);

    const scale = Math.min(1, EMBED_MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', EMBED_JPEG_QUALITY));
    if (!blob) throw new Error('Failed to encode image');
    return { data: new Uint8Array(await blob.arrayBuffer()), width: img.width, height: img.height };
  } catch (error) {
    console.error('Error loading photo for Word:', url, error);
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};

const fitPhotoSize = ({ width, height }) => {
  const scale = Math.min(PHOTO_MAX_WIDTH / width, PHOTO_MAX_HEIGHT / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

const textParagraph = (text, options = {}) => new Paragraph({
  alignment: options.alignment,
  spacing: { after: 35 },
  children: [new TextRun({ text, font: BODY_FONT, ...options.run })]
});

// Item number typed into the finding text itself, e.g. "1.\t", "1. ", "10..", "12,.", "1)".
// (?!\d) keeps decimals like "3.5 meter" intact.
const LEADING_ITEM_NUMBER = /^\s*\d{1,3}\s*(?:\.\.?|,\.|\))(?!\d)\s*/;

/**
 * Normalize finding text for the Word caption: drop the typed item number (the caption
 * already carries the report number), collapse tabs/extra spaces, and split into lines.
 * @returns {string[]} non-empty caption lines
 */
export const formatFindingCaption = (text) => {
  const raw = text || '';
  const stripped = raw.replace(LEADING_ITEM_NUMBER, '');
  const body = stripped.trim() ? stripped : raw;
  return body.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
};

const captionParagraph = (number, text) => {
  const lines = formatFindingCaption(text);
  const runs = (lines.length ? lines : ['']).map((line, index) => new TextRun({
    text: index === 0 ? `${number}. ${line}` : line,
    font: BODY_FONT,
    break: index === 0 ? undefined : 1
  }));
  return new Paragraph({ spacing: { after: 35 }, children: runs });
};

const photoParagraphs = (photos) => {
  if (photos.length === 0) return [new Paragraph({})];
  return photos.map(photo => new Paragraph({
    keepNext: true,
    spacing: { after: 60 },
    children: photo
      ? [new ImageRun({ data: photo.data, transformation: fitPhotoSize(photo) })]
      : [new TextRun({ text: '(Foto gagal dimuat)', font: BODY_FONT, italics: true, color: '94A3B8' })]
  }));
};

const bodyCell = (children, columnIndex) => new TableCell({
  width: { size: COLUMN_WIDTHS[columnIndex], type: WidthType.DXA },
  children
});

const buildHeader = (shipTitle, logoData) => {
  const companyTextWidth = HEADER_LEFT_WIDTH - 200 - LOGO_COLUMN_WIDTH;
  const companyBlock = new Table({
    width: { size: HEADER_LEFT_WIDTH - 200, type: WidthType.DXA },
    columnWidths: [LOGO_COLUMN_WIDTH, companyTextWidth],
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDERS.top, insideVertical: NO_BORDERS.top },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: LOGO_COLUMN_WIDTH, type: WidthType.DXA },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              children: logoData
                ? [new ImageRun({ data: logoData, transformation: { width: 34, height: 45 } })]
                : []
            })]
          }),
          new TableCell({
            width: { size: companyTextWidth, type: WidthType.DXA },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: ['PT. PERUSAHAAN PELAYARAN', 'GURITA LINTAS SAMUDERA'].map(line => new Paragraph({
              children: [new TextRun({ text: line, font: TITLE_FONT, bold: true, size: 20, color: '1F3864' })]
            }))
          })
        ]
      })
    ]
  });

  const insaLine = new Paragraph({
    border: { top: { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 12, color: '000000', space: 1 } },
    children: [new TextRun({ text: 'MEMBER OF INSA NO. 246/INSA/VIII/1990', font: BODY_FONT, bold: true, size: 16 })]
  });

  const titleParagraphs = ['Hasil Temuan Inspeksi', shipTitle].map(line => new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: line, font: TITLE_FONT, bold: true, size: 40 })]
  }));

  return new Header({
    children: [
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        indent: { size: TABLE_INDENT, type: WidthType.DXA },
        columnWidths: [HEADER_LEFT_WIDTH, TABLE_WIDTH - HEADER_LEFT_WIDTH],
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: HEADER_LEFT_WIDTH, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [companyBlock, insaLine]
              }),
              new TableCell({
                width: { size: TABLE_WIDTH - HEADER_LEFT_WIDTH, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: titleParagraphs
              })
            ]
          })
        ]
      }),
      new Paragraph({})
    ]
  });
};

const buildFooter = () => {
  const run = { font: 'Arial Narrow', italics: true, size: 20 };
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE.width - PAGE.marginLeft - PAGE.marginRight }],
        children: [
          new TextRun({ ...run, children: ['pg. ', PageNumber.CURRENT] }),
          new TextRun({ ...run, text: '\tDPA Dept uncontrolled document' })
        ]
      })
    ]
  });
};

const loadLogo = async () => {
  try {
    const response = await fetch(companyLogo);
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.error('Error loading company logo for Word:', error);
    return null;
  }
};

export const getShipTitle = (shipName = '') => {
  const name = shipName.trim().toUpperCase();
  return /^M[VT][.\s]/.test(name) ? name : `MV. ${name}`;
};

/**
 * Build the "Foto Temuan" Word document.
 * @param {Object} params
 * @param {Object} params.ship - selected ship (ship_name)
 * @param {Array} params.findings - findings to include; uses displayNo when present
 * @param {Function} [params.onProgress] - called with (doneCount, totalCount) after each finding's photos load
 * @returns {Promise<Blob>}
 */
export const generateFindingPhotosWord = async ({ ship, findings, onProgress }) => {
  const shipTitle = getShipTitle(ship.ship_name);
  const logoData = await loadLogo();

  const rows = [
    new TableRow({
      tableHeader: true,
      children: ['Sebelum dikerjakan', 'Setelah dikerjakan'].map((label, index) =>
        bodyCell([textParagraph(label, { alignment: AlignmentType.CENTER })], index)
      )
    })
  ];

  // Load photos finding by finding to limit concurrent downloads
  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i];
    const [beforePhotos, afterPhotos] = await Promise.all([
      Promise.all(parsePhotoUrls(finding.before_photo).map(fetchPhotoForWord)),
      Promise.all(parsePhotoUrls(finding.after_photo).map(fetchPhotoForWord))
    ]);

    rows.push(
      new TableRow({
        cantSplit: true,
        children: [bodyCell(photoParagraphs(beforePhotos), 0), bodyCell(photoParagraphs(afterPhotos), 1)]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          bodyCell([captionParagraph(finding.displayNo ?? finding.no, finding.finding)], 0),
          bodyCell([new Paragraph({})], 1)
        ]
      })
    );

    if (onProgress) onProgress(i + 1, findings.length);
  }

  const doc = new Document({
    creator: 'Ship Inspection System',
    title: `Foto Temuan - Inspeksi ${shipTitle}`,
    styles: { default: { document: { run: { font: BODY_FONT, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: {
              top: PAGE.marginTop,
              right: PAGE.marginRight,
              bottom: PAGE.marginBottom,
              left: PAGE.marginLeft,
              header: 720,
              footer: 720
            }
          }
        },
        headers: { default: buildHeader(shipTitle, logoData) },
        footers: { default: buildFooter() },
        children: [
          new Table({
            width: { size: TABLE_WIDTH, type: WidthType.DXA },
            indent: { size: TABLE_INDENT, type: WidthType.DXA },
            columnWidths: COLUMN_WIDTHS,
            layout: TableLayoutType.FIXED,
            rows
          })
        ]
      }
    ]
  });

  return Packer.toBlob(doc);
};
