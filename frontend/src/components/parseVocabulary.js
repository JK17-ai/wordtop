// 문서 제목으로 확인된 표현만 처리합니다.
const DOCUMENT_TITLE =
  /(?:감정\s*유형별\s*영단어\s*[·ㆍ・/]\s*숙어|유형편\s*영단어\s*[·ㆍ・/]\s*숙어|영단어\s*[·ㆍ・/]\s*숙어)/u;

function removeDocumentNoise(value) {
  const titleIndex = value.search(DOCUMENT_TITLE);

  if (titleIndex !== -1) {
    value = value.slice(0, titleIndex);
  }

  return value
    // 뜻 뒤에 붙은 "01 유형편 02", "유형편 02" 등을 제거합니다.
    .replace(/\s*(?:\d+\s*)?유형편(?:\s*\d+)*\s*$/u, '')
    .trim();
}

export function parseVocabulary(text) {
  const result = [];
  const used = new Set();

  const cleanedText = text
    .normalize('NFC')
    .split(/\r\n?|\n/)
    .map(removeDocumentNoise)
    // 페이지·유형 번호만 있는 줄은 제외합니다.
    .filter((line) => !/^\s*\d+(?:\s+\d+)*\s*$/u.test(line))
    .join('\n');

  const pattern =
    /([A-Za-z][A-Za-z'’ -]*?)\s*(?:\[[^\]\n]*\]|\/[^/\n]+\/)?\s*(?:(?:n|v|adj|adv|prep|conj|pron|a|ad|vt|vi)\.)?\s*[:\t,–—-]*\s*([~～∼〜]?\s*[가-힣][^A-Za-z\n]*)/g;

  for (const match of cleanedText.matchAll(pattern)) {
    const word = match[1].trim();
    const meaning = removeDocumentNoise(match[2])
      .replace(/[\s|;]+$/g, '')
      .trim();

    if (!meaning || word.length > 80 || used.has(word.toLowerCase())) {
      continue;
    }

    used.add(word.toLowerCase());
    result.push({
      id: result.length,
      word,
      meaning,
      checked: false,
    });
  }

  return result;
}