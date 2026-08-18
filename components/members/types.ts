import type { ViewMemberWithQr, ViewSettlementRow } from '../../lib/view-types';

/** Values entered in the add/edit form for a single member. */
export interface MemberFormValues {
  name: string;
  phone: string;
  isPermanent: boolean;
  /** Newly picked QR image (already compressed). Empty means keep the existing one. */
  qrFile: File | null;
}

export type MemberFilter = 'all' | 'permanent' | 'guest' | 'has_qr' | 'no_qr';

export type { ViewMemberWithQr, ViewSettlementRow };
