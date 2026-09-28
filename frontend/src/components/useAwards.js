import { browserUUID } from '../lib/browserCrypto.js';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { createAnswerOutbox } from '../lib/answerOutbox.js';
import { retryDelay } from '../lib/syncRetry.js';

export default function useAwards(profileId) {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const [latestAward, setLatestAward] = useState(null);
  const [version, setVersion] = useState(0);
  const outbox = useRef(null);
  const pump = useRef(null);
  const catalog = useRef(new Map());
  useEffect(() => {
    let active = true, timer, failures = 0;
    const client = getSupabase();
    outbox.current = createAnswerOutbox({ storage: localStorage, key: `wordtop:${profileId}:answer-outbox-v1`,
      changed: count => { if (active) setPending(count); },
      send: async event => {
        if (!client) throw Error('서버 연결 설정을 확인해 주세요.');
        const { data: receipt, error: failure } = await client.rpc('wordtop_record_answer', event).abortSignal(AbortSignal.timeout(10000));
        if (failure) throw failure;
        if (active && receipt?.badge && !receipt.duplicate) setLatestAward({ tier:receipt.badge, id:event.event_id });
      },
    });
    pump.current = async () => {
      clearTimeout(timer);
      try {
        setPending(outbox.current.count());
        if (!outbox.current.count()) return;
        if (!navigator.onLine) throw Error('인터넷 연결 대기 중');
        await outbox.current.flush();
        if (active) { setError(''); setVersion(v => v + 1); failures = 0; }
      } catch (failure) {
        if (active) { setError(failure.message); timer = setTimeout(() => pump.current?.(), retryDelay(++failures)); }
      }
    };
    const online = () => { void pump.current?.(); };
    fetch('/books/2027.json').then(r => { if (!r.ok) throw Error('catalog'); return r.json(); })
      .then(words => { if (active) catalog.current = new Map(words.map(w => [String(w.id), w])); }).catch(() => {});
    online(); window.addEventListener('online', online);
    return () => { active = false; clearTimeout(timer); window.removeEventListener('online', online); };
  }, [profileId]);
  const record = (item, timing) => {
    const original = catalog.current.get(String(item.id));
    // Uploaded decks cannot accidentally earn badges using colliding numeric IDs.
    if (!original || original.word !== item.word || original.meaning !== item.meaning) return;
    try {
      outbox.current.enqueue({ event_id: browserUUID(), catalog_id: String(item.id),
        selected_meaning: timing.selectedMeaning ?? null, response_ms: timing.responseMs });
      void pump.current?.();
    } catch (failure) { setError('배지 기록을 기기에 저장하지 못했습니다: ' + failure.message); }
  };
  return { record, pending, error, version, latestAward, retry: () => pump.current?.() };
}
