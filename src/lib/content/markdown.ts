import MarkdownIt from "markdown-it";
const md = new MarkdownIt("zero", {
  html: false,
  linkify: false,
  typographer: false,
}).enable([
  "paragraph",
  "newline",
  "escape",
  "entity",
  "emphasis",
  "list",
  "blockquote",
  "link",
  "image",
  "autolink",
  "backticks",
]);
export function renderMarkdown(text: string): string {
  const tokens = md.parse(text, {});
  function check(items: typeof tokens) {
    for (const token of items) {
      if (
        ["image", "link_open", "html_inline", "html_block"].includes(token.type)
      )
        throw Error("MARKDOWN_NOT_ALLOWED");
      if (token.children) check(token.children);
    }
  }
  check(tokens);
  return md.renderer.render(tokens, md.options, {});
}
