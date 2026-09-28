// EBS 문서의 뜻 끝에 붙은 제목/문항 번호 정리.
// 숫자 뒤에 한글이 이어지는 "4학년", "4중주"는 유지합니다.
export function cleanEbsMeaning(value) {
  if (typeof value !== 'string') return value;
  return cleanDanglingBrackets(value
    .replace(/\s*(?:감정\s*유형별\s*|유형편\s*)?영단어\s*[·ㆍ・/]\s*숙어.*$/u, '')
    .replace(/\s*실전\s*모의고사\s*(?:회\s*\d+|\d+\s*회).*$/u, '')
    .replace(/\s*(?:\d+\s*)?(?:유형편|실전편)(?:\s*\d+)*\s*$/u, '')
    .replace(/\s+(?:0\s+[1-9]|\d{2,3})(?:\s*[~～∼〜–—-]\s*\d+)?\s*\(?\s*$/u, '')
    .trim());
}

// Remove only empty, unmatched opening brackets at the end; preserve explanatory text.
export function cleanDanglingBrackets(value) {
  if (typeof value !== 'string') return value;
  let text = value.trim();
  const pairs = {'(':')', '[':']', '（':'）'};
  while (pairs[text.at(-1)]) {
    const open = text.at(-1), close = pairs[open];
    if ([...text].filter(c=>c===open).length <= [...text].filter(c=>c===close).length) break;
    text = text.slice(0,-1).trimEnd();
  }
  return text;
}
