import { createClient } from "@/lib/supabase/server";
import PublicSlotCard from "@/components/booking/PublicSlotCard";
import {
  APP_NAME,
  BOOKING_PAGE_GREETING,
  BOOKING_PAGE_SUB,
} from "@/lib/constants";
import { getTodayKST } from "@/lib/utils";
import type { SlotWithCount } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "약속 잡기",
};

export default async function BookPage() {
  const supabase = await createClient();
  const today = getTodayKST();

  // 활성화된 미래 슬롯 + 확정 예약 수 조회
  const { data: rawSlots } = await supabase
    .from("available_slots")
    .select(
      `
      *,
      bookings(count)
    `
    )
    .eq("is_active", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const slots: SlotWithCount[] = (rawSlots ?? []).map((s) => {
    const confirmed = (s.bookings as { count: number }[])?.[0]?.count ?? 0;
    return {
      ...s,
      bookings: undefined,
      booking_count: confirmed,
      remaining: Math.max(s.max_guests - confirmed, 0),
      is_full: confirmed >= s.max_guests,
    };
  });

  // 예약 가능한 슬롯만 (마감 포함해서 보여주되 CTA만 비활성화)
  const availableSlots = slots;

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <span className="text-sm font-medium text-warm-gray-400">{APP_NAME}</span>
        </div>
        <h1 className="text-xl font-bold text-warm-gray-800 leading-snug">
          {BOOKING_PAGE_GREETING}
        </h1>
        <p className="text-sm text-warm-gray-500 mt-2 whitespace-pre-line leading-relaxed">
          {BOOKING_PAGE_SUB}
        </p>
      </header>

      {/* 슬롯 목록 */}
      <div className="px-5">
        {availableSlots.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-4">🌙</p>
            <p className="font-semibold text-warm-gray-600">
              지금은 열려있는 날이 없어요
            </p>
            <p className="text-sm text-warm-gray-400 mt-2">
              곧 새로운 날짜가 열릴 거예요!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {availableSlots.map((slot) => (
              <PublicSlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer className="text-center py-10 text-xs text-warm-gray-300">
        {APP_NAME}으로 만들었어요
      </footer>
    </div>
  );
}
