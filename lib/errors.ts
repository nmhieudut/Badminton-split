/**
 * Câu duy nhất người dùng thấy khi hệ thống thiếu cấu hình hoặc không kết nối
 * được hạ tầng. Không nêu tên biến môi trường, tên dịch vụ hay cách khắc phục —
 * người dùng không sửa được những thứ đó, và phơi ra chỉ giúp người dò tìm.
 */
const THONG_BAO_CHUNG = 'Hệ thống đang trục trặc. Vui lòng thử lại sau ít phút.';

/**
 * Lỗi cấu hình phía máy chủ.
 *
 * Chi tiết đi vào log của server để người vận hành đọc; người dùng chỉ nhận câu
 * chung ở trên. Dùng cho biến môi trường thiếu, dịch vụ ngoài không gọi được —
 * KHÔNG dùng cho lỗi nhập liệu, vì loại đó người dùng sửa được và cần biết rõ
 * mình sai chỗ nào.
 */
export class ConfigError extends Error {
  constructor(chiTiet: string) {
    super(THONG_BAO_CHUNG);
    this.name = 'ConfigError';
    console.error(`[cấu hình] ${chiTiet}`);
  }
}
