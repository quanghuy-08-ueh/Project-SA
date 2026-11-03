# MPO Purchase Platform

Prototype hệ thống thông tin quản lý hoạt động thu mua (Masan Purchasing Organization),
thực hiện cho đồ án môn **Phân tích và thiết kế hệ thống**.

**Xem trực tiếp:** https://quanghuy-08-ueh.github.io/Project-SA/

## Phạm vi

Bám theo phần 2 và phần 3 của báo cáo nhóm:

- **Mạch 6 quy trình** — sàng lọc & đấu thầu, phân loại Tier, hợp đồng & NDA,
  PR/PO & giao hàng, IQC & truy xuất nguồn gốc, đánh giá & ESG.
- **11 vai trò** theo Bảng 3.3, có chuyển đổi trực tiếp trên giao diện. Đổi vai trò thì
  menu, cột dữ liệu và gợi ý của trợ lý đổi theo (RBAC + ABAC, phân tách nhiệm vụ SoD).
- **Cổng nhà cung cấp** tách riêng, cô lập dữ liệu theo mã tổ chức.
- **Phân tích & mô hình hoá dữ liệu** — mỗi câu hỏi nghiệp vụ dùng một dạng biểu diễn
  phù hợp, kèm sơ đồ thực thể (ERD) của mục 3.3.
- **Trang kiến trúc** — ba tầng Presentation / Business / Data, với AI Assistant là
  năng lực xuyên suốt cả ba tầng chứ không phải tầng thứ tư.

## Lưu ý

Toàn bộ số liệu là **dữ liệu demo**, không phải dữ liệu vận hành của Masan Consumer.
Bảng màu là đề xuất suy ra từ logo trên trang chủ công ty, không phải brand guideline chính thức.

Bản trên GitHub Pages chạy ở chế độ ngoại tuyến: xem được mọi màn hình, nhưng thao tác
không được lưu và trợ lý chạy theo kịch bản dựng sẵn. Bản đầy đủ (dữ liệu dùng chung +
trợ lý gọi Claude thật) chạy trên claude.ai.

## Nối trợ lý với Claude thật

Bản trên GitHub Pages mặc định dùng bộ trả lời nội bộ. Muốn trợ lý gọi Claude thật:

1. Triển khai `worker.js` lên Cloudflare Workers — hướng dẫn từng bước nằm ngay
   trong phần chú thích đầu file.
2. Đặt API key của Anthropic làm biến bí mật `ANTHROPIC_API_KEY` trong worker.
3. Mở trang, bấm biểu tượng bánh răng trong khung trợ lý, dán URL worker, bấm
   **Lưu & thử**.

Worker giữ API key ở phía máy chủ, chỉ nhận request từ các origin được liệt kê
trong `ALLOWED`, giới hạn độ dài prompt và số lượt mỗi IP mỗi ngày. Không bao giờ
đặt API key trực tiếp trong trang: mã nguồn trang tĩnh ai cũng đọc được.

## Kỹ thuật

Một trang HTML duy nhất, không cần build. React 18 + Babel standalone nạp từ CDN,
CSS viết tay theo design tokens, biểu đồ và sơ đồ vẽ bằng SVG thuần.
