import FitWord from './FitWord';
import { exampleParts } from './exampleParts.js';
export default function StudyExample({word,uploaded}) {
  if(!word.example) return null;
  return <section className="study-example" aria-label="예문과 해석">
    <small>{uploaded?'예문':'AI 예문'}</small>
    <FitWord as="p" className="study-example-english" maxSize={20}>{exampleParts(word.example,word.displayWord||word.word).map((part,i)=>part.highlight?<mark key={i}>{part.text}</mark>:part.text)}</FitWord>
    {word.exampleTranslation && <FitWord as="p" className="study-example-korean" maxSize={17}>{word.exampleTranslation}</FitWord>}
  </section>;
}
