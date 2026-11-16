export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const cell = (value: string | number) => {
    let text = String(value);
    if (/^[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const blob = new Blob(
    ['\uFEFF' + [headers, ...rows].map((row) => row.map(cell).join(';')).join('\r\n')],
    { type: 'text/csv;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
