import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/components/booking/BookingForm";
import {
  MeetingTypeBadge,
  RemainingBadge,
} from "@/components/ui/Badge";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
  getLocationLabel,
  getTodayKST,
} from "@/lib/utils";
import type { SlotWithCount } from "@/lib/types";

export const dynamic = "force-dynamic";

interface BookingPageProps {
  params: Promise<{
    slotId: string;
  }>;
}

// ============================================================
// 날짜 범위 표시
// ============================================================

function formatDateRange(
  startDate: string,
  endDate?: string | null
): string {
  const finalEndDate =
    endDate || startDate;

  if (
    startDate === finalEndDate
  ) {
    return formatKoreanDate(
      startDate
    );
  }

  return `${formatKoreanDate(
    startDate
  )} ~ ${formatKoreanDate(
    finalEndDate
  )}`;
}

// ============================================================
// 예약 상세 페이지
// ============================================================

export default async function BookingPage({
  params,
}: BookingPageProps) {
  const { slotId } =
    await params;

  const supabase =
    await createClient();

  const today =
    getTodayKST();

  const {
    data: rawSlot,
    error,
  } = await supabase
    .from("slots_with_count")
    .select("*")
    .eq("id", slotId)
    .eq("is_active", true)

    /*
     * 여러 날 일정은 시작일이 지났더라도
     * 종료일이 오늘 이후라면 접근 가능
     */
    .gte("end_date", today)

    .single();

  if (
    error ||
    !rawSlot
  ) {
    notFound();
  }

  const slot: SlotWithCount = {
    ...rawSlot,

    date:
      rawSlot.date,

    end_date:
      rawSlot.end_date ??
      rawSlot.date,

    /*
     * 기존 DB / 타입 호환용
     */
    start_time:
      rawSlot.start_time ??
      "00:00",

    end_time:
      rawSlot.end_time ??
      "23:59",

    image_url:
      rawSlot.image_url ??
      null,

    image_position:
      rawSlot.image_position ??
      "center",

    image_text_color:
      rawSlot.image_text_color ??
      "dark",

    booking_count:
      rawSlot.booking_count ??
      0,

    remaining:
      rawSlot.remaining ??
      0,

    is_full:
      (rawSlot.remaining ??
        0) === 0,
  };

  const dateRange =
    formatDateRange(
      slot.date,
      slot.end_date
    );

  return (
    <div className="min-h-screen pb-20">
      {/* ====================================================== */}
      {/* 헤더 */}
      {/* ====================================================== */}

      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm border-b border-cream-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="btn-ghost p-2 -ml-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M19 12H5M12 5l-7 7 7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <span className="text-sm text-warm-gray-500">
            다른 날 보기
          </span>
        </div>
      </header>

      {/* ====================================================== */}
      {/* 일정 정보 */}
      {/* ====================================================== */}

      <div className="px-5 py-6 border-b border-cream-200">
        {/* 날짜 + 예약 상태 */}

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-warm-gray-800 leading-snug">
              {dateRange}
            </h1>
          </div>

          <div className="shrink-0">
            <RemainingBadge
              remaining={
                slot.remaining
              }
              max={
                slot.max_guests
              }
            />
          </div>
        </div>

        {/* 약속 제목 */}

        {slot.title && (
          <p className="text-base font-semibold text-warm-gray-700 mb-3">
            {slot.title}
          </p>
        )}

        {/* 약속 유형 + 장소 */}

        <div className="flex items-center gap-2 flex-wrap">
          <MeetingTypeBadge
            value={
              slot.meeting_type
            }
            label={getMeetingTypeLabel(
              slot.meeting_type
            )}
          />

          <span className="text-sm text-warm-gray-400">
            📍{" "}
            {getLocationLabel(
              slot.location_text
            )}
          </span>
        </div>

        {/* 설명 */}

        {slot.description && (
          <p className="text-sm text-warm-gray-400 mt-3 bg-cream-100 rounded-xl px-3 py-2 leading-relaxed">
            {
              slot.description
            }
          </p>
        )}
      </div>

      {/* ====================================================== */}
      {/* 예약 폼 */}
      {/* ====================================================== */}

      <div className="pt-6">
        <BookingForm
          slot={slot}
        />
      </div>
    </div>
  );
}
