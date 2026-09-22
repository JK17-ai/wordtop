export default function WordCard({ item, onToggle }) {

  return (

    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        boxShadow: "0 3px 10px rgba(0,0,0,.1)"
      }}
    >

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 15
        }}
      >

        <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        style={{
            transform: "scale(2.3)",
            marginRight: 20,
            cursor: "pointer"
        }}
        />

        <div>

          <div
            style={{
              fontSize: 28,
              fontWeight: "bold"
            }}
          >
            {item.word}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              color: "#666"
            }}
          >
            {item.meaning}
          </div>

        </div>

      </div>

    </div>

  );

}