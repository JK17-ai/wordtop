// One durable entry per answer; retries always reuse the same UUID.
export function createAnswerOutbox({ storage, key, send, changed = () => {} }) {
  let running;
  const read = () => JSON.parse(storage.getItem(key) || '[]');
  const write = entries => { storage.setItem(key, JSON.stringify(entries)); changed(entries.length); };
  return {
    count: () => read().length,
    enqueue(event) { const entries = read(); if (!entries.some(x => x.event_id === event.event_id)) write([...entries, event]); },
    async flush() {
      if (running) return running;
      running = (async () => {
        while (read().length) {
          const entry = read()[0];
          await send(entry);
          // Include answers appended while a request was in flight.
          write(read().filter(x => x.event_id !== entry.event_id));
        }
      })();
      try { await running; } finally { running = null; }
    },
  };
}
