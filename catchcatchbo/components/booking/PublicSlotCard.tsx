import Link from "next/link";
import { MeetingTypeBadge, RemainingBadge } from "@/components/ui/Badge";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";
import type { SlotWithCount } from "@/lib/types";

interface PublicSlotCardProps {
  slot: SlotWithCount;
}

function formatDateRange(startDate: string, endDate?: string | null): string {
  const finalEndDate = endDate || startDate;

  if (startDate === finalEndDate) {
    return formatKoreanDate(startDate);
  }

  return `${formatKoreanDate(startDate)} ~ ${formatKoreanDate(finalEndDate)}`;
}

export default function PublicSlotCard({ slot }: PublicSlotCardProps) {
  if (slot.personal_event)
    return (
      <article className="card p-5 border-l-4 border-purple-300">
        <p className="text-xs text-purple-600 mb-2">
          🟣 개인 일정 · 이미 일정 있음
        </p>
        <h4 className="font-semibold text-warm-gray-800">{slot.title}</h4>
        <p className="text-sm text-warm-gray-500 mt-2">
          {formatDateRange(slot.date, slot.end_date)} ·{" "}
          {slot.all_day
            ? "종일"
            : `${slot.start_time.slice(0, 5)} ~ ${slot.end_time.slice(0, 5)}`}
        </p>
        {slot.description && (
          <p className="text-sm whitespace-pre-wrap mt-2">{slot.description}</p>
        )}
      </article>
    );
  const isFull = slot.remaining === 0;

  const dateRange = formatDateRange(slot.date, slot.end_date);

  return (
    <div
      className={`card overflow-hidden transition-all ${
        isFull ? "opacity-60" : "hover:shadow-md active:scale-[0.99]"
      }`}
    >
      {/* 대표 이미지 */}
      {slot.image_url && (
        <div className="w-full aspect-[4/1] overflow-hidden bg-warm-gray-100">
          <img
            src={slot.image_url}
            alt={slot.title ?? "약속 대표 이미지"}
            className="w-full h-full object-cover"
            style={{
              objectPosition: slot.image_position ?? "center",
            }}
          />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        {/* 날짜 + 예약 가능 배지 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-warm-gray-800 text-lg leading-snug">
              {dateRange}
            </p>
            <p className="text-xs text-warm-gray-500 mt-1">
              {slot.start_time.slice(0, 5)} ~ {slot.end_time.slice(0, 5)}
            </p>
          </div>

          <div className="shrink-0">
            <RemainingBadge remaining={slot.remaining} max={slot.max_guests} />
          </div>
        </div>

        {/* 약속 제목 */}
        {slot.title && (
          <p className="text-base font-semibold text-warm-gray-700 leading-snug">
            {slot.title}
          </p>
        )}

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
          <p className="text-sm text-warm-gray-400 leading-relaxed">
            {slot.description}
          </p>
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
            이 날짜는 이미 약속이 잡혔어요
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
    </div>
  );
}
