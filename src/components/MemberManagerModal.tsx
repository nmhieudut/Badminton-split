import React, { useState, useMemo, useRef } from 'react';
import {
  X,
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
  Image as ImageIcon,
  Eye,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { Member, DailySession, ExpenseItem, VIETNAM_BANKS } from '../types';
import { getMemberColor, formatVND } from '../utils/settlement';
import { compressImageFile } from '../utils/image';
import { ConfirmDialog } from './ConfirmDialog';

interface MemberManagerModalProps {
  members: Member[];
  dailySessions?: DailySession[];
  expenses?: ExpenseItem[];
  onUpdateMembers: (newMembers: Member[]) => void;
  onClose: () => void;
}

export const MemberManagerModal: React.FC<MemberManagerModalProps> = ({
  members,
  dailySessions = [],
  expenses = [],
  onUpdateMembers,
  onClose,
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

  // Ref for file input
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Bulk add state
  const [bulkText, setBulkText] = useState('');

  // QR Quick Lightbox Preview State
  const [previewQrMember, setPreviewQrMember] = useState<Member | null>(null);

  // Confirmation dialog states
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
    // reset input value so re-uploading same file triggers change
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
      // Update existing
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
      // Check duplicate name
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

    // Split by comma, newline, semicolon, or bullet points
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

  // Safe delete check
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

  // Filtered members
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
    <div
      id="member-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Quản Lý Thành Viên & Mã QR Nhận Tiền</h3>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>
                  Tổng <strong className="text-white">{members.length}</strong> thành viên
                </span>
                <span>•</span>
                <span>
                  <strong className="text-indigo-300">{permanentCount}</strong> cố định
                </span>
                <span>•</span>
                <span>
                  <strong className="text-amber-300">{guestCount}</strong> vãng lai
                </span>
                {withQrCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-300 font-bold">
                      <QrCode className="h-3 w-3" />
                      {withQrCount} có mã QR
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            id="close-member-modal-btn"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="tab-member-list-btn"
              onClick={() => {
                setActiveTab('list');
                setEditingMemberId(null);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Danh Sách ({members.length})
            </button>

            <button
              type="button"
              id="tab-single-member-btn"
              onClick={handleStartAdd}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {editingMemberId ? 'Sửa thông tin & QR' : '+ Thêm từng người & QR'}
            </button>

            <button
              type="button"
              id="tab-bulk-member-btn"
              onClick={() => {
                setActiveTab('bulk');
                setEditingMemberId(null);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bulk'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Dán danh sách Zalo
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              type="button"
              onClick={handleStartAdd}
              className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <UserPlus className="h-3 w-3" />
              Thêm Mới
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search and Filters */}
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
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
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
                    Có ảnh QR ({withQrCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('has_bank')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      filterType === 'has_bank'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Có STK ({members.filter((m) => m.bankAccount).length})
                  </button>
                </div>
              </div>

              {/* Members List Cards */}
              {filteredMembers.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <p className="text-xs text-slate-500">
                    Không tìm thấy thành viên nào phù hợp với điều kiện tìm kiếm.
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredMembers.map((m, idx) => {
                    const attendedCount = dailySessions.filter(
                      (s) => s.attendeeIds && s.attendeeIds.includes(m.id)
                    ).length;

                    return (
                      <div
                        key={m.id}
                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <div>
                          {/* Member Top Bar */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${getMemberColor(
                                  idx
                                )}`}
                              >
                                {m.name.charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                      m.isPermanent !== false
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}
                                  >
                                    {m.isPermanent !== false ? 'Cố định' : 'Vãng lai'}
                                  </span>
                                </div>

                                {m.phone ? (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    {m.phone}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">
                                    Chưa lưu SĐT
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Attendance Badge */}
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {attendedCount}/{dailySessions.length} buổi
                              </span>
                            </div>
                          </div>

                          {/* Bank & QR Details Card */}
                          <div className="mt-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs space-y-2">
                            {/* Bank Details */}
                            {m.bankAccount ? (
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>{m.bankName || 'Ngân hàng'}</span>
                                    <span className="font-mono text-indigo-700 font-bold">
                                      {m.bankAccount}
                                    </span>
                                  </div>
                                  {m.bankAccountName && (
                                    <span className="text-[10px] text-slate-500 font-mono uppercase block pl-5">
                                      {m.bankAccountName}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCopyBank(m)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                  title="Sao chép số tài khoản"
                                >
                                  {copiedBankId === m.id ? (
                                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                <span>Chưa cập nhật số tài khoản</span>
                              </div>
                            )}

                            {/* QR Code Indicator & Quick View */}
                            <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px]">
                              {m.qrCodeImage ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewQrMember(m)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Bấm để xem ảnh mã QR của thành viên"
                                >
                                  <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Xem ảnh mã QR</span>
                                  <Eye className="h-3 w-3 text-emerald-500" />
                                </button>
                              ) : (
                                <span className="text-slate-400 italic">
                                  Chưa có ảnh mã QR
                                </span>
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
                        <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(m)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(m)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

          {activeTab === 'single' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                {editingMemberId
                  ? 'Chỉnh Sửa Thông Tin & Mã QR Thành Viên'
                  : 'Thêm Thành Viên & Mã QR Vào Nhóm'}
              </h4>

              <form onSubmit={handleSaveSingle} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Tên thành viên <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="member-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Hoàng Nam, Tuấn..."
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

                {/* QR Code Upload Section (Feature Requested by User) */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-950">
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      <span>Mã QR Chuyển Khoản Cá Nhân (Upload Ảnh QR)</span>
                    </div>
                    {qrCodeImage && (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Đã nạp ảnh QR
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    Tải lên ảnh chụp màn hình mã QR ngân hàng (Vietcombank, MB, Techcombank, MoMo, ZaloPay...) để các thành viên khác quét chuyển khoản trực tiếp cực nhanh.
                  </p>

                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrInputChange}
                    className="hidden"
                  />

                  {qrUploadError && (
                    <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200 font-medium">
                      {qrUploadError}
                    </div>
                  )}

                  {qrCodeImage ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-indigo-200 bg-white p-3.5">
                      <div className="relative group shrink-0">
                        <img
                          src={qrCodeImage}
                          alt="QR Code Preview"
                          className="h-28 w-28 rounded-lg object-contain bg-white p-1 border border-slate-200 shadow-2xs"
                        />
                      </div>

                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="text-xs font-bold text-slate-800">
                          Ảnh mã QR cá nhân đã sẵn sàng
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Ảnh đã được tự động nén tối ưu hiển thị rõ nét khi quét app ngân hàng.
                        </p>

                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <button
                            type="button"
                            onClick={() => qrFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Đổi ảnh khác
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrCodeImage(undefined)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            Xóa ảnh QR
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
                      className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/80 p-5 text-center hover:border-indigo-400 hover:bg-white transition-all cursor-pointer"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-2 font-bold text-xs text-slate-800">
                        {isUploadingQr
                          ? 'Đang xử lý ảnh...'
                          : 'Bấm vào đây để chọn ảnh QR từ điện thoại/máy tính'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Hoặc kéo thả file ảnh QR vào đây (PNG, JPG, WEBP)
                      </p>
                    </div>
                  )}
                </div>

                {/* Bank account section for auto VietQR */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    <span>Thông tin tài khoản ngân hàng (Tùy chọn - Tự sinh VietQR kèm số tiền)</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Ngân hàng / Ví
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden font-medium"
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
                        placeholder="Số TK ngân hàng"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden font-mono"
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent vs Guest toggle */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      Thành viên cố định hàng tháng
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tự động mặc định tích có mặt khi tạo buổi đánh mới
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPermanent}
                    onChange={(e) => setIsPermanent(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Quay lại danh sách
                  </button>
                  <button
                    type="submit"
                    id="save-member-btn"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {editingMemberId ? 'Lưu Thay Đổi' : 'Thêm Vào Nhóm'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Dán Nhanh Danh Sách Từ Nhóm Zalo / Tin Nhắn
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Hệ thống tự động lọc bỏ số thứ tự, gạch đầu dòng, dấu phẩy và loại trừ tên bị trùng lặp. Sau đó bạn có thể bấm Sửa từng người để thêm ảnh mã QR.
                </p>
              </div>

              <textarea
                id="bulk-member-textarea"
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Ví dụ dán vào đây:
1. Hoàng Nam
2. Tuấn
3. Minh Đức
4. Hải Đăng, Khánh Linh, Phương Thảo"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden font-mono"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  id="submit-bulk-members-btn"
                  onClick={handleBulkAdd}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Thêm Toàn Bộ Vào Nhóm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-500">
            {members.length} thành viên đang hoạt động
          </span>
          <button
            id="close-member-modal-bottom-btn"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng & Áp Dụng
          </button>
        </div>
      </div>

      {/* Quick QR Code Lightbox Preview */}
      {previewQrMember && previewQrMember.qrCodeImage && (
        <div
          id="qr-lightbox-backdrop"
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewQrMember(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="text-left">
                <h4 className="font-bold text-slate-900 text-sm">
                  Mã QR: {previewQrMember.name}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {previewQrMember.bankName} - {previewQrMember.bankAccount || 'Mã QR Cá Nhân'}
                </p>
              </div>
              <button
                onClick={() => setPreviewQrMember(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <img
                src={previewQrMember.qrCodeImage}
                alt={`QR code ${previewQrMember.name}`}
                className="max-h-72 w-full object-contain rounded-xl bg-white p-2 border border-slate-200"
              />
            </div>

            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => setPreviewQrMember(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Member Deletion */}
      {memberToDelete && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title={`Xác Nhận Xóa Thành Viên "${memberToDelete.member.name}"?`}
          message={
            <span>
              Bạn có chắc chắn muốn xóa thành viên{' '}
              <strong className="text-slate-900">{memberToDelete.member.name}</strong> khỏi nhóm cầu lông?
            </span>
          }
          details={[
            `Đã tham gia: ${memberToDelete.attendedCount} buổi đánh trong tháng`,
            `Đã đứng ra chi trước: ${memberToDelete.sessionsPaidCount} buổi đánh & ${memberToDelete.expensesPaidCount} khoản chi chung`,
            `Tổng số tiền đã ứng: ${formatVND(memberToDelete.totalPaidAmount)}`,
            'Nếu xóa, thành viên sẽ bị gỡ khỏi danh sách điểm danh và bảng chia tiền.',
          ]}
          confirmText="Xác nhận xóa thành viên"
          cancelText="Giữ lại"
          onConfirm={handleConfirmDelete}
          onCancel={() => setMemberToDelete(null)}
        />
      )}
    </div>
  );
};
