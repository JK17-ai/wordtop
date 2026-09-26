import { useLayoutEffect, useRef } from 'react';

// Measure rendered text, including the active font, rather than guessing by length.
export default function FitWord({ children, className = '', as: Tag = 'span', maxSize = 46 }) {
  const box = useRef(null);
  const text = useRef(null);
  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (!active || !box.current || !text.current) return;
      const width = box.current.clientWidth;
      if (!width) return;
      text.current.style.fontSize = `${maxSize}px`;
      const natural = text.current.getBoundingClientRect().width;
      const size = natural > width ? maxSize * (width / natural) * .98 : maxSize;
      text.current.style.fontSize = `${size}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box.current);
    document.fonts?.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [children, maxSize]);
  return <Tag ref={box} className={`fit-word ${className}`}><span ref={text}>{children}</span></Tag>;
}
