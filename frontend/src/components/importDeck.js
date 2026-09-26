import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { parseVocabulary } from './parseVocabulary';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function importDeck(file, report) {
  const extension = file.name.split('.').pop().toLowerCase();
  let worker;
  let pdf;
  const recognize = async image => {
    if (!worker) {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng+kor', 1, { logger: info => {
        if (info.status === 'recognizing text') report('문자 인식 ' + Math.round(info.progress * 100) + '%');
      } });
    }
    return (await worker.recognize(image)).data.text;
  };
  try {
    let text = '';
    if (extension === 'docx') {
      text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else if (extension === 'pdf') {
      pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let number = 1; number <= pdf.numPages; number++) {
        report('PDF 읽는 중 ' + number + '/' + pdf.numPages);
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        let pageText = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        if (!/[가-힣]/.test(pageText)) {
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          pageText = await recognize(canvas);
          canvas.width = canvas.height = 0;
        }
        text += pageText + '\n';
      }
    } else if (file.type.startsWith('image/') || /^(png|jpe?g|webp|bmp)$/.test(extension)) {
      text = await recognize(file);
    } else if (/^(txt|csv)$/.test(extension)) {
      text = await file.text();
    } else {
      throw new Error('Word는 .docx로 저장해 주세요. PDF, JPG, PNG, WebP, TXT, CSV도 지원합니다.');
    }
    const words = parseVocabulary(text);
    if (!words.length) throw new Error('영어 단어와 한글 뜻 쌍을 찾지 못했어요. 두 내용이 함께 있는 선명한 파일을 선택해 주세요.');
    return words;
  } finally {
    if (worker) await worker.terminate();
    if (pdf) await pdf.destroy();
  }
}
