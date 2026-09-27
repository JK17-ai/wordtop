export function validatePanelData(kind, value) {
  if (kind === 'family') {
    if (!Array.isArray(value) || value.some(person => !person || typeof person.id !== 'string' || typeof person.name !== 'string' || typeof person.avatar !== 'string')) {
      throw Error('가족 현황 응답을 읽지 못했어요. 다시 시도해 주세요.');
    }
    return value.map(person => ({ ...person,
      ...Object.fromEntries(['mastered','scrap','total','today_total','today_correct','active_ms','badges'].map(key => [key, Number.isFinite(Number(person[key])) ? Number(person[key]) : 0])),
      month_badges: person.month_badges && /^\d{4}-\d{2}$/.test(person.month_badges.month) && ['gold','silver','bronze'].every(tier => Number.isSafeInteger(person.month_badges[tier]) && person.month_badges[tier] >= 0) ? person.month_badges : null,
      updated_at: typeof person.updated_at === 'string' ? person.updated_at : null,
    }));
  }
  if (!value || !Array.isArray(value.awards) || value.awards.some(badge => !badge || typeof badge.id !== 'string' || typeof badge.tier !== 'string' || typeof badge.awarded_at !== 'string')) {
    throw Error('배지 기록 응답을 읽지 못했어요. 다시 시도해 주세요.');
  }
  return { awards: value.awards, streak: Number.isFinite(Number(value.streak)) ? Number(value.streak) : 0 };
}
