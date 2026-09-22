// Chuyen data/wp-export/_clean.json (keo tu WP REST) -> data/pages-wp.json
// Giu nguyen URL that (tu field `link`), lam sach HTML, localize anh + link noi bo.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const clean = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'wp-export', '_clean.json'), 'utf8'));

// Trang he thong WooCommerce / tai khoan -> bo (site chi lien he, khong gio hang)
const WOO = /^(cart|checkout|tai-khoan|my-account.*|lost-password|logout|pay|order-received|edit-address|view-order|doi-mat-khau|mijireh.*|mua|ors|gio-hang|thanh-toan|dang-nhap|dang-ky)$/;

function decode(s) {
  return (s || '')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#8216;|&#8217;/g, "'").replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8230;/g, '…').replace(/&#8377;/g, '₹')
    .replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function stripTags(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Lam sach HTML bai viet WP. */
function sanitize(html) {
  let h = html;
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '');
  h = h.replace(/<style[\s\S]*?<\/style>/gi, '');
  h = h.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  h = h.replace(/ on[a-z]+="[^"]*"/gi, '');
  h = h.replace(/ on[a-z]+='[^']*'/gi, '');
  // WP block comments
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  // localize anh uploads -> assets/img/<file> (thay bang placeholder __ROOT__ de build.js ghep depth)
  h = h.replace(/(<img[^>]+src=")(?:https?:)?\/\/napmucnhanh24h\.com\/wp-content\/uploads\/[^"]*?\/([^"\/?]+)(\?[^"]*)?(")/gi,
    (m, a, file, q, b) => a + '__ROOT__assets/img/' + file + b + ' loading="lazy"');
  // bo cac img con tro external khac (giu alt neu co)
  // internal link -> placeholder de build.js xu ly theo `known`
  h = h.replace(/<a([^>]*?)href="(?:https?:)?\/\/napmucnhanh24h\.com\/([^"]*)"([^>]*)>/gi,
    (m, pre, p, post) => '<a' + pre + 'href="__WP__/' + p + '"' + post + '>');
  // bo class/id/style rac cua WP/Elementor de gon (giu the)
  h = h.replace(/\s(class|id|style|data-[a-z-]+)="[^"]*"/gi, '');
  // bo <p> rong
  h = h.replace(/<p>(\s|&nbsp;)*<\/p>/gi, '');
  // gon nhieu dong trong
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}

const pages = [];
for (const p of clean) {
  if (p.status !== 'publish') continue;
  const c = (p.content && p.content.rendered) || '';
  if (c.length < 200) continue;
  const slug = p.slug || '';
  if (!slug || WOO.test(slug)) continue;
  let urlpath = (p.link || '').replace(/^https?:\/\/napmucnhanh24h\.com\//, '').replace(/\/$/, '').split('?')[0];
  if (!urlpath) urlpath = slug; // trang front-page rong -> dung slug
  const title = decode((p.title && p.title.rendered) || slug);
  let desc = stripTags((p.excerpt && p.excerpt.rendered) || '');
  if (!desc) desc = stripTags(c).slice(0, 155);
  desc = desc.slice(0, 160);
  pages.push({
    slug: urlpath,
    source: 'wp',
    type: p.type,
    title: title,
    description: desc,
    h1: title,
    schema: null,
    html: sanitize(c)
  });
}

pages.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(path.join(ROOT, 'data', 'pages-wp.json'), JSON.stringify(pages, null, 1));
console.log('Da chuyen', pages.length, 'trang WP ->', 'data/pages-wp.json',
  '(posts', pages.filter(p => p.type === 'post').length, '+ pages', pages.filter(p => p.type === 'page').length + ')');
