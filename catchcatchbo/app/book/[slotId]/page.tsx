import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/components/booking/BookingForm";
import { MeetingTypeBadge, RemainingBadge } from "@/components/ui/Badge";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
  getLocationLabel,
  getTodayKST,
} from "@/lib/utils";
import type { SlotWithCount } from "@/lib/types";

export const dynamic = "force-dynamic";

interface BookingPageProps {
  params: Promise<{ slotId: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slotId } = await params;
  const supabase = await createClient();
  const today = getTodayKST();

  // 슬롯 조회 + 예약 수
  const { data: rawSlot } = await supabase
    .from("available_slots")
    .select(`*, bookings(count)`)
    .eq("id", slotId)
    .eq("is_active", true)
    .gte("date", today)
    .single();

  if (!rawSlot) notFound();

  const confirmed = (rawSlot.bookings as { count: number }[])?.[0]?.count ?? 0;
  const slot: SlotWithCount = {
    ...rawSlot,
    bookings: undefined,
    booking_count: confirmed,
    remaining: Math.max(rawSlot.max_guests - confirmed, 0),
    is_full: confirmed >= rawSlot.max_guests,
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm border-b border-cream-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/book" className="btn-ghost p-2 -ml-2">
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
          <span className="text-sm text-warm-gray-500">다른 날 보기</span>
        </div>
      </header>

      {/* 슬롯 요약 */}
      <div className="px-5 py-6 border-b border-cream-200">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h1 className="text-xl font-bold text-warm-gray-800">
              {formatKoreanDate(slot.date)}
            </h1>
            <p className="text-warm-gray-500 mt-1">
              {formatTimeRange(slot.start_time, slot.end_time)}
            </p>
          </div>
          <RemainingBadge remaining={slot.remaining} max={slot.max_guests} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MeetingTypeBadge
            value={slot.meeting_type}
            label={getMeetingTypeLabel(slot.meeting_type)}
          />
          <span className="text-sm text-warm-gray-400">
            📍 {getLocationLabel(slot.location_text)}
          </span>
        </div>
        {slot.description && (
          <p className="text-sm text-warm-gray-400 mt-3 bg-cream-100 rounded-xl px-3 py-2">
            {slot.description}
          </p>
        )}
      </div>

      {/* 예약 폼 */}
      <div className="pt-6">
        <BookingForm slot={slot} />
      </div>
    </div>
  );
}
