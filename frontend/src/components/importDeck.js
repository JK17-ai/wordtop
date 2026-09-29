import {validateWords} from '../lib/studyValidation.js';
import { needsVocabularyOcr } from './koreanVocabulary.js';
import { parseVocabulary } from './parseVocabulary';
export async function importDeck(file, report, {signal} = {}) {
  if (file.size > 20 * 1024 * 1024) throw Error('20MB 이하 파일을 선택해 주세요.');
  const check = () => { if (signal?.aborted) throw new DOMException('가져오기를 취소했어요.', 'AbortError'); };
  check();
  const extension = file.name.split('.').pop().toLowerCase();
  let worker;
  let pdf;
  let loading;
  let workerStopped=false;
  const stopWorker = async () => { if(worker&&!workerStopped){workerStopped=true;await worker.terminate();} };
  const cancel = () => { void stopWorker().catch(()=>{}); void loading?.destroy().catch(()=>{}); };
  signal?.addEventListener('abort',cancel,{once:true});
  const recognize = async image => {
    check();
    if (!worker) {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng+kor+chi_tra', 1, { logger: info => {
        if (info.status === 'recognizing text') report('문자 인식 ' + Math.round(info.progress * 100) + '%');
      } });
    }
    check();
    return (await worker.recognize(image)).data.text;
  };
  try {
    let text = '';
    if (extension === 'docx') {
      const {default:mammoth} = await import('mammoth');
      text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else if (extension === 'pdf') {
      const [pdfjs, {default:pdfWorker}] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
      check(); pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
      loading = pdfjs.getDocument({ data: await file.arrayBuffer(), cMapUrl: import.meta.env.BASE_URL + 'pdfjs/cmaps/', cMapPacked: true });
      pdf = await loading.promise;
      if (pdf.numPages > 80) throw Error('PDF는 한 번에 80쪽까지 가져올 수 있어요. 파일을 나누어 주세요.');
      for (let number = 1; number <= pdf.numPages; number++) {
        check();
        report('PDF 읽는 중 ' + number + '/' + pdf.numPages);
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        let pageText = content.items.filter(item => !(/^\d+$/.test(item.str.trim()) && item.transform?.[5] < 60)).map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        if (needsVocabularyOcr(pageText, parseVocabulary(pageText))) {
          const original = page.getViewport({scale:1});
          const viewport = page.getViewport({ scale: Math.min(1.8, Math.sqrt(4_000_000 / (original.width * original.height))) });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          try { await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; pageText = await recognize(canvas); }
          finally { canvas.width = canvas.height = 0; }
        }
        text += pageText + '\n';
        page.cleanup();
      }
    } else if (file.type.startsWith('image/') || /^(png|jpe?g|webp|bmp)$/.test(extension)) {
      const image = await createImageBitmap(file);
      try {
        if (image.width * image.height > 16_000_000) throw Error('사진은 1,600만 화소 이하로 줄여 주세요.');
        text = await recognize(file);
      } finally { image.close(); }
    } else if (/^(txt|csv)$/.test(extension)) {
      text = await file.text();
    } else {
      throw new Error('Word는 .docx로 저장해 주세요. PDF, JPG, PNG, WebP, TXT, CSV도 지원합니다.');
    }
    check();
    const words = parseVocabulary(text);
    if (!words.length) throw new Error('단어와 뜻 쌍을 찾지 못했어요. 영어·한글 뜻 또는 사자성어(한자): 뜻 형식의 선명한 파일을 선택해 주세요.');
    validateWords(words);
    return words;
  } finally {
    signal?.removeEventListener('abort',cancel);
    await stopWorker();
    if (pdf) await pdf.destroy();
  }
}
