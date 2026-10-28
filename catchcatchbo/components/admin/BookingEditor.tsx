"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateBooking } from "@/lib/actions/adminBookingEdit";
import type { Booking } from "@/lib/types";
import { MEETING_TYPES } from "@/lib/constants";
import { getMeetingTypeLabel } from "@/lib/utils";

export default function BookingEditor({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const slot = booking.available_slots;
  if (!slot) return null;
  return (
    <div>
      {!open && (
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => {
            setOpen(true);
            setMessage("");
            setSaved(false);
          }}
        >
          예약 수정
        </button>
      )}
      {open && (
        <form
          className="rounded-xl bg-cream-100 p-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !confirm(
                "입력한 내용으로 예약을 변경할까요? 변경 후 친구에게 알려주세요.",
              )
            )
              return;
            const form = new FormData(e.currentTarget);
            setMessage("");
            start(async () => {
              try {
                const r = await adminUpdateBooking(booking.id, form);
                if (!r.success) {
                  setMessage(r.error || "수정하지 못했어요.");
                  return;
                }
                setSaved(true);
                setMessage(
                  r.data?.warning ||
                    "예약을 수정했어요. 친구에게 변경 내용을 알려주세요.",
                );
                router.refresh();
              } catch {
                setMessage(
                  "요청 결과를 확인하지 못했어요. 새로고침해 저장 여부를 확인해주세요.",
                );
              }
            });
          }}
        >
          <p className="font-semibold">예약 수정</p>
          <p className="text-xs text-warm-gray-500">
            날짜·시간·장소 변경은 이 예약에만 적용돼요. 원래 일정에 다른 신청이
            없으면 원래 일정은 비활성화돼요.
          </p>
          <label>
            약속 이름
            <input
              className="input-base w-full"
              name="booking_title"
              required
              maxLength={40}
              defaultValue={booking.booking_title}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              시작일
              <input
                className="input-base w-full"
                type="date"
                name="date"
                required
                defaultValue={slot.date}
              />
            </label>
            <label>
              종료일
              <input
                className="input-base w-full"
                type="date"
                name="end_date"
                required
                defaultValue={slot.end_date || slot.date}
              />
            </label>
          </div>
          <p className="text-xs text-warm-gray-400">
            기존 약속은 날짜 단위 예약 방식을 유지해요. 개인 일정은 시간을 지정할 수 있어요.
          </p>
          <label>
            장소
            <input
              className="input-base w-full"
              name="location_text"
              required
              maxLength={200}
              defaultValue={slot.location_text}
            />
          </label>
          <label>
            친구 이름
            <input
              className="input-base w-full"
              name="guest_name"
              required
              maxLength={20}
              defaultValue={booking.guest_name}
            />
          </label>
          <label>
            연락처
            <input
              className="input-base w-full"
              name="guest_contact"
              maxLength={100}
              defaultValue={booking.guest_contact || ""}
            />
          </label>
          <label>
            인원
            <input
              className="input-base w-full"
              type="number"
              name="guest_count"
              required
              min={1}
              max={4}
              defaultValue={booking.guest_count}
            />
          </label>
          <label>
            약속 종류
            <input
              className="input-base w-full"
              name="meeting_type"
              required
              maxLength={50}
              list={`types-${booking.id}`}
              defaultValue={booking.meeting_type}
            />
          </label>
          <datalist id={`types-${booking.id}`}>
            {MEETING_TYPES.filter((t) => t.value !== "custom").map((t) => (
              <option key={t.value} value={t.value}>
                {getMeetingTypeLabel(t.value)}
              </option>
            ))}
          </datalist>
          <label>
            메모
            <textarea
              className="input-base w-full"
              name="note"
              maxLength={2000}
              defaultValue={booking.note || ""}
            />
          </label>
          {message && (
            <p
              role="status"
              className="text-sm text-warm-gray-700 whitespace-pre-wrap"
            >
              {message}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending || saved}>
              {pending ? "저장 중…" : saved ? "저장 완료" : "변경 저장"}
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                router.refresh();
              }}
            >
              닫기
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
