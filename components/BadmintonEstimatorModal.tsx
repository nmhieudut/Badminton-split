'use client';

import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';
import { formatVND } from '../lib/money';

interface BadmintonEstimatorModalProps {
  memberCount: number;
  onClose: () => void;
}

export const BadmintonEstimatorModal: React.FC<BadmintonEstimatorModalProps> = ({
  memberCount,
  onClose,
}) => {
  const [sessionsPerMonth, setSessionsPerMonth] = useState(12); // 3 sessions/week * 4 weeks
  const [hoursPerSession, setHoursPerSession] = useState(2);
  const [courtPricePerHour, setCourtPricePerHour] = useState(100000); // 100k/h
  const [courtCount, setCourtCount] = useState(1);

  const [shuttleTubes, setShuttleTubes] = useState(3);
  const [shuttlePricePerTube, setShuttlePricePerTube] = useState(250000); // 250k/ống

  const [drinkPricePerSession, setDrinkPricePerSession] = useState(25000); // 25k/buổi
  const [extraContingency, setExtraContingency] = useState(100000); // 100k quỹ dự phòng

  const [peopleCount, setPeopleCount] = useState(memberCount || 6);

  // Calculations
  const totalCourtCost = sessionsPerMonth * hoursPerSession * courtPricePerHour * courtCount;
  const totalShuttleCost = shuttleTubes * shuttlePricePerTube;
  const totalDrinkCost = sessionsPerMonth * drinkPricePerSession;
  const grandTotal = totalCourtCost + totalShuttleCost + totalDrinkCost + extraContingency;

  const costPerPerson = peopleCount > 0 ? grandTotal / peopleCount : 0;

  return (
    <div
      id="estimator-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="estimator-modal-card"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-lg">Dự Toán Chi Phí Cầu Lông</h3>
              <p className="text-xs text-slate-300">
                Ước tính số tiền mỗi người cần đóng trước đầu tháng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sân bãi */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>🏟️</span> Tiền Thuê Sân Cố Định
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Số buổi / tháng
                </label>
                <input
                  type="number"
                  min={1}
                  value={sessionsPerMonth}
                  onChange={(e) => setSessionsPerMonth(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Số giờ / buổi
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={hoursPerSession}
                  onChange={(e) => setHoursPerSession(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Giá sân / giờ (đ)
                </label>
                <input
                  type="number"
                  step={10000}
                  value={courtPricePerHour}
                  onChange={(e) => setCourtPricePerHour(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Số sân</label>
                <input
                  type="number"
                  min={1}
                  value={courtCount}
                  onChange={(e) => setCourtCount(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900"
                />
              </div>
            </div>
            <div className="text-right text-xs font-semibold text-slate-700">
              Tiền sân ước tính: <span className="text-indigo-600 font-mono font-bold">{formatVND(totalCourtCost)}</span>
            </div>
          </div>

          {/* Quả cầu & Nước */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Cầu lông */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>🏸</span> Tiền Quả Cầu Lông
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Số ống cầu / tháng
                </label>
                <input
                  type="number"
                  min={0}
                  value={shuttleTubes}
                  onChange={(e) => setShuttleTubes(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Giá / 1 ống (đ)
                </label>
                <input
                  type="number"
                  step={10000}
                  value={shuttlePricePerTube}
                  onChange={(e) => setShuttlePricePerTube(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 font-mono"
                />
              </div>
              <div className="text-right text-xs font-semibold text-slate-700">
                Tổng tiền cầu: <span className="text-indigo-600 font-mono font-bold">{formatVND(totalShuttleCost)}</span>
              </div>
            </div>

            {/* Nước uống & Quỹ dự phòng */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>🥤</span> Nước Uống & Quỹ Phát Sinh
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tiền nước / 1 buổi (đ)
                </label>
                <input
                  type="number"
                  step={5000}
                  value={drinkPricePerSession}
                  onChange={(e) => setDrinkPricePerSession(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Quỹ phát sinh thêm (đ)
                </label>
                <input
                  type="number"
                  step={50000}
                  value={extraContingency}
                  onChange={(e) => setExtraContingency(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 font-mono"
                />
              </div>
              <div className="text-right text-xs font-semibold text-slate-700">
                Nước + Dự phòng: <span className="text-indigo-600 font-mono font-bold">{formatVND(totalDrinkCost + extraContingency)}</span>
              </div>
            </div>
          </div>

          {/* Chia đầu người */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Số thành viên chia đều
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                    className="w-24 rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm font-bold text-white"
                  />
                  <span className="text-xs text-slate-400">người</span>
                </div>
              </div>

              <div className="text-left sm:text-right border-t border-slate-800 pt-3 sm:border-t-0 sm:pt-0">
                <span className="text-xs text-slate-400 block">Tổng dự toán tháng:</span>
                <span className="font-mono text-base font-bold text-slate-200">
                  {formatVND(grandTotal)}
                </span>
                <span className="text-xs text-indigo-400 font-semibold block mt-1 uppercase tracking-wider">
                  Mỗi người dự kiến:
                </span>
                <span className="font-mono text-2xl font-black text-white">
                  {formatVND(costPerPerson)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
