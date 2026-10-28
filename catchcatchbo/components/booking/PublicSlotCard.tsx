import Link from "next/link";
import { formatKoreanDate, getMeetingTypeLabel, getLocationLabel } from "@/lib/utils";
import type { SlotWithCount } from "@/lib/types";

interface PublicSlotCardProps {
  slot: SlotWithCount;
}

function formatDateRange(startDate: string, endDate?: string | null): string {
  const finalEndDate = endDate || startDate;
  return startDate === finalEndDate
    ? formatKoreanDate(startDate)
    : `${formatKoreanDate(startDate)} ~ ${formatKoreanDate(finalEndDate)}`;
}

export default function PublicSlotCard({ slot }: PublicSlotCardProps) {
  const personal = !!slot.personal_event;
  const full = personal || slot.is_full || slot.remaining <= 0;
  const allDay = personal
    ? slot.all_day
    : slot.start_time.slice(0, 5) === "00:00" && slot.end_time.slice(0, 5) === "23:59";
  const border = personal ? "border-purple-300" : full ? "border-red-300" : "border-green-300";
  const labelColor = personal ? "text-purple-600" : full ? "text-red-500" : "text-green-600";
  const label = personal
    ? "🟣 개인 일정 · 이미 일정 있음"
    : full
      ? "🔴 약속 · 이미 일정 있음"
      : `🟢 열린 일정 · ${slot.max_guests > 1 ? `${slot.remaining}자리 남음` : "예약 가능"}`;
  const location = !personal && slot.location_text && slot.location_text !== "tbd"
    ? getLocationLabel(slot.location_text)
    : null;

  return (
    <article className={`card p-5 border-l-4 ${border}`}>
      <p className={`text-xs mb-2 ${labelColor}`}>{label}</p>
      <h4 className="font-semibold text-warm-gray-800 break-words">
        {slot.title || getMeetingTypeLabel(slot.meeting_type) || "약속"}
      </h4>
      <p className="text-sm text-warm-gray-500 mt-2">
        {formatDateRange(slot.date, slot.end_date)} ·{" "}
        {allDay ? "종일" : `${slot.start_time.slice(0, 5)} ~ ${slot.end_time.slice(0, 5)}`}
      </p>
      {location && <p className="text-sm text-warm-gray-500 mt-2">📍 {location}</p>}
      {slot.description && (
        <p className="text-sm text-warm-gray-700 whitespace-pre-wrap break-words mt-2">
          {slot.description}
        </p>
      )}
      {!full && (
        <Link href={`/book/${slot.id}`}
          className="inline-flex items-center gap-1 mt-3 py-1 text-sm font-semibold text-peach-500 hover:underline">
          이날 만날래요 <span aria-hidden="true">→</span>
        </Link>
      )}
    </article>
  );
}
