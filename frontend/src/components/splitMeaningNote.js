// Presentation only: move balanced leading/trailing explanations below the meaning.
export function splitMeaningNote(value) {
  const text = typeof value === 'string' ? value : '';
  const original = {main:text,note:''};
  let body=text.trim();
  const notes=[];
  while (/^[（(]/u.test(body)) {
    const stack=[];
    let end=-1;
    for(let i=0;i<body.length;i++) {
      const c=body[i];
      if(c==='(' || c==='（') stack.push(c==='(' ? ')' : '）');
      else if(c===')' || c==='）') {
        if(stack.pop()!==c) return original;
        if(!stack.length) {end=i;break;}
      }
    }
    if(end<0) return original;
    notes.push(body.slice(0,end+1));
    body=body.slice(end+1).trim();
  }
  if(!body) return original;
  const start=body.search(/[（(]/u);
  if(start>0) {
    const stack=[];
    let valid=true;
    for(const c of body.slice(start)) {
      if(c==='(' || c==='（') stack.push(c==='(' ? ')' : '）');
      else if(c===')' || c==='）') {if(stack.pop()!==c) {valid=false;break;}}
      else if(!stack.length && c.trim()) {valid=false;break;}
    }
    if(valid && !stack.length) {notes.push(body.slice(start));body=body.slice(0,start).trimEnd();}
  }
  return notes.length ? {main:body,note:notes.join(' ')} : original;
}
