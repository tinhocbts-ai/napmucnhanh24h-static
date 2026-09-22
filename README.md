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

## Phạm vi hiện tại & việc còn lại

- **Đã dựng:** 20 trang dịch vụ (nạp mực Q1–Q11, Bình Tân/Thạnh, Tân Bình/Phú, Phú Nhuận,
  Bình Chánh, bảng giá, sửa máy in, phân biệt hộp mực/drum) + trang chủ = **21 trang**.
  Phủ ~43 click/3 tháng trong GSC.
- **Còn thiếu:** ~200 bài blog cũ (corel x7, lỗi máy photo Ricoh/Toshiba, spooler…) ~156 click/3 tháng.
  Nội dung đầy đủ nằm trong WordPress; cần **export All content (.xml)** sau khi host được phục hồi,
  rồi bổ sung vào `data/rewrites/` và build lại — pipeline đã sẵn sàng tái dùng.
