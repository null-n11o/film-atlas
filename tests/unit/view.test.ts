import {expect,it} from 'vitest';
import {makeDataset} from '../fixtures/make-dataset';
import {publish} from '../../src/lib/content/publish';
import {projectPage} from '../../src/lib/view/project';
import {renderPageBody} from '../../src/lib/view/render';
it('projects only reachable contexts and references for visible blocks',()=>{const p=publish(makeDataset());const v=projectPage(p.base,{kind:'background',id:'b1'},new Set());expect(v.references[0].title).toBe('テスト専用資料');expect(v.references[0].locator).toBe('テスト用の1ページ');expect(v.links.some(l=>l.href==='/works/test-work-a/')).toBe(true);expect(v.readingMinutes).toBe(1);const w2=projectPage(p.base,{kind:'work',id:'w2'},new Set());expect(w2.places).toEqual([]);expect(w2.events).toEqual([]);});
it('escapes display text and leaves empty section headings out',()=>{const p=publish(makeDataset());p.base.entities[0].safeSummary='<img src=x onerror=alert(1)>';const html=renderPageBody(projectPage(p.base,{kind:'work',id:'w1'},new Set()));expect(html).not.toContain('<img');expect(html).not.toContain('<h2>本人の発言</h2>');});
