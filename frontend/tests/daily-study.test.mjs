import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyCounts, dailyRecord, learningSettings } from '../src/components/dailyStudy.js';
test('daily words count once and move between scrap/mastered on the latest answer', () => {
 let daily=dailyRecord(null,'deck:a',false,'2026-09-27');
 daily=dailyRecord(daily,'deck:a',true,'2026-09-27');
 daily=dailyRecord(daily,'deck:b',false,'2026-09-27');
 assert.deepEqual(dailyCounts(daily,'2026-09-27'),{total:2,scrap:1,mastered:1});
});
test('daily counts reset at a new date without changing historical word statuses', () => {
 const old=dailyRecord(null,'a',true,'2026-09-26');
 assert.deepEqual(dailyCounts(old,'2026-09-27'),{total:0,scrap:0,mastered:0});
 assert.deepEqual(dailyRecord(old,'b',false,'2026-09-27'),{date:'2026-09-27',entries:{b:'scrap'}});
});
test('settings allow only the requested learning methods', () => {
 assert.deepEqual(learningSettings({scrap:'meaning',mastered:'listening'}),{scrap:'meaning',mastered:'listening'});
 assert.deepEqual(learningSettings({scrap:'listening',mastered:'recall'}),{scrap:'recall',mastered:'reverse'});
});
