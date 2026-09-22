# napmucnhanh24h-static — bản tĩnh của napmucnhanh24h.com

Site tĩnh thay thế WordPress (napmucnhanh24h.com bị nhiễm mã độc cloaking tiếng Nhật —
toàn bộ trang trả HTML trắng cho khách, chỉ hiện shop Nhật giả cho Googlebot). Bản tĩnh này
chạy trên GitHub Pages, dùng chung tài khoản `tinhocbts-ai` với repo `tinhocht-static`.

**Demo (noindex):** https://tinhocbts-ai.github.io/napmucnhanh24h-static/

## Nguyên tắc bất di bất dịch

1. **KHÔNG đổi slug URL.** Mỗi trang giữ nguyên 100% đường dẫn gốc trên WordPress để không mất
   ranking. 14/21 trang đang có traffic thật trong GSC — đổi URL là mất hạng.
2. **Chỉ liên hệ, không giỏ hàng.** Mọi CTA là gọi hotline / Zalo. Không có checkout, không giỏ hàng.
3. **Không tự sáng tác nội dung.** Nội dung lấy từ các bản rewrite đã duyệt trong
   `data/rewrites/*__rewrite.md` (copy từ project `napmucnhanh24h/seo/03_onpage/content_briefs`).

## Quy trình build

```bash
node tools/parse-rewrites.js   # doc data/rewrites/*.md -> data/pages.json
node build.js                  # dung toan bo HTML tinh + sitemap (mac dinh: noindex, cho github.io)
node serve.js                  # xem thu: http://localhost:8124
```

## Khi gắn domain thật napmucnhanh24h.com

```bash
NOINDEX=0 node build.js        # bo the noindex, robots.txt cho phep index, them canonical
```

rồi thêm file `CNAME` chứa `napmucnhanh24h.com` và trỏ DNS về GitHub Pages.
**Chỉ làm bước này sau khi đã dọn sạch mã độc trên host cũ / hạ hosting cũ** — tránh 2 nơi cùng phản hồi.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `site.config.json` | Thông tin dùng chung (brand, hotline, email). Sửa ở đây rồi build lại. |
| `data/rewrites/*__rewrite.md` | Nguồn nội dung từng trang (đã duyệt). |
| `data/pages.json` | File trung gian do `parse-rewrites.js` sinh ra. |
| `partials/header.html`, `footer.html` | Header/footer dùng chung. |
| `assets/css/style.css` | Toàn bộ CSS. |
| `assets/img/` | Ảnh thật tải về từ site cũ (37 ảnh). |
| `build.js` | Bộ dựng site. **File `.html` ở thư mục gốc là tự sinh — không sửa tay.** |

## Phạm vi

- **78 trang tĩnh:** 21 bản rewrite tay (dịch vụ quận + bảng giá + sửa máy in) + 75 trang kéo full
  từ WordPress (47 bài blog + 28 trang) — gộp theo slug, bản rewrite tay ưu tiên — + mục lục Kiến thức.
- Giữ nguyên 100% URL cũ (lấy từ field `link` của WP). Chỉ liên hệ, đã loại toàn bộ trang WooCommerce
  (cart/checkout/tài khoản…). Ảnh: 182 file tải về local từ host.
- **Nguồn WP:** `data/wp-export/_clean.json` (snapshot REST toàn bộ nội dung, chạy `tools/from-wp.js`
  để tái tạo). Kéo lại khi cần: xem `tools/` — REST API `/wp-json/wp/v2/{posts,pages}` + Application Password.

### Cập nhật nội dung
- Trang dịch vụ (chất lượng cao): sửa `data/rewrites/*__rewrite.md` → `node tools/parse-rewrites.js`.
- Bài blog cũ: sửa `data/wp-export/_clean.json` (hoặc kéo lại từ WP) → `node tools/from-wp.js`.
- Rồi `node build.js`. Bài mất hẳn không cứu được: `cach-cai-dat-corel-x7-crack-vinh-vien` (24 click,
  bài crack — cân nhắc có nên viết lại không).
