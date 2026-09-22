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

// --- gop nguon: rewrite thang WP khi trung slug ---
const bySlug = new Map();
for (const p of wp) bySlug.set(p.slug, p);
for (const p of rewrites) bySlug.set(p.slug, Object.assign({ type: p.slug ? 'service' : 'home' }, p));
const pages = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));

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

function resolveInternal(pth, root, attrs, text) {
  const slug = pth.replace(/^\/+|\/+$/g, '').split('?')[0];
  if (slug === '') return '<a href="' + (root || './') + '"' + attrs + '>' + text + '</a>';
  if (known.has(slug)) return '<a href="' + root + slug + '/"' + attrs + '>' + text + '</a>';
  missingLinks.set(slug, (missingLinks.get(slug) || 0) + 1);
  return text; // trang khong ton tai -> bo the <a>, giu chu
}

function localize(html, root) {
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
  // bao bang cho cuon ngang tren mobile
  html = html.replace(/<table>/gi, '<div class="table-wrap"><table>').replace(/<\/table>/gi, '</table></div>');
  // bo the <img> tro toi anh khong con file local (da bi xoa tren host cu)
  html = html.replace(/<img\b[^>]*\bsrc="([^"]*?assets\/img\/([^"\/]+))"[^>]*>/gi,
    (m, src, file) => haveImg.has(file) ? m : '');
  return html;
}

function layout(o) {
  const root = rootFor(o.slug);
  const esc = s => (s || '').replace(/"/g, '&quot;');
  const canonical = NOINDEX ? '' : '\n  <link rel="canonical" href="' + cfg.siteUrl + '/' + (o.slug ? o.slug + '/' : '') + '">';
  const robots = NOINDEX ? '\n  <meta name="robots" content="noindex,nofollow">' : '';
  const ld = o.schema ? '\n<script type="application/ld+json">' + JSON.stringify(o.schema) + '</script>' : '';
  return '<!doctype html>\n<html lang="vi">\n<head>\n' +
    '  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>' + o.title + '</title>\n' +
    '  <meta name="description" content="' + esc(o.description) + '">' + robots + canonical + '\n' +
    '  <meta property="og:type" content="website">\n' +
    '  <meta property="og:title" content="' + esc(o.title) + '">\n' +
    '  <meta property="og:description" content="' + esc(o.description) + '">\n' +
    '  <meta property="og:locale" content="vi_VN">\n' +
    '  <link rel="stylesheet" href="' + root + 'assets/css/style.css">\n</head>\n<body>\n' +
    tpl(headerTpl, root) + '\n<main class="wrap">\n' + o.bodyHtml + '\n</main>\n' +
    tpl(footerTpl, root).replace('{{DISTRICT_LINKS}}', districtLinks(root)) + ld + '\n</body>\n</html>\n';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

let count = 0;
for (const p of pages) {
  const root = rootFor(p.slug);
  let body = localize(p.html, root);

  if (!p.slug) {
    const hero = '<section class="hero">\n  <h1>' + p.h1 + '</h1>\n  <p>' + p.description + '</p>\n' +
      '  <div class="hero-actions">\n' +
      '    <a class="btn btn-primary" href="tel:' + cfg.hotlineTel + '">Gọi ' + cfg.hotlineDisplay + '</a>\n' +
      '    <a class="btn btn-ghost" href="https://zalo.me/' + cfg.zaloTel + '" rel="nofollow noopener">Nhắn Zalo</a>\n  </div>\n</section>';
    body = body.replace(/<h1>[\s\S]*?<\/h1>/, '');
    const grid = '<h2 id="khu-vuc">Nạp mực máy in theo quận tại TP.HCM</h2>\n<ul class="district-grid">\n' +
      Object.entries(DISTRICTS).filter(([s]) => known.has(s))
        .map(([s, n]) => '<li><a href="' + s + '/">Nạp mực máy in ' + n + '</a></li>').join('\n') +
      '\n</ul>\n<p style="text-align:center;margin-top:8px"><a class="btn btn-ghost" href="' + KIENTHUC + '/">Xem kiến thức &amp; thủ thuật máy in →</a></p>';
    body = hero + '\n' + body + '\n' + grid;
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

  let schema = p.schema;
  if (!schema && !p.slug) schema = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: cfg.brand, description: cfg.tagline,
    telephone: '+84' + cfg.hotlineTel.slice(1), email: cfg.email, url: cfg.siteUrl,
    areaServed: 'Thành phố Hồ Chí Minh', openingHours: cfg.openingHours, priceRange: 'từ ' + cfg.priceFrom
  };
  if (!schema && p.type === 'post') schema = {
    '@context': 'https://schema.org', '@type': 'Article', headline: p.title,
    description: p.description, publisher: { '@type': 'Organization', name: cfg.brand }, inLanguage: 'vi'
  };

  write(path.join(ROOT, p.slug ? path.join(p.slug, 'index.html') : 'index.html'),
    layout({ slug: p.slug, title: p.title, description: p.description, bodyHtml: body, schema: schema }));
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
  description: 'Hướng dẫn xử lý lỗi máy in, reset mực, mẹo dùng máy photocopy từ ' + cfg.brand + '.',
  bodyHtml: ktBody, schema: null
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
