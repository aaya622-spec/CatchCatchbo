"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MeetingTypeBadge, RemainingBadge } from "@/components/ui/Badge";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";
import { deleteOrDeactivateSlot, toggleSlotActive } from "@/lib/actions/slots";
import type { SlotWithCount } from "@/lib/types";

interface AdminSlotCardProps {
  slot: SlotWithCount;
}

export default function AdminSlotCard({ slot }: AdminSlotCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const hasBookings = slot.booking_count > 0;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOrDeactivateSlot(slot.id);
      if (!result.success) {
        setActionError(result.error ?? "오류가 발생했어요.");
      }
      setShowDeleteConfirm(false);
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleSlotActive(slot.id, !slot.is_active);
      if (!result.success) {
        setActionError(result.error ?? "오류가 발생했어요.");
      }
    });
  }

  return (
    <div
      className={`card p-4 flex flex-col gap-3 transition-opacity ${
        !slot.is_active ? "opacity-60" : ""
      }`}
    >
      {/* 상단: 날짜 + 배지 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-warm-gray-800">
            {formatKoreanDate(slot.date)}
          </p>
          <p className="text-sm text-warm-gray-500 mt-0.5">
            {formatTimeRange(slot.start_time, slot.end_time)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <MeetingTypeBadge
            value={slot.meeting_type}
            label={getMeetingTypeLabel(slot.meeting_type)}
          />
          {slot.is_active ? (
            <RemainingBadge remaining={slot.remaining} max={slot.max_guests} />
          ) : (
            <span className="text-xs text-warm-gray-400 bg-warm-gray-100 px-2 py-0.5 rounded-full">
              비활성
            </span>
          )}
        </div>
      </div>

      {/* 장소 & 예약 현황 */}
      <div className="flex items-center gap-3 text-sm text-warm-gray-500">
        <span>📍 {getLocationLabel(slot.location_text)}</span>
        <span>·</span>
        <span>
          {slot.booking_count}/{slot.max_guests}명 예약
        </span>
      </div>

      {slot.description && (
        <p className="text-sm text-warm-gray-400 bg-cream-100 rounded-xl px-3 py-2">
          {slot.description}
        </p>
      )}

      {actionError && (
        <p className="text-xs text-red-500">{actionError}</p>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="bg-red-50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-sm text-red-600 font-medium">
            {hasBookings
              ? "예약이 있어서 바로 삭제할 수 없어요. 대신 비활성화할게요."
              : "이 일정을 삭제할까요?"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-ghost text-sm flex-1"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium active:scale-95 transition-all disabled:opacity-50"
            >
              {isPending ? "처리 중…" : hasBookings ? "비활성화" : "삭제"}
            </button>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {!showDeleteConfirm && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className="btn-ghost text-sm flex-1 text-warm-gray-500"
          >
            {slot.is_active ? "숨기기" : "다시 열기"}
          </button>
          <Link
            href={`/admin/slots/${slot.id}/edit`}
            className="btn-ghost text-sm flex-1 text-center text-warm-gray-500"
          >
            수정
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            className="btn-ghost text-sm flex-1 text-red-400"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
