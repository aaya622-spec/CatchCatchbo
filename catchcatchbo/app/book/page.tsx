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

  const { data: rawSlots, error } = await supabase
    .from("slots_with_count")
    .select("*")
    .eq("is_active", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("BookPage slots error:", error);
  }

  const slots: SlotWithCount[] = (rawSlots ?? []).map((slot) => ({
    ...slot,
    booking_count: slot.booking_count ?? 0,
    remaining: slot.remaining ?? 0,
    is_full: (slot.remaining ?? 0) === 0,
  }));

  return (
    <div className="min-h-screen pb-20">
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>

          <span className="text-sm font-medium text-warm-gray-400">
            {APP_NAME}
          </span>
        </div>

        <h1 className="text-xl font-bold text-warm-gray-800 leading-snug">
          {BOOKING_PAGE_GREETING}
        </h1>

        <p className="text-sm text-warm-gray-500 mt-2 whitespace-pre-line leading-relaxed">
          {BOOKING_PAGE_SUB}
        </p>
      </header>

      <div className="px-5">
        {slots.length === 0 ? (
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
            {slots.map((slot) => (
              <PublicSlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-10 text-xs text-warm-gray-300">
        {APP_NAME}으로 만들었어요
      </footer>
    </div>
  );
}
