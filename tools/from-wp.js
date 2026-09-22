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

// Chi giu cac the noi dung — moi thu khac (theme wrapper, anchor malware, class...) bi vut.
const ALLOW = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'strong', 'em', 'b', 'i', 'u',
  'a', 'img', 'br', 'blockquote', 'hr', 'figure', 'figcaption']);

/** Lam sach HTML bai viet WP bang whitelist tag. */
function sanitize(html, title) {
  let h = html;
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '');
  h = h.replace(/<style[\s\S]*?<\/style>/gi, '');
  h = h.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  // localize anh uploads -> placeholder __ROOT__ (build.js ghep depth)
  h = h.replace(/(<img[^>]*\bsrc=")(?:https?:)?\/\/napmucnhanh24h\.com\/wp-content\/uploads\/[^"]*?\/([^"\/?]+)(?:\?[^"]*)?("[^>]*>)/gi,
    (m, a, file, b) => a + '__ROOT__assets/img/' + file + b);
  // internal link -> placeholder __WP__
  h = h.replace(/href="(?:https?:)?\/\/napmucnhanh24h\.com\/([^"]*)"/gi, (m, p) => 'href="__WP__/' + p + '"');
  // whitelist pass: bo the ngoai danh sach (giu noi dung ben trong), don attribute
  h = h.replace(/<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (m, slash, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOW.has(tag)) return '';
    if (slash) return '</' + tag + '>';
    if (tag === 'a') { const href = (attrs.match(/href="([^"]*)"/i) || [])[1]; return href ? '<a href="' + href + '">' : ''; }
    if (tag === 'img') {
      const src = (attrs.match(/src="([^"]*)"/i) || [])[1];
      const alt = (attrs.match(/alt="([^"]*)"/i) || [])[1] || '';
      return src ? '<img src="' + src + '" alt="' + alt + '" loading="lazy">' : '';
    }
    return '<' + tag + '>';
  });
  // quet lai the rac con sot (tag hong / quote loi Elementor...) — chi giu ALLOW, chiu duoc attr hong
  h = h.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (m, tag) => ALLOW.has(tag.toLowerCase()) ? m : '');
  // bo heading dau bai trung title (tranh H1 lap)
  const norm = s => stripTags(s).toLowerCase().replace(/[^a-z0-9À-ỹ]+/gi, ' ').trim();
  const nt = norm(title);
  h = h.replace(/^\s*<h([1-6])>([\s\S]*?)<\/h\1>/i, (m, lv, inner) => norm(inner) === nt ? '' : m);
  // don rong
  h = h.replace(/<(p|h[1-6]|li|td|th|blockquote)>(\s|&nbsp;)*<\/\1>/gi, '');
  h = h.replace(/(<br>\s*){3,}/gi, '<br><br>');
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
    html: sanitize(c, title)
  });
}

pages.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(path.join(ROOT, 'data', 'pages-wp.json'), JSON.stringify(pages, null, 1));
console.log('Da chuyen', pages.length, 'trang WP ->', 'data/pages-wp.json',
  '(posts', pages.filter(p => p.type === 'post').length, '+ pages', pages.filter(p => p.type === 'page').length + ')');
