// Doc cac file data/rewrites/*__rewrite.md -> data/pages.json
// Chi lay phan "## Noi dung mo i" lam body, meta lay tu bang DIFF.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'rewrites');
const OUT = path.join(__dirname, '..', 'data', 'pages.json');

function cell(row) {
  const SEP = String.fromCharCode(1);
  const c = row.replace(/\\\|/g, SEP).split("|").map(s => s.trim().split(SEP).join("|"));
  return c[c.length - 2] || '';
}

function parseMeta(md) {
  const meta = { title: '', description: '' };
  for (const line of md.split('\n')) {
    if (/^\|\s*Title\s*\|/i.test(line)) meta.title = cell(line);
    else if (/^\|\s*Description\s*\|/i.test(line)) meta.description = cell(line);
  }
  return meta;
}

function sliceBody(md) {
  const start = md.indexOf('## Nội dung mới');
  if (start < 0) return '';
  const rest = md.slice(start + '## Nội dung mới'.length);
  const stop = rest.search(/\n## (Schema|Internal links|Lưu ý|Checklist|Ghi chú)/);
  return (stop < 0 ? rest : rest.slice(0, stop)).trim();
}

function parseSchema(md) {
  const m = md.match(/## Schema JSON-LD[^\n]*\n+```json\n([\s\S]*?)```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

// ---- markdown -> html (subset du dung cho cac file rewrite) ----
function inline(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const flushTable = () => {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
    if (rows.length < 2) { rows.forEach(r => out.push('<p>' + inline(r) + '</p>')); return; }
    const cells = r => r.replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells);
    out.push('<div class="table-wrap"><table>');
    out.push('<thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>');
    body.forEach(r => out.push('<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'));
    out.push('</tbody></table></div>');
  };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    if (t.startsWith('|')) { flushTable(); continue; }
    if (/^###\s*H1:/i.test(t)) { out.push('<h1>' + inline(t.replace(/^###\s*H1:\s*/i, '')) + '</h1>'); i++; continue; }
    if (/^###\s*H2:/i.test(t)) { out.push('<h2>' + inline(t.replace(/^###\s*H2:\s*/i, '')) + '</h2>'); i++; continue; }
    if (/^####\s*H3:/i.test(t)) { out.push('<h3>' + inline(t.replace(/^####\s*H3:\s*/i, '')) + '</h3>'); i++; continue; }
    if (/^####\s/.test(t)) { out.push('<h3>' + inline(t.replace(/^####\s*/, '')) + '</h3>'); i++; continue; }
    if (/^###\s/.test(t)) { out.push('<h2>' + inline(t.replace(/^###\s*/, '')) + '</h2>'); i++; continue; }
    if (t === '---') { i++; continue; }
    if (/^#{1,6}s/.test(t)) { const lvl = Math.min(t.match(/^#+/)[0].length, 4); out.push('<h' + lvl + '>' + inline(t.replace(/^#+s*/, '')) + '</h' + lvl + '>'); i++; continue; }
    if (t.startsWith('<')) { // raw html block (img, div...)
      out.push(t); i++; continue;
    }
    if (/^>\s?/.test(t)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) buf.push(lines[i++].trim().replace(/^>\s?/, ''));
      out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>');
      continue;
    }
    if (/^[-*]\s/.test(t)) {
      out.push('<ul>');
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) out.push('<li>' + inline(lines[i++].trim().replace(/^[-*]\s/, '')) + '</li>');
      out.push('</ul>');
      continue;
    }
    if (/^\d+\.\s/.test(t)) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) out.push('<li>' + inline(lines[i++].trim().replace(/^\d+\.\s/, '')) + '</li>');
      out.push('</ol>');
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^([-*>|#]|\d+\.)/.test(lines[i].trim()) && !lines[i].trim().startsWith('<')) buf.push(lines[i++].trim());
    if (buf.length) out.push('<p>' + inline(buf.join(' ')) + '</p>');
    else { out.push('<p>' + inline(t) + '</p>'); i++; } // chan vong lap vo tan
  }
  return out.join('\n');
}

const pages = [];
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('__rewrite.md'))) {
  const md = fs.readFileSync(path.join(DIR, f), 'utf8');
  const slug = f.replace('__rewrite.md', '');
  const meta = parseMeta(md);
  const body = sliceBody(md);
  if (!body) { console.warn('  BO QUA (khong co phan Noi dung moi):', f); continue; }
  const html = mdToHtml(body);
  const h1 = (body.match(/^###\s*H1:\s*(.+)$/m) || [])[1] || meta.title;
  pages.push({
    slug: slug === '_homepage' ? '' : slug,
    source: f,
    title: meta.title || h1,
    description: meta.description,
    h1,
    schema: parseSchema(md),
    html
  });
}
pages.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(OUT, JSON.stringify(pages, null, 1));
console.log('Da parse', pages.length, 'trang ->', path.relative(process.cwd(), OUT));
pages.forEach(p => console.log('  ', (p.slug || '(trang chu)').padEnd(56), p.html.length + ' ky tu'));
