import { browserUUID } from '../lib/browserCrypto.js';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const generation = useRef(0);

  useEffect(() => {
    generation.current++;
    let active = true, timer, failures = 0;
    const client = getSupabase();
    outbox.current = createAnswerOutbox({ storage: localStorage, key: `wordtop:${profileId}:answer-outbox-v1`,
      changed: count => { if (active) setPending(count); },
      send: async event => {
        if (!client) throw Error('서버 연결 설정을 확인해 주세요.');
        if(!event.challenge_id)throw Object.assign(Error('이전 버전 답안은 학습 기록으로 보관합니다.'),{code:'22023'});
        const { data: receipt, error: failure } = await client.rpc('wordtop_submit_question', {challenge_id:event.challenge_id,answer:event.selected_meaning}).abortSignal(AbortSignal.timeout(10000));
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
    online(); window.addEventListener('online', online);
    return () => { active = false; generation.current++; clearTimeout(timer); window.removeEventListener('online', online); };
  }, [profileId]);
  const prepare = useCallback(async item => {
    if(!navigator.onLine || !/^\d+$/.test(String(item.id)))return null;
    const client=getSupabase();if(!client)return null;
    try{
      const {data,error}=await client.rpc('wordtop_issue_question',{request_id:browserUUID(),word_id:String(item.id)}).abortSignal(AbortSignal.timeout(4000));
      if(error || data?.submitted || data?.word!==item.word || data?.meaning!==item.meaning)return null;
      return data.id;
    }catch{return null;}
  },[]);
  const record = async (item, timing, ticket) => {
    const queue=outbox.current,send=pump.current;
    const current=generation.current;
    const challengeId=await ticket;if(!challengeId||generation.current!==current)return;
    try {
      queue.enqueue({ event_id:challengeId,challenge_id:challengeId,
        selected_meaning:timing.selectedMeaning??null,response_ms:timing.responseMs });
      void send?.();
    } catch (failure) { setError('배지 기록을 기기에 저장하지 못했습니다: ' + failure.message); }
  };
  return { prepare, record, pending, error, version, latestAward, retry: () => pump.current?.() };
}
