import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVocabulary} from '../src/components/parseVocabulary.js';
import {validateSnapshot} from '../src/lib/studySync.js';
import {validateWords} from '../src/lib/studyValidation.js';
import {createAnswerOutbox} from '../src/lib/answerOutbox.js';
import {scoreResponse} from '../src/components/responseTiming.js';
import {repairSavedDeck,repairFeedKeys} from '../src/components/repairSavedDeck.js';
import {idiomCorrections} from '../src/components/idiomCorrections.js';
import {readFileSync} from 'node:fs';
import {offlinePlugin} from '../offlinePlugin.mjs';
import vm from 'node:vm';
import {studyDay} from '../src/components/dailyStudy.js';
const snapshot = () => ({schemaVersion:1,deck:{name:'test',words:[{id:1,word:'apple',meaning:'사과'}]}});
test('daily counters share the Seoul midnight boundary independent of device timezone',()=>{
 assert.equal(studyDay(new Date('2026-09-29T14:59:59Z')),'2026-09-29');
 assert.equal(studyDay(new Date('2026-09-29T15:00:00Z')),'2026-09-30');
});
test('CSV quotes, escaped quotes, BOM, headers and multiline meanings survive import',()=>{
 const words=parseVocabulary('\uFEFFword,meaning\napple,"사과, 사과나무"\nbanana,"바나나\n노란 과일"');
 assert.equal(words.length,2);assert.equal(words[0].meaning,'사과, 사과나무');assert.equal(words[1].meaning,'바나나\n노란 과일');
 assert.equal(parseVocabulary('apple,"사과 ""열매"""')[0].meaning,'사과 "열매"');
 assert.throws(()=>parseVocabulary('apple,"사과'),/따옴표/);
});
test('mixed language and multiple senses are retained without merging entries',()=>{
 const words=parseVocabulary('각주구검(刻舟求劍): 어리석음\napple: 사과\napple: 사과나무');
 assert.equal(words.length,3);assert.equal(words[0].meaning,'어리석음');assert.equal(words[2].meaning,'사과나무');
});
test('nested corrupt records are rejected before rendering without changing original',()=>{
 for (const entries of [null,[],42,'broken']) {const value={...snapshot(),feedProgress:{entries}};const raw=JSON.stringify(value);assert.throws(()=>validateSnapshot(value));assert.equal(JSON.stringify(value),raw);}
 assert.throws(()=>validateSnapshot({...snapshot(),quizProgress:{activeKey:'one',sessions:{one:{ids:null,index:0}}}}));
 assert.throws(()=>validateSnapshot({...snapshot(),deckLibrary:{activeId:'a',decks:[{id:'b',deck:snapshot().deck,feedProgress:{entries:null}}]}}));
});
test('word limit is enforced before adding an unsyncable library',()=>{
 const words=Array.from({length:10001},(_,id)=>({id,word:'word',meaning:'뜻'}));
 assert.doesNotThrow(()=>validateWords(words.slice(0,9999)));assert.doesNotThrow(()=>validateWords(words.slice(0,10000)));assert.throws(()=>validateWords(words));
});
test('outbox quarantines corruption and continues valid events',async()=>{
 const data=new Map([['queue','[null,{"event_id":"valid"}]']]);const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};const sent=[];
 const box=createAnswerOutbox({storage,key:'queue',send:async event=>sent.push(event.event_id)});
 assert.equal(box.count(),1);await box.flush();assert.deepEqual(sent,['valid']);assert([...data.keys()].some(key=>key.startsWith('queue:quarantine:')));
 data.set('queue','{');assert.equal(box.count(),0);
});
test('a permanently rejected event cannot block later valid answers',async()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};const sent=[];
 const box=createAnswerOutbox({storage,key:'q',send:async e=>{if(e.event_id==='bad')throw {code:'22023'};sent.push(e.event_id);}});
 box.enqueue({event_id:'bad'});box.enqueue({event_id:'good'});await box.flush();assert.deepEqual(sent,['good']);
});
test('deadline boundary agrees with integer server scoring',()=>{
 assert.deepEqual(scoreResponse(9999.6,true,'뜻'),{correct:true,choice:'뜻',responseMs:9999,timedOut:false});
 assert.deepEqual(scoreResponse(10000,true,'뜻'),{correct:false,choice:null,responseMs:10000,timedOut:true});
 assert.equal(scoreResponse(10001,true,'뜻').timedOut,true);
});
test('editorial repairs preserve judgments, quiz ids and feed cursors with an original backup',async()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 try {
  const words=idiomCorrections.map(p=>({id:p.id,word:p.word,meaning:p.oldMeaning,judgment:'known',responseCounts:{correctStage1:9}}));
  const saved={words};const repaired=await repairSavedDeck(words,saved,'editorial-test');
  assert.equal(data.size,1);assert.equal(JSON.parse([...data.values()][0]).words[0].meaning,words[0].meaning);
  assert.equal(repaired[0].responseCounts.correctStage1,9);
  const oldKey=JSON.stringify([words[0].id,words[0].word,words[0].meaning]);
  const feed=repairFeedKeys({cursor:oldKey,entries:{[oldKey]:{saved:true}}},words,repaired);
  assert.equal(feed.entries[feed.cursor].saved,true);assert.notEqual(feed.cursor,oldKey);
  assert.deepEqual(await repairSavedDeck(repaired,saved,'editorial-test'),repaired);
 }finally{delete globalThis.localStorage;}
});
test('additive SQL repair matches every current catalog difference exactly',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../public/books/2027.json',import.meta.url)));
 const old=readFileSync(new URL('../supabase/migrations/202609270004_learning_features.sql',import.meta.url),'utf8');
 const repair=readFileSync(new URL('../supabase/migrations/202609290008_catalog_meaning_repair.sql',import.meta.url),'utf8');
 const rows=[...old.matchAll(/^\('((?:''|[^'])*)','((?:''|[^'])*)','((?:''|[^'])*)'\)/gm)].map(m=>m.slice(1).map(x=>x.replaceAll("''","'")));
 let differences=0;
 for(const [id,word,meaning] of rows){const current=catalog.find(x=>String(x.id)===id);if(current&&current.meaning!==meaning){differences++;assert.equal(current.word,word);assert(repair.includes(`('${id}','${word}','${current.meaning}','${meaning}')`));}}
 assert.equal(differences,8);
});
test('offline worker handles only same-origin public assets, never account API traffic',async()=>{
 let source;offlinePlugin().generateBundle.call({emitFile:file=>source=file.source},{},{main:{type:'chunk',isEntry:true,fileName:'assets/main.js'},css:{type:'asset',fileName:'assets/main.css'}});
 const listeners={};const cached=[];let response;
 const cache={addAll:async urls=>cached.push(...urls),match:async()=>({cached:true}),put:async()=>{}};
 vm.runInNewContext(source,{self:{location:{origin:'https://example.test'},clients:{claim:async()=>{}},addEventListener:(name,cb)=>listeners[name]=cb},caches:{open:async()=>cache,keys:async()=>[]},URL,Response,fetch:async()=>{throw Error('offline');}});
 await listeners.install({waitUntil:p=>p});assert(cached.includes('/index.html'));assert(cached.includes('/assets/main.js'));
 listeners.fetch({request:{url:'https://private.supabase.co/rest/v1/rpc/x',method:'POST'},respondWith:()=>{throw Error('API must not be intercepted');}});
 listeners.fetch({request:{url:'https://example.test/private-records',method:'GET'},respondWith:()=>{throw Error('private routes must not be cached');}});
 listeners.fetch({request:{url:'https://example.test/',method:'GET',mode:'navigate'},respondWith:p=>{response=p;}});assert.equal((await response).cached,true);
});
