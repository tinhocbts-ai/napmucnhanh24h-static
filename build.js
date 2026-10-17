/* Dung toan bo site tinh.
 * Nguon:  data/pages.json      (21 ban rewrite tay — uu tien)
 *         data/pages-wp.json   (75 trang keo tu WP — full noi dung cu)
 * Trung slug -> ban rewrite thang.
 * Chay:  node build.js            -> ban demo (noindex, cho github.io)
 *        NOINDEX=0 node build.js  -> ban that, cho phep Google index
 * KHONG sua truc tiep file .html o thu muc goc — chung deu la file tu sinh.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const rewrites = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pages.json'), 'utf8'));
const wp = fs.existsSync(path.join(ROOT, 'data', 'pages-wp.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pages-wp.json'), 'utf8')) : [];
const NOINDEX = process.env.NOINDEX !== '0';
const readJson = (f, def) => fs.existsSync(path.join(ROOT, f)) ? JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')) : def;
// ghi de title/description theo slug (data/seo-overrides.json)
const overrides = readJson('data/seo-overrides.json', {});
// kich thuoc + ban webp cua anh (sinh boi tools/optimize-images.py)
const imgMeta = readJson('data/img-meta.json', {});
// ngay dang / sua cua bai WP (cho schema Article)
const wpDates = new Map(readJson('data/wp-export/_clean.json', []).map(x => [x.slug, { date: x.date, modified: x.modified }]));

// --- gop nguon: rewrite thang WP khi trung slug ---
const bySlug = new Map();
for (const p of wp) bySlug.set(p.slug, p);
for (const p of rewrites) bySlug.set(p.slug, Object.assign({ type: p.slug ? 'service' : 'home' }, p));
const pages = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
const BRAND_SUFFIX = ' | ' + cfg.brandShort;
for (const p of pages) {
  const o = overrides[p.slug];
  if (o && o.title) p.title = o.title;
  if (o && o.description) p.description = o.description;
  // title qua dai (> 65 ky tu) -> bo hau to thuong hieu
  if ([...p.title].length > 65 && p.title.endsWith(BRAND_SUFFIX)) p.title = p.title.slice(0, -BRAND_SUFFIX.length);
}

const DISTRICTS = {
  'nap-muc-may-in-quan-1-nhanh-chong-tan-noi': 'Quận 1',
  'nap-muc-may-in-quan-2-nhanh-chong-gia-re': 'Quận 2',
  'nap-muc-may-in-quan-3-24-7': 'Quận 3',
  'nap-muc-may-in-quan-4-canon-hp-gia-re': 'Quận 4',
  'nap-muc-may-in-quan-5': 'Quận 5',
  'nap-muc-may-in-quan-6': 'Quận 6',
  'nap-muc-in-quan-7-uy-tin-30p-co-mat': 'Quận 7',
  'nap-muc-may-in-quan-8-gia-re-nhanh-chong': 'Quận 8',
  'nap-muc-may-in-quan-9-tan-noi-re-nhat': 'Quận 9 – Thủ Đức',
  'nap-muc-may-in-quan-10': 'Quận 10',
  'nap-muc-may-in-quan-11': 'Quận 11',
  'nap-muc-may-in-quan-binh-tan': 'Bình Tân',
  'nap-muc-may-in-quan-binh-thanh': 'Bình Thạnh',
  'nap-muc-may-in-quan-tan-binh-24-7': 'Tân Bình',
  'nap-muc-may-in-quan-tan-phu-192-22-phu-tho-hoa-tan-phu': 'Tân Phú',
  'nap-muc-may-in-phu-nhuan': 'Phú Nhuận',
  'nap-muc-may-in-binh-chanh-uy-tin-nhanh-re': 'Bình Chánh'
};
const KIENTHUC = 'kien-thuc';
const known = new Set(pages.map(p => p.slug).concat([KIENTHUC]));
const isDistrict = slug => Object.prototype.hasOwnProperty.call(DISTRICTS, slug) ||
  /^(nap-muc|muc-may-in|bom-muc|thay-muc|nap-muc-in)/.test(slug);
const haveImg = new Set(fs.readdirSync(path.join(ROOT, 'assets', 'img')));
const missingLinks = new Map();
const rootFor = slug => slug ? '../'.repeat(slug.split('/').length) : '';

function tpl(s, root) {
  return s
    .replace(/\{\{BASE\}\}/g, root).replace(/\{\{HOME\}\}/g, root || './')
    .replace(/\{\{BRAND\}\}/g, cfg.brand).replace(/\{\{TAGLINE\}\}/g, cfg.tagline)
    .replace(/\{\{HOTLINE_TEL\}\}/g, cfg.hotlineTel).replace(/\{\{HOTLINE2_TEL\}\}/g, cfg.hotline2Tel)
    .replace(/\{\{HOTLINE\}\}/g, cfg.hotlineDisplay).replace(/\{\{HOTLINE2\}\}/g, cfg.hotline2Display)
    .replace(/\{\{ZALO_TEL\}\}/g, cfg.zaloTel).replace(/\{\{EMAIL\}\}/g, cfg.email)
    .replace(/\{\{ADDRESS\}\}/g, cfg.addressFull).replace(/\{\{DOMAIN\}\}/g, cfg.domain)
    .replace(/\{\{YEAR\}\}/g, new Date().getFullYear());
}

const headerTpl = fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8');
const footerTpl = fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8');

function districtLinks(root) {
  return Object.entries(DISTRICTS).filter(([s]) => known.has(s))
    .map(([s, n]) => '<li><a href="' + root + s + '/">Nạp mực ' + n + '</a></li>').join('\n');
}

// --- Menu dong (dropdown) ---
const titleOf = slug => { const p = pages.find(x => x.slug === slug); return p ? p.title.replace(/\s*[|–-].*$/, '').trim() : slug; };
const NAV_GROUPS = [
  { label: 'Nạp mực máy in', items: [
    ['bang-gia-nap-muc-may-photo', 'Bảng giá nạp mực'],
    ['nap-muc-may-in-laser-mau', 'Nạp mực laser màu'],
    ...Object.entries(DISTRICTS).map(([s, n]) => [s, 'Nạp mực ' + n]),
    ['muc-may-in-quan-12-hcm', 'Nạp mực Quận 12'],
    ['nap-muc-may-in-tai-nha', 'Nạp mực tại nhà']
  ] },
  { label: 'Sửa chữa', items: [
    ['sua-may-in-tan-noi-tphcm', 'Sửa máy in tận nơi'],
    ['sua-may-photocopy', 'Sửa máy photocopy'],
    ['sua-may-in-bill', 'Sửa máy in bill'],
    ['cac-loi-may-in-thuong-gap', 'Các lỗi máy in thường gặp'],
    ['danh-sach-may-in-ho-tro-reset', 'Máy in hỗ trợ reset']
  ] },
  { label: 'Mực & Linh kiện', items: [
    ['hop-muc-zin-lk', 'Hộp mực Zin'],
    ['bom-muc-may-in-tan-binh', 'Bơm mực Tân Bình'],
    ['thay-muc-may-in-tan-binh', 'Thay mực Tân Bình'],
    ['mua-may-in-cu-gia-cao', 'Mua máy in cũ giá cao'],
    ['cho-thue-may-photocopy', 'Cho thuê máy photocopy'],
    ['phan-biet-hop-muc-va-cum-drum', 'Phân biệt hộp mực & drum']
  ] }
];

function buildNav(root) {
  let html = '<a href="' + (root || './') + '">Trang chủ</a>\n';
  for (const g of NAV_GROUPS) {
    const items = g.items.filter(([s]) => known.has(s));
    if (!items.length) continue;
    html += '<details class="nav-dd"><summary>' + g.label + '</summary><div class="nav-panel">' +
      items.map(([s, n]) => '<a href="' + root + s + '/">' + n + '</a>').join('') +
      '</div></details>\n';
  }
  html += '<a href="' + root + KIENTHUC + '/">Kiến thức</a>\n';
  if (known.has('gioi-thieu')) html += '<a href="' + root + 'gioi-thieu/">Giới thiệu</a>\n';
  html += '<a href="' + root + (known.has('lien-he') ? 'lien-he/' : '') + '" class="nav-cta-link">Liên hệ</a>\n';
  return html;
}

function resolveInternal(pth, root, attrs, text) {
  const slug = pth.replace(/^\/+|\/+$/g, '').split('?')[0];
  if (slug === '') return '<a href="' + (root || './') + '"' + attrs + '>' + text + '</a>';
  if (known.has(slug)) return '<a href="' + root + slug + '/"' + attrs + '>' + text + '</a>';
  missingLinks.set(slug, (missingLinks.get(slug) || 0) + 1);
  return text; // trang khong ton tai -> bo the <a>, giu chu
}

function localize(html, root, altBase) {
  // placeholder tu tools/from-wp.js
  html = html.replace(/__ROOT__/g, root);
  html = html.replace(/<a([^>]*?)href="__WP__\/([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (m, pre, p, post, text) => resolveInternal(p, root, pre + post, text));
  // anh tuyet doi (ban rewrite tay)
  html = html.replace(/(<img[^>]+src=")https?:\/\/napmucnhanh24h\.com\/wp-content\/uploads\/[^"]*\/([^"\/?]+)(?:\?[^"]*)?(")/gi,
    (m, a, file, b) => a + root + 'assets/img/' + file + b);
  // link tuyet doi (ban rewrite tay)
  html = html.replace(/<a href="https?:\/\/napmucnhanh24h\.com\/([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (m, p, attrs, text) => resolveInternal(p, root, attrs, text));
  // link nhap cua WP (_wp_link_placeholder) -> bo the <a>, giu chu
  html = html.replace(/<a[^>]*href="_wp_link_placeholder"[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  // bao bang cho cuon ngang tren mobile (bo qua bang da duoc bao san)
  html = html.replace(/<div class="table-wrap">\s*<table>([\s\S]*?)<\/table>\s*<\/div>/gi, '<table>$1</table>');
  html = html.replace(/<table>/gi, '<div class="table-wrap"><table>').replace(/<\/table>/gi, '</table></div>');
  // bo the <img> tro toi anh khong con file local (da bi xoa tren host cu)
  html = html.replace(/<img\b[^>]*\bsrc="([^"]*?assets\/img\/([^"\/]+))"[^>]*>/gi,
    (m, src, file) => haveImg.has(file) ? m : '');
  // anh hotlink da chet (Google Sites cu tra ve trang HTML, tienphatcopier.com 404) -> bo
  html = html.replace(/<img\b[^>]*\bsrc="https?:\/\/(sites\.google\.com|tienphatcopier\.com)\/[^"]*"[^>]*>/gi, '');
  // emoji dang anh cua WP (s.w.org) -> ky tu emoji trong alt
  html = html.replace(/<img\b[^>]*\bsrc="https?:\/\/s\.w\.org\/images\/core\/emoji\/[^"]*"[^>]*>/gi,
    m => { const cp = (m.match(/\/([0-9a-f-]+)\.svg"/i) || [])[1]; return cp ? String.fromCodePoint(...cp.split('-').map(h => parseInt(h, 16))) : ''; });
  html = html.replace(/<figure>\s*(<figcaption>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi, '').replace(/<p>\s*<\/p>/gi, '');
  // alt: alt rong hoac alt khong dau sinh tu ten file ("Nap Muc May In Quan 10 - hình 1")
  //  -> lay figcaption neu co, else "<H1 trang> – hình N"
  const plain = s => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().replace(/"/g, '');
  html = html.replace(/<figure>([\s\S]*?)<\/figure>/gi, (m, inner) => {
    const cap = plain((inner.match(/<figcaption>([\s\S]*?)<\/figcaption>/i) || [])[1] || '');
    return cap.length >= 6 ? m.replace(/(<img\b[^>]*?)\balt=""/i, '$1alt="' + cap.slice(0, 120) + '"') : m;
  });
  let n = 0;
  const base = plain(altBase || cfg.brand);
  html = html.replace(/<img\b[^>]*>/gi, tag => {
    n++;
    const alt = (tag.match(/\balt="([^"]*)"/i) || [])[1];
    const asciiFromFile = alt !== undefined && / - hình \d+/.test(alt) && !/[^\x00-\x7f]/.test(alt.split(' - hình')[0]);
    if (alt === undefined) return tag.replace(/<img\b/i, '<img alt="' + base + ' – hình ' + n + '"');
    if (alt === '' || asciiFromFile) return tag.replace(/\balt="[^"]*"/i, 'alt="' + base + ' – hình ' + n + '"');
    return tag;
  });
  // anh: doi sang .webp + gan width/height (chong nhay layout CLS)
  html = html.replace(/<img\b[^>]*>/gi, tag => {
    const m = tag.match(/\bsrc="([^"]*?assets\/img\/)([^"\/]+)"/i);
    const meta = m && imgMeta[decodeURIComponent(m[2])];
    if (!meta) return tag;
    let t = tag.replace(/\s(width|height)="[^"]*"/gi, '');
    if (meta.webp) t = t.replace(m[0], 'src="' + m[1] + meta.webp + '"');
    if (!/\bloading=/i.test(t)) t = t.replace(/<img\b/i, '<img loading="lazy"');
    if (!/\bdecoding=/i.test(t)) t = t.replace(/<img\b/i, '<img decoding="async"');
    return t.replace(/\s*\/?>$/, ' width="' + meta.w + '" height="' + meta.h + '">');
  });
  return html;
}

function decodeEntities(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#(\d+);/g, (m, c) => String.fromCodePoint(+c));
}

// heading khong nhay cap (h1 -> h3, h2 -> h4...): don lai theo thu bac thuc te
function normalizeHeadings(html) {
  const stack = [];
  return html.replace(/<(\/?)h([1-6])\b([^>]*)>/gi, (m, close, lv, attrs) => {
    lv = +lv;
    if (close) return '</h' + (stack.closeLevel || lv) + '>';
    if (lv === 1) { stack.length = 0; stack.push([1, 1]); stack.closeLevel = 1; return m; }
    while (stack.length && stack[stack.length - 1][0] >= lv) stack.pop();
    const lvNew = Math.min(lv, (stack.length ? stack[stack.length - 1][1] : 1) + 1);
    stack.push([lv, lvNew]);
    stack.closeLevel = lvNew;
    return '<h' + lvNew + attrs + '>';
  });
}

function clampDesc(s) {
  s = (s || '').trim();
  if (s.length <= 160) return s;
  let cut = s.slice(0, 158);
  cut = cut.slice(0, cut.lastIndexOf(' '));
  return cut.replace(/[,.;:–-]\s*$/, '') + '…';
}

function layout(o) {
  const root = rootFor(o.slug);
  o.description = clampDesc(o.description);
  const esc = s => (s || '').replace(/"/g, '&quot;');
  const canonical = NOINDEX ? '' : '\n  <link rel="canonical" href="' + cfg.siteUrl + '/' + (o.slug ? o.slug + '/' : '') + '">';
  const robots = NOINDEX ? '\n  <meta name="robots" content="noindex,nofollow">' : '';
  const schemas = [].concat(o.schema || []).filter(Boolean);
  const ld = schemas.length ? '\n' + schemas.map(s => '<script type="application/ld+json">' + JSON.stringify(s) + '</script>').join('\n') : '';
  const ogImg = o.ogImage || (cfg.siteUrl + '/assets/img/og-default.jpg');
  return '<!doctype html>\n<html lang="vi">\n<head>\n' +
    '  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>' + o.title + '</title>\n' +
    '  <meta name="description" content="' + esc(o.description) + '">' + robots + canonical + '\n' +
    '  <meta property="og:type" content="' + (o.ogType || 'website') + '">\n' +
    '  <meta property="og:title" content="' + esc(o.title) + '">\n' +
    '  <meta property="og:description" content="' + esc(o.description) + '">\n' +
    '  <meta property="og:image" content="' + ogImg + '">\n' +
    '  <meta property="og:url" content="' + cfg.siteUrl + '/' + (o.slug ? o.slug + '/' : '') + '">\n' +
    '  <meta property="og:locale" content="vi_VN">\n' +
    '  <meta property="og:site_name" content="' + cfg.brand + '">\n' +
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <meta name="twitter:title" content="' + esc(o.title) + '">\n' +
    '  <meta name="twitter:description" content="' + esc(o.description) + '">\n' +
    '  <meta name="twitter:image" content="' + ogImg + '">\n' +
    '  <link rel="icon" href="' + root + 'assets/img/favicon.svg" type="image/svg+xml">\n' +
    '  <link rel="icon" href="' + root + 'assets/img/favicon-32.png" sizes="32x32" type="image/png">\n' +
    '  <link rel="apple-touch-icon" href="' + root + 'assets/img/apple-touch-icon.png">\n' +
    '  <link rel="stylesheet" href="' + root + 'assets/css/style.css">\n</head>\n<body>\n' +
    tpl(headerTpl, root).replace('{{NAV}}', buildNav(root)) + '\n<main class="wrap">\n' + o.bodyHtml + '\n</main>\n' +
    tpl(footerTpl, root).replace('{{DISTRICT_LINKS}}', districtLinks(root)) + ld + '\n</body>\n</html>\n';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// --- Doanh nghiep (1 thuc the duy nhat, cac trang khac tham chieu qua @id) ---
const DEFAULT_OG = cfg.siteUrl + '/assets/img/og-default.jpg';
const [ohDays, ohTime] = cfg.openingHours.split(' ');
const DAY = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
const dayKeys = Object.keys(DAY);
const [d0, d1] = ohDays.split('-');
const BUSINESS = {
  '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': cfg.siteUrl + '/#business',
  name: cfg.brand, alternateName: 'Nạp Mực Nhanh 24h', description: cfg.tagline, url: cfg.siteUrl + '/',
  logo: cfg.siteUrl + '/assets/img/logo-512.png', image: DEFAULT_OG,
  telephone: ['+84' + cfg.hotlineTel.slice(1), '+84' + cfg.hotline2Tel.slice(1)], email: cfg.email,
  address: { '@type': 'PostalAddress', addressLocality: 'Thành phố Hồ Chí Minh', addressRegion: 'Hồ Chí Minh', addressCountry: 'VN' },
  areaServed: { '@type': 'City', name: 'Thành phố Hồ Chí Minh' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification',
    dayOfWeek: dayKeys.slice(dayKeys.indexOf(d0), dayKeys.indexOf(d1 || d0) + 1).map(k => DAY[k]),
    opens: ohTime.split('-')[0], closes: ohTime.split('-')[1] }],
  priceRange: '40.000đ - 700.000đ', sameAs: ['https://zalo.me/' + cfg.zaloTel]
};
const BUSINESS_REF = { '@type': 'LocalBusiness', '@id': BUSINESS['@id'], name: cfg.brand, telephone: BUSINESS.telephone[0] };
const webpToOrig = new Map(Object.entries(imgMeta).filter(([, m]) => m.webp).map(([f, m]) => [m.webp, f]));
// khu vuc phuc vu cua trang dich vu theo quan
const AREA_SLUG = [[/quan-12/, 'Quận 12'], [/quan-11/, 'Quận 11'], [/tan-binh/, 'Tân Bình'], [/tan-phu/, 'Tân Phú']];
const areaOf = slug => {
  const name = DISTRICTS[slug] || (AREA_SLUG.find(([re]) => re.test(slug)) || [])[1];
  if (!name) return null;
  if (/^Quận/.test(name)) return name.split(' – ')[0];
  return (name === 'Bình Chánh' ? 'Huyện ' : 'Quận ') + name;
};

// --- Bai lien quan: 4 link/trang theo tu khoa chung trong slug, can bang de trang nao cung duoc tro toi ---
const h1Of = slug => { const p = pages.find(x => x.slug === slug); return p ? (p.h1 || titleOf(slug)) : slug; };
const STOP = new Set(['may', 'in', 'cua', 'va', 'la', 'gi', 'cho', 'cach', 'nhu', 'the', 'nao', 'co', 'khong', 'bi', 'gia', 're', 'nhanh', 'chong', 'tan', 'noi', 'hcm', 'tphcm', 'quan', '24', '7', 'uy', 'tin', 'ban', 'can', 'biet', 'nhat', 'don', 'gian', 'vinh', 'vien']);
const NO_RELATED = new Set(['lien-he', 'chinh-sach-quy-dinh-chung', KIENTHUC]);
const words = slug => new Set(slug.split('-').filter(w => !STOP.has(w) && !/^\d+$/.test(w) || /^(mau|kim|laser|phun|bill)$/.test(w)));
const relPool = pages.filter(p => p.slug && !NO_RELATED.has(p.slug));
const chosenCount = new Map(relPool.map(p => [p.slug, 0]));
const related = new Map();
for (const p of relPool) {
  const w = words(p.slug);
  const scored = relPool.filter(q => q.slug !== p.slug).map(q => {
    let s = 0; for (const x of words(q.slug)) if (w.has(x)) s += 1;
    if ((q.type === 'post') === (p.type === 'post')) s += 0.5;
    return [q.slug, s - 0.35 * chosenCount.get(q.slug)];
  }).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s);
  scored.forEach(s => chosenCount.set(s, chosenCount.get(s) + 1));
  related.set(p.slug, scored);
}

let count = 0;
for (const p of pages) {
  const root = rootFor(p.slug);
  let body = localize(p.html, root, p.h1 || p.title);

  if (!p.slug) {
    const hero = '<section class="hero">\n  <h1>' + p.h1 + '</h1>\n  <p>' + p.description + '</p>\n' +
      '  <div class="hero-actions">\n' +
      '    <a class="btn btn-primary" href="tel:' + cfg.hotlineTel + '">Gọi ' + cfg.hotlineDisplay + '</a>\n' +
      '    <a class="btn btn-ghost" href="https://zalo.me/' + cfg.zaloTel + '" rel="nofollow noopener">Nhắn Zalo</a>\n  </div>\n</section>';
    body = body.replace(/<h1>[\s\S]*?<\/h1>/, '');
    const grid = '<h2 id="khu-vuc">Nạp mực máy in theo quận tại TP.HCM</h2>\n<ul class="district-grid">\n' +
      Object.entries(DISTRICTS).filter(([s]) => known.has(s))
        .map(([s, n]) => '<li><a href="' + s + '/">Nạp mực máy in ' + n + '</a></li>').join('\n') +
      '\n</ul>';
    // Dich vu khac
    const svc = [['sua-may-in-tan-noi-tphcm', 'Sửa máy in tận nơi'], ['sua-may-photocopy', 'Sửa máy photocopy'],
      ['bang-gia-nap-muc-may-photo', 'Bảng giá nạp mực'], ['nap-muc-may-in-laser-mau', 'Nạp mực laser màu'],
      ['hop-muc-zin-lk', 'Hộp mực Zin chính hãng'], ['mua-may-in-cu-gia-cao', 'Mua máy in cũ giá cao'],
      ['cho-thue-may-photocopy', 'Cho thuê máy photocopy'], ['danh-sach-may-in-ho-tro-reset', 'Máy in hỗ trợ reset']].filter(([s]) => known.has(s));
    const svcHtml = '<h2>Dịch vụ khác của Trường Phát</h2>\n<ul class="district-grid">\n' +
      svc.map(([s, n]) => '<li><a href="' + s + '/">' + n + '</a></li>').join('\n') + '\n</ul>';
    // Kien thuc moi
    const postList = pages.filter(p => p.type === 'post').slice(0, 8);
    const ktHtml = '<h2>Kiến thức &amp; thủ thuật máy in</h2>\n<ul class="post-list">\n' +
      postList.map(p => '<li><a href="' + p.slug + '/">' + p.title + '</a></li>').join('\n') +
      '\n</ul>\n<p style="margin-top:6px"><a class="btn btn-ghost" href="' + KIENTHUC + '/">Xem tất cả bài viết →</a></p>';
    body = hero + '\n' + body + '\n' + grid + '\n' + svcHtml + '\n' + ktHtml;
  } else if (p.slug !== KIENTHUC) {
    // trang con: them H1 neu chua co (bai WP thuong bat dau bang <p>)
    if (!/^<h1/i.test(body.trim()) && !/<h1[ >]/i.test(body)) {
      body = '<h1>' + p.h1 + '</h1>\n' + body;
    }
    // CTA lien he cuoi bai (bai blog WP khong co)
    if (p.source === 'wp') {
      body += '\n<div class="cta-box">\n<p><strong>Cần nạp mực hoặc sửa máy in tận nơi?</strong> ' + cfg.brand +
        ' có mặt trong 30 phút tại TP.HCM — in test trước khi tính tiền, bảo hành 1 tháng.</p>\n' +
        '<p class="cta-nums"><a href="tel:' + cfg.hotlineTel + '">' + cfg.hotlineDisplay + '</a> · ' +
        '<a href="tel:' + cfg.hotline2Tel + '">' + cfg.hotline2Display + '</a> (Zalo cả 2 số)</p>\n</div>';
    }
  }

  // Bai lien quan (link noi bo theo ngu canh)
  if (p.slug && p.slug !== KIENTHUC && related.has(p.slug)) {
    body += '\n<section class="related">\n<h2>Bài viết liên quan</h2>\n<ul class="post-list">\n' +
      related.get(p.slug).map(s => '<li><a href="' + root + s + '/">' + h1Of(s) + '</a></li>').join('\n') +
      '\n</ul>\n</section>';
  }
  body = normalizeHeadings(body);

  // og:image = anh dau tien trong bai (ban goc jpg/png, tuyet doi), else default
  const firstImg = (body.match(/<img[^>]+src="([^"]*assets\/img\/[^"]+)"/i) || [])[1];
  const ogImage = firstImg ? cfg.siteUrl + '/' + firstImg.replace(/^(\.\.\/)+/, '')
    .replace(/[^\/]+\.webp$/, f => webpToOrig.get(f) || f) : null;
  const url = cfg.siteUrl + '/' + (p.slug ? p.slug + '/' : '');

  const schemaList = [];
  if (!p.slug) schemaList.push(BUSINESS, {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': cfg.siteUrl + '/#website', name: cfg.brand,
    alternateName: 'Nạp Mực Nhanh 24h', url: cfg.siteUrl + '/', inLanguage: 'vi', publisher: BUSINESS_REF
  });
  else if (p.schema && p.schema['@type'] === 'Service') schemaList.push(Object.assign({}, p.schema, { url, provider: BUSINESS_REF }));
  else if (p.type === 'post') {
    const d = wpDates.get(p.slug) || {};
    schemaList.push({
      '@context': 'https://schema.org', '@type': 'Article', headline: p.h1 || p.title,
      description: p.description, image: ogImage || DEFAULT_OG,
      datePublished: d.date ? d.date + '+07:00' : undefined, dateModified: d.modified ? d.modified + '+07:00' : undefined,
      author: { '@type': 'Organization', name: cfg.brand, url: cfg.siteUrl + '/' },
      publisher: BUSINESS_REF, mainEntityOfPage: url, inLanguage: 'vi'
    });
  }
  else if (isDistrict(p.slug)) {
    const area = areaOf(p.slug);
    schemaList.push({
      '@context': 'https://schema.org', '@type': 'Service', name: p.h1 || p.title, description: p.description, url,
      serviceType: 'Nạp mực máy in', image: ogImage || DEFAULT_OG,
      areaServed: area ? { '@type': 'AdministrativeArea', name: area + ', Thành phố Hồ Chí Minh' } : { '@type': 'City', name: 'Thành phố Hồ Chí Minh' },
      provider: BUSINESS_REF,
      ...(DISTRICTS[p.slug] ? { offers: { '@type': 'Offer', priceCurrency: 'VND', price: '90000', description: 'Nạp mực laser đen trắng từ ' + cfg.priceFrom } } : {})
    });
  }
  else schemaList.push({
    '@context': 'https://schema.org', '@type': 'WebPage', name: p.h1 || p.title, description: p.description, url,
    inLanguage: 'vi', isPartOf: { '@id': cfg.siteUrl + '/#website' }
  });
  // BreadcrumbList cho moi trang con (bai blog nam duoi "Kien thuc")
  if (p.slug) {
    const crumbs = [{ name: 'Trang chủ', item: cfg.siteUrl + '/' }];
    if (p.type === 'post') crumbs.push({ name: 'Kiến thức', item: cfg.siteUrl + '/' + KIENTHUC + '/' });
    crumbs.push({ name: p.h1 || p.title, item: url });
    schemaList.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item }))
    });
  }

  write(path.join(ROOT, p.slug ? path.join(p.slug, 'index.html') : 'index.html'),
    layout({ slug: p.slug, title: p.title, description: p.description, bodyHtml: body,
      schema: schemaList, ogImage: ogImage, ogType: p.type === 'post' ? 'article' : 'website' }));
  count++;
}

// --- trang muc luc Kien thuc (liet ke bai blog) ---
const posts = pages.filter(p => p.type === 'post');
const ktBody = '<h1>Kiến thức &amp; thủ thuật máy in</h1>\n' +
  '<p>Tổng hợp hướng dẫn xử lý lỗi, reset mực, mẹo dùng máy in – photocopy từ kỹ thuật ' + cfg.brand + '.</p>\n' +
  '<ul class="post-list">\n' +
  posts.map(p => '<li><a href="../' + p.slug + '/">' + p.title + '</a></li>').join('\n') +
  '\n</ul>';
write(path.join(ROOT, KIENTHUC, 'index.html'), layout({
  slug: KIENTHUC, title: 'Kiến thức & thủ thuật máy in | ' + cfg.brand,
  description: 'Tổng hợp hướng dẫn xử lý lỗi máy in, reset mực, kẹt giấy, mã lỗi photocopy và mẹo dùng máy in văn phòng từ đội kỹ thuật ' + cfg.brand + '.',
  bodyHtml: ktBody,
  schema: [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Kiến thức & thủ thuật máy in',
      url: cfg.siteUrl + '/' + KIENTHUC + '/', isPartOf: { '@type': 'WebSite', name: cfg.brand, url: cfg.siteUrl } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: cfg.siteUrl + '/' },
      { '@type': 'ListItem', position: 2, name: 'Kiến thức', item: cfg.siteUrl + '/' + KIENTHUC + '/' }
    ] }
  ]
}));
count++;

// --- 404 ---
write(path.join(ROOT, '404.html'), layout({
  slug: '', title: 'Không tìm thấy trang | ' + cfg.brand,
  description: 'Trang bạn tìm không còn tồn tại. Gọi ' + cfg.hotlineDisplay + ' để được hỗ trợ ngay.',
  bodyHtml: '<h1>Không tìm thấy trang</h1>\n<p>Đường dẫn này không còn tồn tại trên website. Anh/chị cần nạp mực hoặc sửa máy in, gọi trực tiếp giúp em:</p>\n' +
    '<div class="hero-actions">\n  <a class="btn btn-primary" href="tel:' + cfg.hotlineTel + '">Gọi ' + cfg.hotlineDisplay + '</a>\n  <a class="btn btn-ghost" href="./">Về trang chủ</a>\n</div>'
}));

// --- sitemap + robots ---
const today = new Date().toISOString().slice(0, 10);
const allSlugs = pages.map(p => p.slug).concat([KIENTHUC]);
write(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  allSlugs.map(s => '  <url><loc>' + cfg.siteUrl + '/' + (s ? s + '/' : '') + '</loc><lastmod>' + today + '</lastmod></url>').join('\n') +
  '\n</urlset>\n');
write(path.join(ROOT, 'robots.txt'), NOINDEX
  ? 'User-agent: *\nDisallow: /\n'
  : 'User-agent: *\nAllow: /\n\nSitemap: ' + cfg.siteUrl + '/sitemap.xml\n');

console.log('Da dung ' + count + ' trang (NOINDEX=' + (NOINDEX ? 'bat' : 'tat') + ') — rewrite:' + rewrites.length + ' + wp:' + wp.length + ' (gop trung slug)');
if (missingLinks.size) {
  console.log('\nLink noi bo tro toi trang KHONG con (da bo the <a>, giu chu):');
  [...missingLinks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([s, n]) => console.log('  ' + String(n).padStart(3) + ' ' + s));
}
