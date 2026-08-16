import React, { useState, useMemo, useRef } from 'react';
import {
  UserPlus,
  Users,
  Trash2,
  Edit2,
  Check,
  CreditCard,
  Sparkles,
  Search,
  Phone,
  Calendar,
  Copy,
  CheckCheck,
  UserCheck,
  QrCode,
  Upload,
  Eye,
  RotateCcw,
  X,
} from 'lucide-react';
import { Member, DailySession, ExpenseItem, VIETNAM_BANKS } from '../types';
import { getMemberColor, formatVND } from '../utils/settlement';
import { compressImageFile } from '../utils/image';
import { ConfirmDialog } from './ConfirmDialog';

interface MemberViewProps {
  members: Member[];
  dailySessions?: DailySession[];
  expenses?: ExpenseItem[];
  onUpdateMembers: (newMembers: Member[]) => void;
}

export const MemberView: React.FC<MemberViewProps> = ({
  members,
  dailySessions = [],
  expenses = [],
  onUpdateMembers,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'single' | 'bulk'>('list');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'permanent' | 'guest' | 'has_bank' | 'has_qr' | 'no_bank'
  >('all');

  // Single add / edit form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('MB');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [isPermanent, setIsPermanent] = useState(true);
  const [qrCodeImage, setQrCodeImage] = useState<string | undefined>(undefined);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);

  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [bulkText, setBulkText] = useState('');
  const [previewQrMember, setPreviewQrMember] = useState<Member | null>(null);

  const [memberToDelete, setMemberToDelete] = useState<{
    member: Member;
    attendedCount: number;
    sessionsPaidCount: number;
    expensesPaidCount: number;
    totalPaidAmount: number;
  } | null>(null);

  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setPhone('');
    setBankName('MB');
    setBankAccount('');
    setBankAccountName('');
    setIsPermanent(true);
    setQrCodeImage(undefined);
    setQrUploadError(null);
    setEditingMemberId(null);
  };

  const handleStartEdit = (m: Member) => {
    setEditingMemberId(m.id);
    setName(m.name);
    setPhone(m.phone || '');
    setBankName(m.bankName || 'MB');
    setBankAccount(m.bankAccount || '');
    setBankAccountName(m.bankAccountName || '');
    setIsPermanent(m.isPermanent !== false);
    setQrCodeImage(m.qrCodeImage);
    setQrUploadError(null);
    setActiveTab('single');
  };

  const handleStartAdd = () => {
    resetForm();
    setActiveTab('single');
  };

  const handleQrFileUpload = async (file: File) => {
    setIsUploadingQr(true);
    setQrUploadError(null);
    try {
      const compressedBase64 = await compressImageFile(file, 600, 0.85);
      setQrCodeImage(compressedBase64);
    } catch (err: any) {
      setQrUploadError(err?.message || 'Không thể xử lý ảnh QR này');
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleQrInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleQrFileUpload(file);
    }
    e.target.value = '';
  };

  const handleDropQr = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleQrFileUpload(file);
    }
  };

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    if (editingMemberId) {
      const updated = members.map((m) =>
        m.id === editingMemberId
          ? {
              ...m,
              name: cleanName,
              phone: phone.trim() || undefined,
              bankName: bankAccount.trim() ? bankName : undefined,
              bankAccount: bankAccount.trim() || undefined,
              bankAccountName: bankAccountName.trim()
                ? bankAccountName.trim().toUpperCase()
                : undefined,
              isPermanent,
              qrCodeImage: qrCodeImage || undefined,
            }
          : m
      );
      onUpdateMembers(updated);
    } else {
      const duplicate = members.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );
      const newMember: Member = {
        id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: duplicate ? `${cleanName} (Mới)` : cleanName,
        phone: phone.trim() || undefined,
        bankName: bankAccount.trim() ? bankName : undefined,
        bankAccount: bankAccount.trim() || undefined,
        bankAccountName: bankAccountName.trim()
          ? bankAccountName.trim().toUpperCase()
          : undefined,
        isPermanent,
        qrCodeImage: qrCodeImage || undefined,
      };
      onUpdateMembers([...members, newMember]);
    }

    resetForm();
    setActiveTab('list');
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;

    const rawNames = bulkText
      .split(/[\n,;]+/)
      .map((s) => s.replace(/^[0-9\.\-\*\+\s]+/, '').trim())
      .filter((s) => s.length > 0);

    if (rawNames.length === 0) return;

    const existingNames = new Set(members.map((m) => m.name.toLowerCase()));
    const newItems: Member[] = [];

    rawNames.forEach((n, idx) => {
      if (!existingNames.has(n.toLowerCase())) {
        newItems.push({
          id: `m_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          name: n,
          isPermanent: true,
        });
        existingNames.add(n.toLowerCase());
      }
    });

    if (newItems.length > 0) {
      onUpdateMembers([...members, ...newItems]);
    }
    setBulkText('');
    setActiveTab('list');
  };

  const handleRequestDelete = (m: Member) => {
    const attendedSessions = dailySessions.filter(
      (s) => s.attendeeIds && s.attendeeIds.includes(m.id)
    );
    const sessionsPaid = dailySessions.filter(
      (s) =>
        s.courtPayerId === m.id ||
        s.shuttlecockPayerId === m.id ||
        s.drinkPayerId === m.id
    );
    const expensesPaid = expenses.filter((e) => e.paidById === m.id);

    let totalPaid = 0;
    sessionsPaid.forEach((s) => {
      if (s.courtPayerId === m.id) totalPaid += s.courtFee || 0;
      if (s.shuttlecockPayerId === m.id) {
        totalPaid +=
          s.shuttlecockTotalFee !== undefined
            ? s.shuttlecockTotalFee
            : (s.shuttlecockCount || 0) * (s.shuttlecockPricePerItem || 25000);
      }
      if (s.drinkPayerId === m.id) totalPaid += (s.drinkFee || 0) + (s.otherFee || 0);
    });
    expensesPaid.forEach((e) => {
      totalPaid += e.amount || 0;
    });

    setMemberToDelete({
      member: m,
      attendedCount: attendedSessions.length,
      sessionsPaidCount: sessionsPaid.length,
      expensesPaidCount: expensesPaid.length,
      totalPaidAmount: totalPaid,
    });
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    const targetId = memberToDelete.member.id;
    onUpdateMembers(members.filter((m) => m.id !== targetId));
    if (editingMemberId === targetId) resetForm();
    setMemberToDelete(null);
  };

  const handleCopyBank = (m: Member) => {
    if (!m.bankAccount) return;
    const text = `${m.bankName || ''} - ${m.bankAccount} (${m.bankAccountName || m.name})`;
    navigator.clipboard.writeText(text);
    setCopiedBankId(m.id);
    setTimeout(() => setCopiedBankId(null), 2000);
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.phone && m.phone.includes(searchTerm)) ||
        (m.bankAccount && m.bankAccount.includes(searchTerm));

      if (!matchSearch) return false;

      if (filterType === 'permanent') return m.isPermanent !== false;
      if (filterType === 'guest') return m.isPermanent === false;
      if (filterType === 'has_bank') return !!m.bankAccount;
      if (filterType === 'has_qr') return !!m.qrCodeImage;
      if (filterType === 'no_bank') return !m.bankAccount && !m.qrCodeImage;

      return true;
    });
  }, [members, searchTerm, filterType]);

  const permanentCount = members.filter((m) => m.isPermanent !== false).length;
  const guestCount = members.filter((m) => m.isPermanent === false).length;
  const withQrCount = members.filter((m) => !!m.qrCodeImage).length;

  return (
    <div className="space-y-4">
      {/* Sub Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              setEditingMemberId(null);
            }}
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
              setActiveTab('bulk');
              setEditingMemberId(null);
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

        {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">
              {permanentCount} cố định • {guestCount} vãng lai • {withQrCount} có QR
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          {members.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, SĐT, STK..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
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
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
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
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
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
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    filterType === 'has_qr'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Có QR ({withQrCount})
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          {members.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Chưa Có Thành Viên Nào</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Hãy thêm thành viên vào nhóm để bắt đầu ghi điểm danh, tính tiền cầu và chia tiền minh bạch.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <button
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  + Thêm thành viên
                </button>
                <button
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
              {filteredMembers.map((m, idx) => {
                const attendedCount = dailySessions.filter(
                  (s) => s.attendeeIds && s.attendeeIds.includes(m.id)
                ).length;

                return (
                  <div
                    key={m.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${getMemberColor(
                              idx
                            )}`}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  m.isPermanent !== false
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {m.isPermanent !== false ? 'Cố định' : 'Vãng lai'}
                              </span>
                            </div>

                            {m.phone && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {m.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {attendedCount} buổi
                        </span>
                      </div>

                      {/* Bank & QR Details */}
                      <div className="mt-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs space-y-1.5">
                        {m.bankAccount ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                              <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                              <span>{m.bankName}</span>
                              <span className="font-mono text-indigo-700">{m.bankAccount}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyBank(m)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                              title="Sao chép STK"
                            >
                              {copiedBankId === m.id ? (
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic block">
                            Chưa lưu STK
                          </span>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 text-[11px]">
                          {m.qrCodeImage ? (
                            <button
                              type="button"
                              onClick={() => setPreviewQrMember(m)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                            >
                              <QrCode className="h-3 w-3 text-emerald-600" />
                              <span>Xem mã QR</span>
                              <Eye className="h-3 w-3 text-emerald-500" />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Chưa có ảnh QR</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(m)}
                            className="text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            {m.qrCodeImage ? 'Đổi QR' : '+ Tải ảnh QR'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(m)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(m)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Single Add / Edit Tab */}
      {activeTab === 'single' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-2xl mx-auto shadow-2xs">
          <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-600" />
            {editingMemberId ? 'Chỉnh Sửa Thành Viên' : 'Thêm Thành Viên Mới'}
          </h4>

          <form onSubmit={handleSaveSingle} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Tên thành viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Nam"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Số điện thoại / Zalo
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* QR Code Upload */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-950">
                  <QrCode className="h-4 w-4 text-indigo-600" />
                  <span>Ảnh Mã QR Chuyển Khoản Cá Nhân</span>
                </div>
                {qrCodeImage && (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Đã có ảnh
                  </span>
                )}
              </div>

              <input
                ref={qrFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrInputChange}
                className="hidden"
              />

              {qrUploadError && (
                <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
                  {qrUploadError}
                </div>
              )}

              {qrCodeImage ? (
                <div className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-white p-3">
                  <img
                    src={qrCodeImage}
                    alt="QR Preview"
                    className="h-20 w-20 rounded-lg object-contain bg-white p-1 border border-slate-200"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-800 block">
                      Ảnh mã QR đã được tải lên
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => qrFileInputRef.current?.click()}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Đổi ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrCodeImage(undefined)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDropQr}
                  onClick={() => qrFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/80 p-4 text-center hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <Upload className="h-4 w-4 text-indigo-600 mb-1" />
                  <p className="text-xs font-bold text-slate-800">
                    {isUploadingQr ? 'Đang xử lý...' : 'Bấm để tải ảnh mã QR ngân hàng / MoMo'}
                  </p>
                  <p className="text-[10px] text-slate-400">Hỗ trợ PNG, JPG, WEBP</p>
                </div>
              )}
            </div>

            {/* Bank Info */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                <span>Số Tài Khoản Ngân Hàng (Tùy chọn)</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Ngân hàng
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="STK ngân hàng"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Tên chủ tài khoản
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="NGUYEN VAN A"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Permanent toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Thành viên cố định hàng tháng
                </span>
                <span className="text-[11px] text-slate-500">
                  Tự động mặc định tích đi sân khi tạo buổi đánh mới
                </span>
              </div>
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                {editingMemberId ? 'Lưu Thay Đổi' : 'Thêm Vào Nhóm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Add Tab */}
      {activeTab === 'bulk' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-2xl mx-auto shadow-2xs space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Dán Nhanh Danh Sách Từ Nhóm Zalo
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Dán danh sách tên (cách nhau bởi dấu phẩy hoặc xuống dòng). Hệ thống tự động lọc số thứ tự và loại bỏ tên trùng.
            </p>
          </div>

          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`1. Hoàng Nam
2. Tuấn
3. Minh Đức, Khánh Linh, Hải Đăng`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono"
          />

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleBulkAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-indigo-700 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Thêm Toàn Bộ
            </button>
          </div>
        </div>
      )}

      {/* Lightbox QR */}
      {previewQrMember && previewQrMember.qrCodeImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewQrMember(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">Mã QR: {previewQrMember.name}</h4>
              <button
                onClick={() => setPreviewQrMember(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={previewQrMember.qrCodeImage}
              alt={`QR ${previewQrMember.name}`}
              className="max-h-72 w-full object-contain rounded-xl bg-white p-2 border border-slate-200"
            />
            <button
              onClick={() => setPreviewQrMember(null)}
              className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {memberToDelete && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title={`Xóa Thành Viên "${memberToDelete.member.name}"?`}
          message={
            <span>
              Bạn có chắc chắn muốn xóa thành viên{' '}
              <strong className="text-slate-900">{memberToDelete.member.name}</strong>?
            </span>
          }
          details={[
            `Đã tham gia: ${memberToDelete.attendedCount} buổi đánh`,
            `Đã đứng ra chi: ${memberToDelete.sessionsPaidCount} buổi & ${memberToDelete.expensesPaidCount} khoản chi`,
            `Tổng tiền đã ứng: ${formatVND(memberToDelete.totalPaidAmount)}`,
          ]}
          confirmText="Xác nhận xóa"
          cancelText="Giữ lại"
          onConfirm={handleConfirmDelete}
          onCancel={() => setMemberToDelete(null)}
        />
      )}
    </div>
  );
};
