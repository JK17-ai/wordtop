// EBS 문서의 뜻 끝에 붙은 제목/문항 번호 정리.
// 숫자 뒤에 한글이 이어지는 "4학년", "4중주"는 유지합니다.
export function cleanEbsMeaning(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\s*(?:감정\s*유형별\s*|유형편\s*)?영단어\s*[·ㆍ・/]\s*숙어.*$/u, '')
    .replace(/\s*실전\s*모의고사\s*(?:회\s*\d+|\d+\s*회).*$/u, '')
    .replace(/\s*(?:\d+\s*)?(?:유형편|실전편)(?:\s*\d+)*\s*$/u, '')
    .replace(/\s+(?:0\s+[1-9]|\d{2,3})(?:\s*[~～∼〜–—-]\s*\d+)?\s*\(?\s*$/u, '')
    .trim();
}
