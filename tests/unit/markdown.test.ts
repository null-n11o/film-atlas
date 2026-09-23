import { expect, it } from 'vitest';
import { renderMarkdown } from '../../src/lib/content/markdown';
it('escapes HTML and permits basic prose formatting',()=>{const html=renderMarkdown('<script>alert(1)</script>\n\n**強調**');expect(html).not.toContain('<script>');expect(html).toContain('<strong>強調</strong>');});
it.each(['[危険](javascript:alert(1))','![画像](/a.png)','[内部](/works/a/)','[外部](https://example.org)','<https://example.org>'])('does not produce active links or images: %s',text=>{try{expect(renderMarkdown(text)).not.toMatch(/<(a|img)\b/);}catch(e){expect(String(e)).toContain('MARKDOWN_NOT_ALLOWED');}});
