// Extracción de texto plano desde documentos subidos.
// Soporta .docx (mammoth), .pdf (pdf-parse) y .txt/.md.

export async function extractText(buffer, mimetype, originalname) {
  const ext = (originalname.split('.').pop() || '').toLowerCase();

  if (ext === 'docx' || mimetype.includes('wordprocessingml')) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (ext === 'pdf' || mimetype === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === 'txt' || ext === 'md' || mimetype.startsWith('text/')) {
    return buffer.toString('utf8');
  }

  throw new Error(`Formato no soportado: .${ext || mimetype}`);
}
