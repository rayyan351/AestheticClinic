type CSVValue = string | number | boolean | null | undefined;

export function exportToCSV<T extends Record<string, CSVValue>>(rows: T[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);

  const escape = (v: CSVValue) => {
    const s = v == null ? "" : String(v);
    const needsQuotes = /[",\n]/.test(s);
    const cleaned = s.replace(/"/g, '""');
    return needsQuotes ? `"${cleaned}"` : cleaned;
  };

  const csv =
    headers.join(",") + "\n" +
    rows.map(r => headers.map(h => escape(r[h])).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
