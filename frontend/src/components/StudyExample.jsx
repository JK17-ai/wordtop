import { exampleParts } from './exampleParts.js';
export default function StudyExample({word,uploaded}) {
  if(!word.example) return null;
  return <section className="study-example" aria-label="예문과 해석">
    <small>{uploaded?'예문':'AI 예문'}</small>
    <p className="study-example-english">{exampleParts(word.example,word.displayWord||word.word).map((part,i)=>part.highlight?<mark key={i}>{part.text}</mark>:part.text)}</p>
    {word.exampleTranslation && <p className="study-example-korean">{word.exampleTranslation}</p>}
  </section>;
}
