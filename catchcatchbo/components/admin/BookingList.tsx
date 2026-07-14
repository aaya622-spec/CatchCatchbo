"use client";

import { useState, useTransition } from "react";
import { StatusBadge, MeetingTypeBadge } from "@/components/ui/Badge";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
} from "@/lib/utils";
import { cancelBooking } from "@/lib/actions/bookings";
import type { Booking } from "@/lib/types";

interface BookingListProps {
  bookings: Booking[];
}

function BookingRow({ booking }: { booking: Booking }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slot = booking.available_slots;

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBooking(booking.id);
      if (!result.success) {
        setError(result.error ?? "취소 중 오류가 발생했어요.");
      }
      setShowConfirm(false);
    });
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* 예약자 정보 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-warm-gray-800">
              {booking.guest_name}
            </span>
            <StatusBadge status={booking.status} />
          </div>
          {booking.guest_contact && (
            <p className="text-sm text-warm-gray-500 mt-0.5">
              📱 {booking.guest_contact}
            </p>
          )}
        </div>
        <MeetingTypeBadge
          value={booking.meeting_type}
          label={getMeetingTypeLabel(booking.meeting_type)}
        />
      </div>

      {/* 일정 정보 */}
      {slot && (
        <div className="bg-cream-100 rounded-xl px-3 py-2 text-sm text-warm-gray-600">
          <p>{formatKoreanDate(slot.date)}</p>
          <p className="text-warm-gray-400 text-xs mt-0.5">
            {formatTimeRange(slot.start_time, slot.end_time)}
          </p>
        </div>
      )}

      {/* 메모 */}
      {booking.note && (
        <p className="text-sm text-warm-gray-500 italic">
          &ldquo;{booking.note}&rdquo;
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* 취소 확인 */}
      {showConfirm && (
        <div className="bg-red-50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-sm text-red-600 font-medium">
            이 예약을 취소할까요?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="btn-ghost text-sm flex-1"
            >
              아니요
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50"
            >
              {isPending ? "취소 중…" : "예약 취소"}
            </button>
          </div>
        </div>
      )}

      {/* 취소 버튼 */}
      {booking.status === "confirmed" && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          className="btn-danger self-start"
        >
          예약 취소
        </button>
      )}

      {booking.status === "canceled" && (
        <p className="text-xs text-warm-gray-400">
          {booking.canceled_at
            ? `취소일: ${new Date(booking.canceled_at).toLocaleDateString("ko-KR")}`
            : "취소됨"}
        </p>
      )}
    </div>
  );
}

export default function BookingList({ bookings }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-warm-gray-400">
        <p className="text-3xl mb-3">📭</p>
        <p className="text-sm">아직 예약이 없어요</p>
      </div>
    );
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const canceled = bookings.filter((b) => b.status === "canceled");

  return (
    <div className="flex flex-col gap-6">
      {confirmed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-warm-gray-500 mb-3">
            예약 완료 · {confirmed.length}건
          </h3>
          <div className="flex flex-col gap-3">
            {confirmed.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {canceled.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-warm-gray-400 mb-3">
            취소됨 · {canceled.length}건
          </h3>
          <div className="flex flex-col gap-3 opacity-60">
            {canceled.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
