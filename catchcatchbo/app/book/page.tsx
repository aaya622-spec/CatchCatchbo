import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingCalendar from "@/components/booking/BookingCalendar";
import NoticeTicker from "@/components/booking/NoticeTicker";
import SlotBannerCarousel from "@/components/booking/SlotBannerCarousel";
import {
  APP_NAME,
  BOOKING_PAGE_GREETING,
  BOOKING_PAGE_SUB,
} from "@/lib/constants";
import { getTodayKST } from "@/lib/utils";
import type {
  SlotWithCount,
} from "@/lib/types";

export const dynamic =
  "force-dynamic";

export const metadata = {
  title: "약속 잡기",
};

export default async function BookPage() {
  const supabase =
    await createClient();

  const today =
    getTodayKST();

  const {
    data: rawSlots,
    error,
  } = await supabase
    .from("slots_with_count")
    .select("*")
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
    rawSlots ?? []
  ).map((slot) => ({
    ...slot,

    image_url:
      slot.image_url ?? null,

    image_position:
      slot.image_position ??
      "center",

    booking_count:
      slot.booking_count ?? 0,

    remaining:
      slot.remaining ?? 0,

    is_full:
      (slot.remaining ?? 0) ===
      0,
  }));

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="px-5 pt-8 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">
            🎯
          </span>

          <span className="text-base font-bold text-warm-gray-800">
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

      <main className="px-5">
        {/* 공지 */}
        <div className="mb-5">
          <NoticeTicker />
        </div>

        {/* 추천 일정 자동 롤링 배너 */}
        <SlotBannerCarousel
          slots={slots}
        />

        {/* 캘린더 */}
        {slots.length === 0 ? (
          <div className="card p-10 text-center mt-4">
            <p className="text-4xl mb-4">
              🌙
            </p>

            <p className="font-semibold text-warm-gray-600">
              지금은 열려있는 날이
              없어요
            </p>

            <p className="text-sm text-warm-gray-400 mt-2">
              원하는 날짜를 직접
              제안해도 좋아요!
            </p>
          </div>
        ) : (
          <BookingCalendar
            slots={slots}
          />
        )}

        {/* 날짜 제안 */}
        <section className="mt-8">
          <div className="card p-5 text-center">
            <div className="text-3xl mb-3">
              💌
            </div>

            <h2 className="font-semibold text-warm-gray-700">
              원하는 날이 없나요?
            </h2>

            <p className="text-sm text-warm-gray-400 mt-2 leading-relaxed">
              만나고 싶은 날짜와 시간을
              제안해 주세요.
              <br />
              확인하고 알려드릴게요 😊
            </p>

            <Link
              href="/book/propose"
              className="btn-secondary w-full text-center mt-4"
            >
              다른 날짜 제안하기
            </Link>
          </div>
        </section>
      </main>

      <footer className="text-center py-10 text-xs text-warm-gray-300">
        {APP_NAME}으로 만들었어요
      </footer>
    </div>
  );
}
