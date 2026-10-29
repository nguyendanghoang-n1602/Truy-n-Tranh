# ⚡ MangaMotion AI Studio Pro
> **Công Cụ Chuyển Đổi Trang Truyện Tranh Thành Video Hành Động Chuyên Nghiệp (Senior Architecture)**

MangaMotion AI Studio là giải pháp phần mềm chuyên sâu chuyển đổi các trang manga, comic, webtoon tĩnh thành video hành động ngắn (Motion Comic) với kỹ xảo anime 60 FPS, camera 2.5D điện ảnh và hệ thống âm thanh tổng hợp thời gian thực.

---

## 🌟 Tính Năng Nổi Bật (Senior Features)

1. **AI / CV Panel Detection (Tự Động Phát Hiện Khung Truyện)**:
   - Thuật toán thị giác máy tính phân tích mật độ rãnh ngăn (gutter segmentation) để tự động cắt các trang truyện thành từng panel riêng biệt theo thứ tự đọc (Manga RTL hoặc Webtoon LTR).
   - Giao diện trực quan cho phép chỉnh sửa khung cắt (Bounding Box Editor), kéo thả, thêm cảnh mới.

2. **Cinematic 2.5D Camera Engine (Ống Kính Điện Ảnh)**:
   - Dynamic Ken Burns (Zoom-in, Zoom-out, Pan mượt mà).
   - Non-linear Easing curves (`easeInOutCubic`, `easeOutExpo`).
   - Góc máy nghiêng động (Dutch Angle Tilt).
   - **Vật lý rung chấn va đập (Decaying Impact Shake)**: Dao động suy giảm tắt dần $A \cdot e^{-\lambda t} \cdot \cos(\omega t)$ tạo cảm giác đòn đánh cực kỳ uy lực.

3. **Procedural 60 FPS Manga Action VFX (Kỹ Xảo Đồ Họa Động)**:
   - **Manga Focus Lines**: Đường tập trung hướng tâm kinh điển của Shonen Manga với độ rung ngẫu nhiên từng frame.
   - **Speed Streak Lines**: Đường tốc độ xé gió theo góc chuyển động.
   - **Energy Slash Arc**: Vệt chém hình trăng lưỡi liềm phát sáng neon với hiệu ứng bloom.
   - **Impact Shockwave**: Vòng xung kích mở rộng khi va chạm.
   - **Screen Impact Flash**: Chớp sáng va đập 1-2 frames đặc trưng của Sakuga Anime.
   - **Sparks & Debris System**: Hệ thống hạt tia lửa và mảnh vỡ vật lý.

4. **Web Audio Procedural Foley Synthesizer (Âm Thanh Kỹ Xảo Tự Động)**:
   - Sử dụng Web Audio API để tự tổng hợp âm thanh hiệu ứng (SFX) mà không cần tải file mp3 bên ngoài:
     - `playBladeSlash`: Tiếng chém kiếm kim loại vang dội.
     - `playHeavyImpact`: Tiếng nổ trầm rung chuyển màn hình.
     - `playWhoosh`: Tiếng lướt xé gió thần tốc.
     - `playLightning`: Tiếng sấm sét giật điện.
     - `playCharge`: Tiếng tụ khí thức tỉnh năng lượng.
   - Âm thanh được lồng ghép trực tiếp vào luồng video khi xuất file.

5. **Bộ Xuất Video Đa Định Dạng (High-Bitrate Video Exporter)**:
   - Xuất trực tiếp video MP4 / WebM chuẩn 60 FPS, độ phân giải 1080p, 720p.
   - Hỗ trợ tỉ lệ khung hình: **16:9 Ngang** (YouTube/PC), **9:16 Dọc** (TikTok/Shorts/Reels), **1:1 Vuông** (Feed).
   - Tiến trình Render thời gian thực với thanh Progress Bar.

6. **Cổng Kết Nối AI Video Bridge (Runway, Kling, ComfyUI)**:
   - Tự động biên dịch cấu hình chuyển động của từng khung truyện thành prompt và payload JSON cho Runway Gen-3, Kling 1.5 và ComfyUI AnimateDiff Workflow.

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

Ứng dụng hiện đang được chạy trên máy tại:
👉 **`http://localhost:3000/`**

### Cách mở và trải nghiệm:
1. Mở trình duyệt (Chrome, Edge, Brave...) và truy cập `http://localhost:3000/`.
2. **Xem cảnh mẫu**:
   - Nhấp vào **"🗡️ Kiếm Sĩ Trảm Quỷ (Manga)"** hoặc **"⚡ Thợ Săn Lôi Đình (Webtoon)"** ở thanh trên cùng.
   - Nhấn nút **Play (▶️)** để thưởng thức chuỗi video hành động với âm thanh, camera zoom và hiệu ứng chém/nổ.
3. **Thử nghiệm Kỹ xảo (Director FX)**:
   - Chọn một panel ở danh sách bên trái.
   - Chọn chế độ hành động nhanh: **🗡️ Nhất Trảm Kiếm**, **💥 Va Đập Bộc Phá**, **🌪️ Tốc Biến Lướt**, **⚡ Thức Tỉnh Năng Lượng**.
   - Tinh chỉnh các thanh trượt: Zoom, Góc nghiêng, Cường độ rung, Đường tập trung, Vệt chém.
4. **Sử dụng trang truyện riêng**:
   - Nhấp vào **"📁 Tải Trang Khác"** để upload ảnh truyện bất kỳ từ máy tính của bạn.
   - Nhấp **"✨ Tự Động Quét Panel (AI CV)"** để hệ thống tự động cắt và xếp kịch bản.
5. **Xuất Video**:
   - Nhấp **"🎬 Xuất Video (MP4/WebM)"** -> Chọn độ phân giải (1080p hoặc 9:16 Shorts) -> Nhấn **"🚀 Bắt Đầu Render Video"** -> Tải file video về máy!

---

## 📂 Cấu Trúc Mã Nguồn

```
d:/Truyện Tranh/
├── index.html                  # Giao diện Studio chính
├── package.json                # Cấu hình dự án & dependencies
├── vite.config.js              # Cấu hình Vite server
├── public/
│   └── samples/                # Tài nguyên ảnh manga/webtoon độ phân giải cao
│       ├── sample1_samurai.jpg
│       └── sample2_hunter.jpg
└── src/
    ├── main.js                 # Controller chính & Game Loop 60 FPS
    ├── styles.css              # Hệ thống Design System Obsidian Cyberpunk
    ├── core/
    │   ├── panelDetector.js    # Thị giác máy tính nhận diện khung truyện
    │   ├── cameraEngine.js     # Camera 2.5D, Ken Burns, Rung chấn va chạm
    │   ├── vfxEngine.js        # Kỹ xảo Action Focus Lines, Slash Arc, Flash, Sparks
    │   ├── audioSynthesizer.js # Bộ tổng hợp âm thanh Web Audio API
    │   ├── videoExporter.js    # Engine xuất video 60 FPS MP4/WebM
    │   └── aiBridge.js         # Kết nối Runway/Kling/ComfyUI
    └── data/
        └── samples.js          # Dữ liệu kịch bản hành động mẫu
```
