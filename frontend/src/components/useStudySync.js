import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { createStudySync } from '../lib/studySync.js';
import { retryDelay } from '../lib/syncRetry.js';

export default function useStudySync({ profileId, storageKey, ready, snapshot, hasLocal, onRestore }) {
  const [status, setStatus] = useState({ state: 'loading' });
  const refs = useRef({ snapshot, onRestore, hasLocal });
  refs.current = { snapshot, onRestore, hasLocal };
  const controller = useRef(null);
  const initialized = useRef(false);
  const initializing = useRef(false);
  const active = useRef(true);
  const dirtyTimer = useRef(null);
  const retryTimer = useRef(null);
  const failures = useRef(0);
  const retryRef = useRef(null);
  const statusRef = useRef('loading');
  const restoring = useRef(false);
  const [restoredTick, setRestoredTick] = useState(0);
  const report = value => {
    if (!active.current) return;
    statusRef.current = value.state;
    setStatus(previous => ({ ...value, uploadSequence: (previous.uploadSequence || 0) + Number(value.uploaded === true) }));
    if (value.state === 'saved' || value.state === 'conflict') {
      clearTimeout(retryTimer.current); failures.current = 0;
    }
    if (value.state === 'error') {
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => { void retryRef.current?.(); }, retryDelay(++failures.current));
    }
  };
  const restore = async value => {
    restoring.current = true;
    try { await refs.current.onRestore(value); }
    finally { if (active.current) setRestoredTick(value => value + 1); }
  };
  const retry = async () => {
    if (!ready || initializing.current || !controller.current) return;
    if (navigator.onLine === false) {
      report({ state: 'error', message: '인터넷 연결을 기다리는 중입니다. 학습 기록은 이 기기에 유지됩니다.' });
      return;
    }
    try {
      if (!initialized.current) {
        initializing.current = true;
        const result = await controller.current.initialize(refs.current.snapshot, refs.current.hasLocal);
        if (!active.current) return;
        await restore(result.snapshot);
        initialized.current = true;
        if (result.shouldSave) { controller.current.queue(result.snapshot); await controller.current.flush(); }
      } else await controller.current.flush();
    } catch (error) { report({ state: 'error', message: error.message }); }
    finally { initializing.current = false; }
  };
  retryRef.current = retry;
  useEffect(() => {
    active.current = true;
    const client = getSupabase();
    if (!client || !profileId) { report({ state: 'error', message: '서버 연결 설정이 필요합니다.' }); return; }
    controller.current = createStudySync({ rpc: (...args) => client.rpc(...args).abortSignal(AbortSignal.timeout(10000)), storage: localStorage,
      key: storageKey, profileId, status: report });
    return () => { active.current = false; clearTimeout(dirtyTimer.current); clearTimeout(retryTimer.current); };
  }, [profileId, storageKey]);
  useEffect(() => { if (ready) void retry(); }, [ready]);
  useEffect(() => {
    if (!ready || !initialized.current || restoring.current) return;
    try { controller.current.queue(snapshot); }
    catch (error) { report({ state: 'error', message: '기기 저장 공간을 확인해 주세요. ' + error.message }); return; }
    clearTimeout(dirtyTimer.current);
    // Keep writing pending data locally during outages, without sending each answer again.
    if (statusRef.current !== 'error') dirtyTimer.current = setTimeout(() => { void retryRef.current?.(); }, 700);
    return () => clearTimeout(dirtyTimer.current);
  }, [ready, snapshot]);
  useEffect(() => { restoring.current = false; }, [restoredTick]);
  useEffect(() => {
    const online = () => { clearTimeout(retryTimer.current); void retryRef.current?.(); };
    const foreground = () => { if (document.visibilityState === 'visible' && statusRef.current === 'error') online(); };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', foreground);
    return () => { window.removeEventListener('online', online); document.removeEventListener('visibilitychange', foreground); };
  }, [ready]);
  const resolve = async choice => {
    report({ state: 'loading' });
    try {
      const value = await controller.current.resolve(choice, refs.current.snapshot);
      if (value) await restore(value);
    } catch (error) { report({ state: 'error', message: error.message }); }
  };
  return { ...status, retry, resolve };
}
