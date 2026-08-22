/**
 * Compresses an image file (e.g. uploaded QR code photo) to a compact Base64 JPEG data URL.
 * Keeps resolution sharp for QR scanning while keeping payload small (~30-60KB).
 */
export async function compressImageFile(
  file: File,
  maxDimension = 600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)!'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Lỗi khi tải hình ảnh'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo bộ xử lý đồ họa Canvas'));
          return;
        }

        // Fill white background in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses the image in the browser and rewraps it as a File so a Server
 * Action can push it straight to Storage — QR screenshots are usually 2-4MB,
 * and sending the original is very slow.
 */
export async function toCompressedQrFile(file: File): Promise<File> {
  const dataUrl = await compressImageFile(file, 600, 0.85);
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'qr.jpg', { type: 'image/jpeg' });
}
