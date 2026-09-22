import "./App.css";

const words = [
  { word: "OCCUR", meaning: "발생하다", level: "★★★★★" },
  { word: "ARISE", meaning: "발생하다", level: "★★★★★" },
  { word: "TAKE PLACE", meaning: "일어나다", level: "★★★★★" },
  { word: "DERIVE", meaning: "얻다", level: "★★★★☆" },
];

function App() {
  return (
    <div className="container">

      <h1>📚 WORDTOP</h1>

      <input
        className="search"
        placeholder="단어 검색..."
      />

      {words.map((item) => (
        <div className="card" key={item.word}>
          <div className="word">{item.word}</div>
          <div className="meaning">{item.meaning}</div>
          <div className="level">{item.level}</div>
        </div>
      ))}

    </div>
  );
}

export default App;
