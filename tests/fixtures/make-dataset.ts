import type { Dataset, Entity } from '../../src/lib/content/types';
export const base = () => ({ revision: 1, status: 'published' as const, review: { by: 'テスト専用の架空確認者', date: '2026-09-23', revision: 1 }, spoilerWorkIds: [] as string[] });
export function makeDataset(): Dataset {
  return { entities: [2000, 2001].map((year, i) => ({ ...base(), id: `w${i+1}`, kind: 'work', slug: `test-work-${i ? 'b':'a'}`, safeTitle: 'テスト専用作品', safeSummary: 'TEST_ONLY 動作確認のための架空作品。', title: {text: 'テスト専用作品', spoilerWorkIds: []}, payload: {type:'work', jaTitle:'テスト専用作品', originalTitle:'Test film', releaseYear:year} } as Entity)), statements: [] };
}
