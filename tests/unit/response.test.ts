import {expect,it} from 'vitest';
import {parseGroup} from '../../src/lib/spoilers/response';
import {publish} from '../../src/lib/content/publish';
import {makeDataset} from '../fixtures/make-dataset';
it('accepts generated groups and rejects mismatched permissions and active HTML',()=>{const g=publish(makeDataset()).groups.find(g=>g.graph.statements.length)!;expect(parseGroup(g,g).token).toBe(g.token);expect(()=>parseGroup(g,{...g,requires:['other']})).toThrow();const bad=structuredClone(g);bad.graph.statements[0].html='<img src=x onerror=alert(1)>';expect(()=>parseGroup(bad,g)).toThrow();});
