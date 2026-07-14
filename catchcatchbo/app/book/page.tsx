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

type RawSlot = {
  id: string;
  owner_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string | null;
  meeting_type: string;
  description: string | null;
  location_text: string;
  max_guests: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bookings:
    | {
        status: string;
      }[]
    | null;
};

export default async function BookPage() {
  const supabase = await createClient();
  const today = getTodayKST();

  const { data: rawSlots, error } = await supabase
    .from("available_slots")
    .select(`
      *,
      bookings (
        status
      )
    `)
    .eq("is_active", true)
    .gte("date", today)
    .order("date", {
      ascending: true,
    })
    .order("start_time", {
      ascending: true,
    });

  if (error) {
    console.error(
      "BookPage slots error:",
      error
    );
  }

  const slots: SlotWithCount[] = (
    (rawSlots ?? []) as RawSlot[]
  ).map((slot) => {
    const confirmedCount = (
      slot.bookings ?? []
    ).filter(
      (booking) =>
        booking.status === "confirmed"
    ).length;

    return {
      id: slot.id,
      owner_id: slot.owner_id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      title: slot.title,
      meeting_type: slot.meeting_type,
      description: slot.description,
      location_text: slot.location_text,
      max_guests: slot.max_guests,
      is_active: slot.is_active,
      created_at: slot.created_at,
      updated_at: slot.updated_at,
      booking_count: confirmedCount,
      remaining: Math.max(
        slot.max_guests -
          confirmedCount,
        0
      ),
      is_full:
        confirmedCount >=
        slot.max_guests,
    };
  });

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">
            🎯
          </span>

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

      {/* 슬롯 목록 */}
      <div className="px-5">
        {slots.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-4">
              🌙
            </p>

            <p className="font-semibold text-warm-gray-600">
              지금은 열려있는 날이
              없어요
            </p>

            <p className="text-sm text-warm-gray-400 mt-2">
              곧 새로운 날짜가 열릴
              거예요!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {slots.map((slot) => (
              <PublicSlotCard
                key={slot.id}
                slot={slot}
              />
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
