export function parseVocabulary(text) {
  const result = [];
  const used = new Set();
  // English headword or phrase followed by its Korean definition.
  const pattern = /([A-Za-z][A-Za-z'’ -]*?)\s*(?:\[[^\]\n]*\]|\/[^/\n]+\/)?\s*(?:(?:n|v|adj|adv|prep|conj|pron|a|ad|vt|vi)\.)?\s*[:\t,–—-]*\s*([가-힣][^A-Za-z\n]*)/g;
  for (const match of text.normalize('NFC').matchAll(pattern)) {
    const word = match[1].trim();
    const meaning = match[2].replace(/[\s\d|;]+$/g, '').trim();
    if (!meaning || word.length > 80 || used.has(word.toLowerCase())) continue;
    used.add(word.toLowerCase());
    result.push({ id: result.length, word, meaning, checked: false });
  }
  return result;
}
