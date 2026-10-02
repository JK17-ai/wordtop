import {useLayoutEffect} from 'react';

// Re-evaluate the normal layout for each word; never carry a previous card's deficit.
export default function useFeedLayout(viewport, wordKey, summary) {
  useLayoutEffect(() => {
    const shell = viewport.current?.closest('.app-shell');
    if (!shell) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      delete shell.dataset.feedCompact;
      const card = viewport.current?.querySelector('.moa-slide.is-current');
      if (!card || summary) return;
      const style = getComputedStyle(card);
      const children = [...card.children].filter(child => getComputedStyle(child).position !== 'absolute');
      const required = children.reduce((height, child) => {
        const childStyle = getComputedStyle(child);
        return height + Math.max(child.scrollHeight, child.clientHeight) +
          parseFloat(childStyle.marginTop || 0) + parseFloat(childStyle.marginBottom || 0);
      }, 0) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
        parseFloat(style.rowGap || 0) * Math.max(0, card.classList.contains('korean-study-card') ? children.length - 1 : 4);
      if (required > card.clientHeight + 2) shell.dataset.feedCompact = 'true';
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(shell);
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('resize', fit);
      delete shell.dataset.feedCompact;
    };
  }, [viewport, wordKey, summary]);
}
