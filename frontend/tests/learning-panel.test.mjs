import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePanelData } from '../src/components/learningPanelData.js';
test('family and badge responses cannot be rendered as each other', () => {
 const family=[{id:'p1',name:'제이크',avatar:'👨',mastered:12}];
 const badges={streak:3,awards:[]};
 assert.equal(validatePanelData('family',family)[0].mastered,12);
 assert.deepEqual(validatePanelData('badges',badges),badges);
 assert.throws(()=>validatePanelData('family',badges),/가족/);
 assert.throws(()=>validatePanelData('badges',family),/배지/);
});
test('malformed payloads are rejected before rendering React children', () => {
 for(const value of [null,{},[null],[{id:'p1',name:{},avatar:'x'}]]) assert.throws(()=>validatePanelData('family',value));
 assert.throws(()=>validatePanelData('badges',{awards:[null]}));
 assert.deepEqual(validatePanelData('family',[]),[]);
});
test('missing family counters default to zero', () => {
 const [person]=validatePanelData('family',[{id:'p1',name:'제이크',avatar:'👨',total:'4',active_ms:'invalid'}]);
 assert.equal(person.total,4); assert.equal(person.scrap,0); assert.equal(person.active_ms,0);
});
