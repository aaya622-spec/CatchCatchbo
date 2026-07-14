"use client";

import { useState, useTransition } from "react";
import { MeetingTypeBadge } from "@/components/ui/Badge";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";
import {
  cancelBooking,
  confirmBooking,
} from "@/lib/actions/bookings";
import type { Booking, BookingStatus } from "@/lib/types";

interface BookingListProps {
  bookings: Booking[];
}

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  const styles: Record<BookingStatus, string> = {
    pending: "bg-amber-50 text-amber-600",
    confirmed: "bg-green-50 text-green-600",
    canceled: "bg-warm-gray-100 text-warm-gray-400",
  };

  const labels: Record<BookingStatus, string> = {
    pending: "확정 대기",
    confirmed: "예약 확정",
    canceled: "취소됨",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const [isPending, startTransition] = useTransition();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slot = booking.available_slots;

  async function openShare(confirmedBooking: Booking) {
    const confirmedSlot = confirmedBooking.available_slots;

    if (!confirmedSlot) return;

    const message = `🎯 캐치캐치보

약속이 확정됐어요! 🎉

📅 ${formatKoreanDate(confirmedSlot.date)}
🕐 ${formatTimeRange(
      confirmedSlot.start_time,
      confirmedSlot.end_time
    )}
📍 ${getLocationLabel(confirmedSlot.location_text)}

${confirmedBooking.guest_name}님, 이날 만나요!`;

    const shareData = {
      title: "캐치캐치보 약속 확정",
      text: message,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(
        `${message}\n\n${window.location.origin}`
      );

      alert("확정 메시지와 링크를 복사했어요.");
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      ) {
        return;
      }

      await navigator.clipboard.writeText(
        `${message}\n\n${window.location.origin}`
      );

      alert("공유창을 열지 못해 메시지를 복사했어요.");
    }
  }

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      const result = await confirmBooking(booking.id);

      if (!result.success || !result.data?.booking) {
        setError(
          result.error ?? "예약 확정 중 오류가 발생했어요."
        );
        return;
      }

      await openShare(result.data.booking);
    });
  }

  function handleCancel() {
    setError(null);

    startTransition(async () => {
      const result = await cancelBooking(booking.id);

      if (!result.success) {
        setError(
          result.error ?? "예약 처리 중 오류가 발생했어요."
        );
        return;
      }

      setShowCancelConfirm(false);
    });
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-warm-gray-800">
              {booking.guest_name}
            </span>

            <BookingStatusBadge status={booking.status} />
          </div>

          {booking.guest_contact && (
            <p className="text-sm text-warm-gray-500 mt-1">
              📱 {booking.guest_contact}
            </p>
          )}
        </div>

        <MeetingTypeBadge
          value={booking.meeting_type}
          label={getMeetingTypeLabel(booking.meeting_type)}
        />
      </div>

      {slot && (
        <div className="bg-cream-100 rounded-xl px-3 py-2 text-sm text-warm-gray-600">
          <p>{formatKoreanDate(slot.date)}</p>

          <p className="text-warm-gray-400 text-xs mt-0.5">
            {formatTimeRange(
              slot.start_time,
              slot.end_time
            )}
          </p>

          <p className="text-warm-gray-400 text-xs mt-1">
            📍 {getLocationLabel(slot.location_text)}
          </p>
        </div>
      )}

      {booking.note && (
        <p className="text-sm text-warm-gray-500 italic">
          &ldquo;{booking.note}&rdquo;
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {showCancelConfirm && (
        <div className="bg-red-50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-sm text-red-600 font-medium">
            {booking.status === "pending"
              ? "이 예약 신청을 거절할까요?"
              : "확정된 예약을 취소할까요?"}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="btn-ghost text-sm flex-1"
              disabled={isPending}
            >
              아니요
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50"
            >
              {isPending
                ? "처리 중…"
                : booking.status === "pending"
                ? "예약 거절"
                : "예약 취소"}
            </button>
          </div>
        </div>
      )}

      {booking.status === "pending" &&
        !showCancelConfirm && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isPending}
              className="btn-ghost border border-warm-gray-200"
            >
              거절
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="btn-primary"
            >
              {isPending
                ? "확정 중…"
                : "예약 확정"}
            </button>
          </div>
        )}

      {booking.status === "confirmed" &&
        !showCancelConfirm && (
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="btn-danger self-start"
          >
            예약 취소
          </button>
        )}

      {booking.status === "canceled" && (
        <p className="text-xs text-warm-gray-400">
          {booking.canceled_at
            ? `처리일: ${new Date(
                booking.canceled_at
              ).toLocaleDateString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}`
            : "취소됨"}
        </p>
      )}
    </div>
  );
}

export default function BookingList({
  bookings,
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-warm-gray-400">
        <p className="text-3xl mb-3">📭</p>
        <p className="text-sm">아직 예약이 없어요</p>
      </div>
    );
  }

  const pending = bookings.filter(
    (booking) => booking.status === "pending"
  );

  const confirmed = bookings.filter(
    (booking) => booking.status === "confirmed"
  );

  const canceled = bookings.filter(
    (booking) => booking.status === "canceled"
  );

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-amber-600 mb-3">
            확정 대기 · {pending.length}건
          </h3>

          <div className="flex flex-col gap-3">
            {pending.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
              />
            ))}
          </div>
        </section>
      )}

      {confirmed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-warm-gray-500 mb-3">
            예약 확정 · {confirmed.length}건
          </h3>

          <div className="flex flex-col gap-3">
            {confirmed.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
              />
            ))}
          </div>
        </section>
      )}

      {canceled.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-warm-gray-400 mb-3">
            취소 및 거절 · {canceled.length}건
          </h3>

          <div className="flex flex-col gap-3 opacity-60">
            {canceled.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
