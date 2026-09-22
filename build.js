/* Dung toan bo site tinh tu data/pages.json + partials/ + site.config.json
 * Chay:  node build.js            -> ban demo (noindex, cho github.io)
 *        NOINDEX=0 node build.js  -> ban that, cho phep Google index
 * KHONG sua truc tiep file .html o thu muc goc — chung deu la file tu sinh.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pages.json'), 'utf8'));
const NOINDEX = process.env.NOINDEX !== '0';

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

const known = new Set(pages.map(p => p.slug));
const missingLinks = new Map();

function tpl(s, root) {
  return s
    .replace(/\{\{BASE\}\}/g, root)
    .replace(/\{\{HOME\}\}/g, root || './')
    .replace(/\{\{BRAND\}\}/g, cfg.brand)
    .replace(/\{\{TAGLINE\}\}/g, cfg.tagline)
    .replace(/\{\{HOTLINE_TEL\}\}/g, cfg.hotlineTel)
    .replace(/\{\{HOTLINE2_TEL\}\}/g, cfg.hotline2Tel)
    .replace(/\{\{HOTLINE\}\}/g, cfg.hotlineDisplay)
    .replace(/\{\{HOTLINE2\}\}/g, cfg.hotline2Display)
    .replace(/\{\{ZALO_TEL\}\}/g, cfg.zaloTel)
    .replace(/\{\{EMAIL\}\}/g, cfg.email)
    .replace(/\{\{ADDRESS\}\}/g, cfg.addressFull)
    .replace(/\{\{DOMAIN\}\}/g, cfg.domain)
    .replace(/\{\{YEAR\}\}/g, new Date().getFullYear());
}

const headerTpl = fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8');
const footerTpl = fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8');

function districtLinks(root) {
  return Object.entries(DISTRICTS)
    .filter(([slug]) => known.has(slug))
    .map(([slug, name]) => '<li><a href="' + root + slug + '/">Nạp mực ' + name + '</a></li>')
    .join('\n');
}

/** Doi link/anh tuyet doi ve duong dan tuong doi trong site tinh. */
function localize(html, root) {
  html = html.replace(/(<img[^>]+src=")https?:\/\/napmucnhanh24h\.com\/wp-content\/uploads\/[^"]*\/([^"\/]+)(")/gi,
    (m, a, file, b) => a + root + 'assets/img/' + file + b);
  html = html.replace(/<a href="https?:\/\/napmucnhanh24h\.com\/([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (m, p, attrs, text) => {
      const slug = p.replace(/^\/+|\/+$/g, '').split('?')[0];
      if (slug === '') return '<a href="' + (root || './') + '"' + attrs + '>' + text + '</a>';
      if (known.has(slug)) return '<a href="' + root + slug + '/"' + attrs + '>' + text + '</a>';
      missingLinks.set(slug, (missingLinks.get(slug) || 0) + 1);
      return text; // trang chua dung lai -> bo the <a>, giu nguyen chu
    });
  return html;
}

function layout(opts) {
  const slug = opts.slug;
  const root = slug ? '../' : '';
  const esc = s => (s || '').replace(/"/g, '&quot;');
  const canonical = NOINDEX ? '' : '\n  <link rel="canonical" href="' + cfg.siteUrl + '/' + (slug ? slug + '/' : '') + '">';
  const robots = NOINDEX ? '\n  <meta name="robots" content="noindex,nofollow">' : '';
  const ld = opts.schema ? '\n<script type="application/ld+json">' + JSON.stringify(opts.schema) + '</script>' : '';
  return '<!doctype html>\n<html lang="vi">\n<head>\n' +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>' + opts.title + '</title>\n' +
    '  <meta name="description" content="' + esc(opts.description) + '">' + robots + canonical + '\n' +
    '  <meta property="og:type" content="website">\n' +
    '  <meta property="og:title" content="' + esc(opts.title) + '">\n' +
    '  <meta property="og:description" content="' + esc(opts.description) + '">\n' +
    '  <meta property="og:locale" content="vi_VN">\n' +
    '  <link rel="stylesheet" href="' + root + 'assets/css/style.css">\n' +
    '</head>\n<body>\n' +
    tpl(headerTpl, root) + '\n' +
    '<main class="wrap">\n' + opts.bodyHtml + '\n</main>\n' +
    tpl(footerTpl, root).replace('{{DISTRICT_LINKS}}', districtLinks(root)) + ld + '\n' +
    '</body>\n</html>\n';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

let count = 0;
for (const p of pages) {
  const root = p.slug ? '../' : '';
  let body = localize(p.html, root);

  if (!p.slug) {
    const hero = '<section class="hero">\n' +
      '  <h1>' + p.h1 + '</h1>\n' +
      '  <p>' + p.description + '</p>\n' +
      '  <div class="hero-actions">\n' +
      '    <a class="btn btn-primary" href="tel:' + cfg.hotlineTel + '">Gọi ' + cfg.hotlineDisplay + '</a>\n' +
      '    <a class="btn btn-ghost" href="https://zalo.me/' + cfg.zaloTel + '" rel="nofollow noopener">Nhắn Zalo</a>\n' +
      '  </div>\n</section>';
    body = body.replace(/<h1>[\s\S]*?<\/h1>/, '');
    const grid = '<h2 id="khu-vuc">Nạp mực máy in theo quận tại TP.HCM</h2>\n<ul class="district-grid">\n' +
      Object.entries(DISTRICTS).filter(([s]) => known.has(s))
        .map(([s, n]) => '<li><a href="' + s + '/">Nạp mực máy in ' + n + '</a></li>').join('\n') +
      '\n</ul>';
    body = hero + '\n' + body + '\n' + grid;
  }

  const schema = p.schema || (p.slug ? null : {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: cfg.brand,
    description: cfg.tagline,
    telephone: '+84' + cfg.hotlineTel.slice(1),
    email: cfg.email,
    url: cfg.siteUrl,
    areaServed: 'Thành phố Hồ Chí Minh',
    openingHours: cfg.openingHours,
    priceRange: 'từ ' + cfg.priceFrom
  });

  write(path.join(ROOT, p.slug ? path.join(p.slug, 'index.html') : 'index.html'),
    layout({ slug: p.slug, title: p.title, description: p.description, bodyHtml: body, schema: schema }));
  count++;
}

write(path.join(ROOT, '404.html'), layout({
  slug: '',
  title: 'Không tìm thấy trang | ' + cfg.brand,
  description: 'Trang bạn tìm không còn tồn tại. Gọi ' + cfg.hotlineDisplay + ' để được hỗ trợ ngay.',
  bodyHtml: '<h1>Không tìm thấy trang</h1>\n' +
    '<p>Đường dẫn này không còn tồn tại trên website. Anh/chị cần nạp mực hoặc sửa máy in, gọi trực tiếp giúp em:</p>\n' +
    '<div class="hero-actions">\n' +
    '  <a class="btn btn-primary" href="tel:' + cfg.hotlineTel + '">Gọi ' + cfg.hotlineDisplay + '</a>\n' +
    '  <a class="btn btn-ghost" href="./">Về trang chủ</a>\n</div>'
}));

const today = new Date().toISOString().slice(0, 10);
write(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map(p => '  <url><loc>' + cfg.siteUrl + '/' + (p.slug ? p.slug + '/' : '') + '</loc><lastmod>' + today + '</lastmod></url>').join('\n') +
  '\n</urlset>\n');

write(path.join(ROOT, 'robots.txt'), NOINDEX
  ? 'User-agent: *\nDisallow: /\n'
  : 'User-agent: *\nAllow: /\n\nSitemap: ' + cfg.siteUrl + '/sitemap.xml\n');

console.log('Da dung ' + count + ' trang (NOINDEX=' + (NOINDEX ? 'bat' : 'tat') + ')');
if (missingLinks.size) {
  console.log('\nLink noi bo tro toi trang CHUA dung lai (da bo the <a>, giu nguyen chu):');
  [...missingLinks.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log('  ' + String(n).padStart(3) + ' ' + s));
}
