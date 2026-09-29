// One durable entry per answer; retries always reuse the same UUID.
export function createAnswerOutbox({ storage, key, send, changed = () => {} }) {
  let running;
  const valid = entry => entry && typeof entry === 'object' && !Array.isArray(entry)
    && typeof entry.event_id === 'string' && entry.event_id.length > 0
    && (entry.response_ms === undefined || (Number.isFinite(entry.response_ms) && entry.response_ms >= 0 && entry.response_ms <= 10000));
  const quarantine = raw => {
    const prefix = key + ':quarantine:' + Date.now();
    let backupKey = prefix, suffix = 0;
    while (storage.getItem(backupKey) !== null) backupKey = prefix + ':' + (++suffix);
    storage.setItem(backupKey, raw);
    if (storage.getItem(backupKey) !== raw) throw Error('답변 기록 백업에 실패했어요.');
  };
  const read = () => {
    const raw = storage.getItem(key);
    if (!raw) return [];
    let entries;
    try { entries = JSON.parse(raw); } catch { entries = null; }
    if (Array.isArray(entries) && entries.every(valid)) return entries;
    quarantine(raw); // Preserve damaged data before replacing the working queue.
    const recovered = Array.isArray(entries) ? entries.filter(valid) : [];
    storage.setItem(key, JSON.stringify(recovered));
    return recovered;
  };
  const write = entries => { storage.setItem(key, JSON.stringify(entries)); changed(entries.length); };
  return {
    count: () => read().length,
    enqueue(event) { if (!valid(event)) throw Error('답변 기록 형식을 확인해 주세요.'); const entries = read(); if (!entries.some(x => x.event_id === event.event_id)) write([...entries, event]); },
    async flush() {
      if (running) return running;
      running = (async () => {
        while (read().length) {
          const entry = read()[0];
          try { await send(entry); }
          catch (error) {
            // Invalid payloads cannot succeed on retry. Keep a copy and let later answers through.
            if (!['22023','22P02','23514'].includes(error?.code)) throw error;
            quarantine(JSON.stringify({entry, code:error.code}));
          }
          // Include answers appended while a request was in flight.
          write(read().filter(x => x.event_id !== entry.event_id));
        }
      })();
      try { await running; } finally { running = null; }
    },
  };
}
