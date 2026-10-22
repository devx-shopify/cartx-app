// CSV format for upsell product-rule import/export. Pure (no server deps) so
// it can be unit tested and used on either side.
//
//   trigger,recommendation_1,recommendation_2,...
//   k9-botoplexx-shampoo,k9-conditioner,k9-masque,
//
// A cell identifies a product by handle (recommended), numeric product id,
// gid://shopify/Product/… or a product URL (…/products/<handle>). Columns whose
// header ends in "_title" (and any other unknown column) are ignored, so an
// export can carry readable titles and still re-import unchanged.

export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

/** RFC 4180-ish parser: quoted fields, "" escapes, commas and newlines inside
 *  quotes, CRLF or LF line endings, optional UTF-8 BOM. Returns string[][]. */
export function parseCsv(text) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export function parseIdentifier(cell) {
  const raw = String(cell || "").trim();
  if (!raw) return null;
  const gid = raw.match(/^gid:\/\/shopify\/Product\/(\d+)$/i);
  if (gid) return { kind: "id", value: gid[1] };
  if (/^\d+$/.test(raw)) return { kind: "id", value: raw };
  const url = raw.match(/\/products\/([^/?#]+)/i);
  if (url) return { kind: "handle", value: decodeURIComponent(url[1]).toLowerCase() };
  return { kind: "handle", value: raw.toLowerCase() };
}

export const identifierKey = (ident) => `${ident.kind}:${ident.value}`;

export function readImportRows(table) {
  if (!table.length) return { error: "The file is empty.", rows: [] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const triggerCol = header.indexOf("trigger");
  if (triggerCol === -1) {
    return { error: 'The first row must be a header with a "trigger" column (download the sample to see the format).', rows: [] };
  }
  const recCols = header
    .map((h, i) => ({ h, i, n: Number((h.match(/^recommendation_(\d+)$/) || [])[1]) }))
    .filter((c) => c.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((c) => c.i);
  if (recCols.length === 0) {
    return { error: 'The header needs at least one "recommendation_1" column.', rows: [] };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { error: `The file has ${table.length - 1} rows; the limit is ${MAX_IMPORT_ROWS}.`, rows: [] };
  }
  const rows = table.slice(1).map((cells, idx) => ({
    line: idx + 2, // spreadsheet row number (header is row 1)
    triggerRaw: (cells[triggerCol] || "").trim(),
    trigger: parseIdentifier(cells[triggerCol]),
    recs: recCols
      .map((i) => ({ raw: (cells[i] || "").trim(), ident: parseIdentifier(cells[i]) }))
      .filter((r) => r.ident),
  }));
  return { rows };
}
