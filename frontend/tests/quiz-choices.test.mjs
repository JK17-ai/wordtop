import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildQuizChoices,wordPartOfSpeech} from '../src/components/quizChoices.js';
const target={id:0,word:'goal',meaning:'목표',pos:'noun'};
const nouns=Array.from({length:100},(_,i)=>({id:i+1,word:'noun'+i,meaning:'명사'+String.fromCharCode(44032+i),pos:'noun'}));
const verbs=Array.from({length:10},(_,i)=>({id:i+200,word:'verb'+i,meaning:'행동'+i+'하다',pos:'verb'}));
test('full-deck selection reaches beyond first eight and stays same POS',()=>{
 const pool=[target,...verbs,...nouns];let seen=new Set();
 for(let seed=1;seed<70;seed++){
  let state=seed;const random=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
  const options=buildQuizChoices(target,pool,'meaning',random);
  assert.equal(options.length,4);assert(options.includes('목표'));assert.equal(new Set(options).size,4);
  for(const option of options.filter(x=>x!=='목표')){assert(nouns.some(n=>n.meaning===option));seen.add(option);}
 }
 assert(seen.size>50);
});
test('reverse and recall use same candidate rules; duplicates excluded',()=>{
 const pool=[target,...nouns,...verbs,{id:999,word:'aim',meaning:'목표',pos:'noun'}];
 assert(!buildQuizChoices(target,pool,'reverse').includes('aim'));
 assert(buildQuizChoices(target,pool,'reverse').every(x=>x==='goal'||nouns.some(n=>n.word===x)));
 assert.equal(buildQuizChoices(target,pool,'recall').length,4);
});
test('explicit POS wins, Korean forms infer cautiously, sparse groups never use verbs as noun fillers',()=>{
 assert.equal(wordPartOfSpeech({meaning:'활성화하다'}),'verb');
 assert.equal(wordPartOfSpeech({meaning:'정상의'}),'adjective');
 assert.equal(wordPartOfSpeech({meaning:'목표'}),'noun');
 assert.equal(wordPartOfSpeech({meaning:'빠르게',pos:'noun'}),'noun');
 assert.equal(wordPartOfSpeech({meaning:'목표, 겨냥하다'}),'unknown');
 assert.deepEqual(buildQuizChoices(target,[target,...verbs]),['목표']);
});
