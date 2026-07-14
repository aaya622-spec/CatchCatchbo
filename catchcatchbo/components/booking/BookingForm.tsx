"use client";

import { useState, useTransition } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { MeetingTypeBadge } from "@/components/ui/Badge";
import {
  MEETING_TYPES,
  BOOKING_BUTTON_TEXT,
} from "@/lib/constants";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";
import { createBooking } from "@/lib/actions/bookings";
import type {
  SlotWithCount,
  Booking,
} from "@/lib/types";

interface BookingFormProps {
  slot: SlotWithCount;
}

function CompletionScreen({
  booking,
  slot,
}: {
  booking: Booking;
  slot: SlotWithCount;
}) {
  const slotInfo =
    booking.available_slots ?? slot;

  return (
    <div className="flex flex-col items-center text-center px-5 py-12 slide-up">
      <div className="text-6xl mb-6">
        🙌
      </div>

      <h2 className="text-2xl font-bold text-warm-gray-800 mb-2">
        예약 신청이 완료됐어요!
      </h2>

      <p className="text-warm-gray-500 text-sm leading-relaxed mb-8">
        관리자가 확인 후 확정하면
        따로 알려드릴게요.
      </p>

      {/* 예약 정보 카드 */}
      <div className="card w-full p-5 text-left flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-cream-200">
          <span className="font-semibold text-warm-gray-700">
            확정 대기
          </span>

          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
            확인 중
          </span>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-warm-gray-400">
              날짜
            </span>

            <span className="font-medium text-warm-gray-700">
              {formatKoreanDate(
                slotInfo.date
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-warm-gray-400">
              시간
            </span>

            <span className="font-medium text-warm-gray-700">
              {formatTimeRange(
                slotInfo.start_time,
                slotInfo.end_time
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-warm-gray-400">
              이름
            </span>

            <span className="font-medium text-warm-gray-700">
              {booking.guest_name}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-warm-gray-400">
              약속
            </span>

            <MeetingTypeBadge
              value={
                booking.meeting_type
              }
              label={getMeetingTypeLabel(
                booking.meeting_type
              )}
            />
          </div>

          <div className="flex justify-between">
            <span className="text-warm-gray-400">
              장소
            </span>

            <span className="font-medium text-warm-gray-700">
              {getLocationLabel(
                slotInfo.location_text
              )}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-warm-gray-300 mt-6">
        아직 확정 전이에요. 확정되면
        따로 알려드릴게요 😊
      </p>
    </div>
  );
}

export default function BookingForm({
  slot,
}: BookingFormProps) {
  const [isPending, startTransition] =
    useTransition();

  const [error, setError] = useState<
    string | null
  >(null);

  const [
    completedBooking,
    setCompletedBooking,
  ] = useState<Booking | null>(null);

  const [
    selectedMeetingType,
    setSelectedMeetingType,
  ] = useState(slot.meeting_type);

  if (completedBooking) {
    return (
      <CompletionScreen
        booking={completedBooking}
        slot={slot}
      />
    );
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(
      event.currentTarget
    );

    startTransition(async () => {
      const result = await createBooking(
        slot.id,
        formData
      );

      if (
        result.success &&
        result.data
      ) {
        setCompletedBooking(
          result.data.booking
        );

        return;
      }

      setError(
        result.error ??
          "예약 신청 중 오류가 발생했어요. 다시 시도해주세요."
      );
    });
  }

  if (slot.remaining === 0) {
    return (
      <div className="text-center py-12 px-5">
        <p className="text-4xl mb-4">
          😢
        </p>

        <p className="font-semibold text-warm-gray-700">
          이 시간은 이미 약속이
          잡혔어요
        </p>

        <p className="text-sm text-warm-gray-400 mt-2">
          다른 날을 선택해주세요
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 px-5 pb-10"
    >
      {/* 이름 */}
      <Input
        label="이름"
        name="guest_name"
        type="text"
        required
        placeholder="홍길동"
        maxLength={20}
        autoComplete="name"
      />

      {/* 약속 유형 선택 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-warm-gray-700">
          어떤 약속이에요?
        </label>

        <div className="grid grid-cols-3 gap-2">
          {MEETING_TYPES.map(
            (type) => (
              <label
                key={type.value}
                className="relative cursor-pointer"
              >
                <input
                  type="radio"
                  name="meeting_type"
                  value={type.value}
                  checked={
                    selectedMeetingType ===
                    type.value
                  }
                  onChange={() =>
                    setSelectedMeetingType(
                      type.value
                    )
                  }
                  className="sr-only"
                  required
                />

                <div
                  className={`flex items-center justify-center py-2.5 rounded-xl border text-sm transition-all ${
                    selectedMeetingType ===
                    type.value
                      ? "border-peach-300 bg-peach-100 text-peach-500"
                      : "border-warm-gray-200 bg-white text-warm-gray-600"
                  }`}
                >
                  {type.label}
                </div>
              </label>
            )
          )}
        </div>
      </div>

      {/* 연락처 */}
      <Input
        label="연락처 또는 카카오톡 이름 (선택)"
        name="guest_contact"
        type="text"
        placeholder="카카오톡 이름이나 전화번호"
        hint="확정 안내를 받을 수 있게 남겨주세요"
      />

      {/* 메모 */}
      <Textarea
        label="메모 (선택)"
        name="note"
        placeholder="하고 싶은 말이 있으면 적어줘요"
        rows={2}
      />

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={isPending}
        size="lg"
      >
        {BOOKING_BUTTON_TEXT}
      </Button>

      <p className="text-xs text-center text-warm-gray-400">
        예약 신청 후 관리자가
        확인하면 확정돼요 😊
      </p>
    </form>
  );
}
