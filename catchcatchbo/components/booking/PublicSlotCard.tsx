import Link from "next/link";
import { MeetingTypeBadge, RemainingBadge } from "@/components/ui/Badge";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";
import type { SlotWithCount } from "@/lib/types";

interface PublicSlotCardProps {
  slot: SlotWithCount;
}

export default function PublicSlotCard({ slot }: PublicSlotCardProps) {
  const isFull = slot.remaining === 0;

  return (
    <div
      className={`card p-5 flex flex-col gap-3 transition-all ${
        isFull ? "opacity-60" : "hover:shadow-md active:scale-[0.99]"
      }`}
    >
      {/* 날짜 + 배지 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-warm-gray-800 text-lg leading-tight">
            {formatKoreanDate(slot.date)}
          </p>
          <p className="text-sm text-warm-gray-500 mt-1">
            {formatTimeRange(slot.start_time, slot.end_time)}
          </p>
        </div>
        <RemainingBadge remaining={slot.remaining} max={slot.max_guests} />
      </div>

      {/* 약속 유형 + 장소 */}
      <div className="flex items-center gap-2 flex-wrap">
        <MeetingTypeBadge
          value={slot.meeting_type}
          label={getMeetingTypeLabel(slot.meeting_type)}
        />
        <span className="text-sm text-warm-gray-400">
          📍 {getLocationLabel(slot.location_text)}
        </span>
      </div>

      {/* 설명 */}
      {slot.description && (
        <p className="text-sm text-warm-gray-400">{slot.description}</p>
      )}

      {/* 인원이 여러 명이면 현황 표시 */}
      {slot.max_guests > 1 && (
        <p className="text-xs text-warm-gray-400">
          현재 {slot.booking_count}/{slot.max_guests}명 예약 완료
        </p>
      )}

      {/* CTA */}
      {isFull ? (
        <div className="w-full py-3.5 rounded-2xl bg-warm-gray-100 text-warm-gray-400 text-center text-sm font-medium">
          이 시간은 이미 약속이 잡혔어요
        </div>
      ) : (
        <Link
          href={`/book/${slot.id}`}
          className="btn-primary w-full text-center"
        >
          이날 만날래요
        </Link>
      )}
    </div>
  );
}
