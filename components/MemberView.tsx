'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { Search, Sparkles, TriangleAlert, UserPlus, Users } from 'lucide-react';
import { createMember, removeMemberFromMonth, updateMember } from '../app/actions/members';
import { formatVND } from '../lib/money';
import type { ViewMemberWithQr, ViewSettlementRow } from '../lib/view-types';
import { ConfirmDialog } from './ConfirmDialog';
import { BulkAddPanel } from './members/BulkAddPanel';
import { MemberCard } from './members/MemberCard';
import { MemberFormPanel } from './members/MemberFormPanel';
import { QrLightbox } from './members/QrLightbox';
import type { MemberFilter, MemberFormValues } from './members/types';

interface MemberViewProps {
  monthKey: string;
  members: ViewMemberWithQr[];
  settlementRows: ViewSettlementRow[];
  sessionCount: number;
}

export const MemberView: React.FC<MemberViewProps> = ({
  monthKey,
  members,
  settlementRows,
  sessionCount,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'single' | 'bulk'>('list');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  /** Đổi giá trị để buộc form dựng lại (xóa trắng ô nhập) — chỉ khi thực sự cần. */
  const [formKey, setFormKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MemberFilter>('all');

  const [previewQrMember, setPreviewQrMember] = useState<ViewMemberWithQr | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ViewMemberWithQr | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const rowByMemberId = useMemo(
    () => new Map(settlementRows.map((r) => [r.memberId, r])),
    [settlementRows]
  );

  const editingMember = editingMemberId
    ? (members.find((m) => m.id === editingMemberId) ?? null)
    : null;

  const run = (action: () => Promise<void>, onDone?: () => void) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await action();
        onDone?.();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra, thử lại nhé');
      }
    });
  };

  const goToList = () => {
    setEditingMemberId(null);
    setErrorMessage(null);
    setActiveTab('list');
  };

  const handleStartAdd = () => {
    // Bấm lại đúng tab đang mở thì không được xóa những gì đang gõ dở.
    if (activeTab === 'single' && !editingMemberId) return;
    setEditingMemberId(null);
    setErrorMessage(null);
    setFormKey((k) => k + 1);
    setActiveTab('single');
  };

  const handleStartEdit = (m: ViewMemberWithQr) => {
    setEditingMemberId(m.id);
    setErrorMessage(null);
    setFormKey((k) => k + 1);
    setActiveTab('single');
  };

  const handleSubmitForm = (values: MemberFormValues, keepOpen: boolean) => {
    const input = {
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      // Server Action ghi đè color bằng giá trị nhận được, nên phải gửi lại màu cũ.
      color: editingMember?.color ?? null,
      isPermanent: values.isPermanent,
      qrFile: values.qrFile,
    };

    if (editingMemberId) {
      const id = editingMemberId;
      run(
        () => updateMember(monthKey, id, input),
        () => goToList()
      );
      return;
    }

    run(
      () => createMember(monthKey, input).then(() => undefined),
      () => {
        if (keepOpen) {
          // Giữ form mở, chỉ xóa trắng để gõ tiếp người kế tiếp.
          setFormKey((k) => k + 1);
        } else {
          goToList();
        }
      }
    );
  };

  const handleBulkAdd = (names: string[]) => {
    if (names.length === 0) return;
    run(
      async () => {
        for (const n of names) {
          await createMember(monthKey, { name: n, isPermanent: true });
        }
      },
      () => goToList()
    );
  };

  const handleRequestRemove = (m: ViewMemberWithQr) => {
    const row = rowByMemberId.get(m.id);
    const hasHistory = !!row && (row.sessionsAttendedCount > 0 || row.totalPaid > 0);

    // Người vừa gõ nhầm tên, chưa dính buổi nào, chưa ứng đồng nào: gỡ thẳng.
    if (!hasHistory) {
      handleRemove(m.id);
      return;
    }
    setMemberToRemove(m);
  };

  const handleRemove = (memberId: string) => {
    run(
      () => removeMemberFromMonth(monthKey, memberId),
      () => {
        setMemberToRemove(null);
        if (editingMemberId === memberId) goToList();
      }
    );
  };

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return members.filter((m) => {
      const matchSearch =
        !q || m.name.toLowerCase().includes(q) || (m.phone ?? '').includes(q);
      if (!matchSearch) return false;

      if (filterType === 'permanent') return m.isPermanent;
      if (filterType === 'guest') return !m.isPermanent;
      if (filterType === 'has_qr') return !!m.qrImagePath;
      if (filterType === 'no_qr') return !m.qrImagePath;
      return true;
    });
  }, [members, searchTerm, filterType]);

  const permanentCount = members.filter((m) => m.isPermanent).length;
  const guestCount = members.length - permanentCount;
  const withQrCount = members.filter((m) => !!m.qrImagePath).length;
  const withoutQrCount = members.length - withQrCount;

  const removeRow = memberToRemove ? rowByMemberId.get(memberToRemove.id) : undefined;

  return (
    <div className="space-y-4">
      {/* Điều hướng giữa các tab */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={goToList}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Danh Sách ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={handleStartAdd}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{editingMemberId ? 'Sửa thành viên' : '+ Thêm từng người'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMemberId(null);
              setErrorMessage(null);
              setActiveTab('bulk');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dán danh sách Zalo</span>
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-1.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span>{errorMessage}</span>
            </div>
          )}

          {withoutQrCount > 0 && members.length > 0 && (
            <div className="flex items-start gap-1.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-px text-amber-500" />
              <span>
                <strong>{withoutQrCount}</strong> người chưa có ảnh QR nên chưa nhận được tiền
                qua app. Bảo họ gửi ảnh QR ngân hàng / MoMo rồi tải lên giúp.
              </span>
            </div>
          )}

          {/* Tìm kiếm & bộ lọc */}
          {members.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, SĐT..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('permanent')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'permanent'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  Cố định ({permanentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('guest')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'guest'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Vãng lai ({guestCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('has_qr')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'has_qr'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Có QR ({withQrCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('no_qr')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === 'no_qr'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Chưa có QR ({withoutQrCount})
                </button>
              </div>
            </div>
          )}

          {/* Danh sách */}
          {members.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Chưa Có Thành Viên Nào</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Hãy thêm thành viên vào nhóm để bắt đầu ghi điểm danh, tính tiền cầu và chia
                  tiền minh bạch.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />+ Thêm thành viên
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bulk')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Dán nhanh danh sách Zalo
                </button>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Không tìm thấy thành viên phù hợp với từ khóa tìm kiếm.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((m, idx) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  index={idx}
                  row={rowByMemberId.get(m.id)}
                  sessionCount={sessionCount}
                  busy={isPending}
                  onEdit={() => handleStartEdit(m)}
                  onRemove={() => handleRequestRemove(m)}
                  onPreviewQr={() => setPreviewQrMember(m)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'single' && (
        <MemberFormPanel
          key={formKey}
          editingMember={editingMember}
          isPending={isPending}
          errorMessage={errorMessage}
          onCancel={goToList}
          onSubmit={handleSubmitForm}
        />
      )}

      {activeTab === 'bulk' && (
        <BulkAddPanel
          existingNames={members.map((m) => m.name)}
          isPending={isPending}
          errorMessage={errorMessage}
          onCancel={goToList}
          onSubmit={handleBulkAdd}
        />
      )}

      {previewQrMember?.qrUrl && (
        <QrLightbox
          name={previewQrMember.name}
          url={previewQrMember.qrUrl}
          onClose={() => setPreviewQrMember(null)}
        />
      )}

      {/* Chỉ hỏi lại khi người này đã có dữ liệu trong kỳ */}
      {memberToRemove && (
        <ConfirmDialog
          isOpen={true}
          type="warning"
          title={`Gỡ "${memberToRemove.name}" khỏi kỳ này?`}
          message={
            <span>
              <strong className="text-slate-900">{memberToRemove.name}</strong> sẽ không còn
              trong danh sách của kỳ này và bảng quyết toán sẽ tính lại. Hồ sơ của họ cùng
              lịch sử ở các kỳ khác vẫn giữ nguyên.
            </span>
          }
          details={[
            `Đã tham gia: ${removeRow?.sessionsAttendedCount ?? 0} buổi đánh trong kỳ`,
            `Đã đứng ra chi: ${formatVND(removeRow?.totalPaid ?? 0)}`,
            `Chênh lệch hiện tại: ${formatVND(removeRow?.netBalance ?? 0)}`,
          ]}
          confirmText={isPending ? 'Đang gỡ...' : 'Gỡ khỏi kỳ này'}
          cancelText="Giữ lại"
          onConfirm={() => handleRemove(memberToRemove.id)}
          onCancel={() => setMemberToRemove(null)}
        />
      )}
    </div>
  );
};
