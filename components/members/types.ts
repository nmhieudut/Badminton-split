import type { ViewMemberWithQr, ViewSettlementRow } from '../../lib/view-types';

/** Giá trị người dùng nhập ở form thêm/sửa một thành viên. */
export interface MemberFormValues {
  name: string;
  phone: string;
  isPermanent: boolean;
  /** Ảnh QR mới chọn (đã nén). Bỏ trống nghĩa là giữ nguyên ảnh cũ. */
  qrFile: File | null;
}

export type MemberFilter = 'all' | 'permanent' | 'guest' | 'has_qr' | 'no_qr';

export type { ViewMemberWithQr, ViewSettlementRow };
