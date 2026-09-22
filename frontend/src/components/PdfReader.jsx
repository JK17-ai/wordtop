import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfReader() {

  const [text, setText] = useState("");

  const readPDF = async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: buffer,
    }).promise;

    let result = "";

    for (let page = 1; page <= pdf.numPages; page++) {

      const p = await pdf.getPage(page);

      const content = await p.getTextContent();

      result += content.items.map(i => i.str).join(" ");

    }

    setText(result);

  };

  return (

    <div style={{marginTop:30}}>

      <input
        type="file"
        accept=".pdf"
        onChange={readPDF}
      />

      <hr/>

      <textarea

        style={{
          width:"100%",
          height:300
        }}

        value={text}

        readOnly

      />

    </div>

  );

}