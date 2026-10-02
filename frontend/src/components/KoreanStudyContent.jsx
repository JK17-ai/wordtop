export default function KoreanStudyContent({word,saveAction}) {
  return <section className="korean-study-content" aria-label="국어 단어와 뜻">
    <div className="korean-study-heading"><small>{word.subject || (word.hanja ? '사자성어' : '국어 단어')}</small><h3 lang="ko">{word.displayWord || word.word}</h3><div className="korean-study-hanja-row">{word.hanja && <p className="korean-study-hanja" lang="ko" aria-label="한자 표기">{word.hanja}</p>}{saveAction && <span className="korean-inline-save">{saveAction}</span>}</div></div>
    <div className="moa-definition korean-study-meaning"><small>뜻</small><p>{word.displayMeaning || word.meaning}</p></div>
  </section>;
}
