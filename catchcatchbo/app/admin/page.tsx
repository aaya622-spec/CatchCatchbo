import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminSlotCard from "@/components/admin/AdminSlotCard";
import BookingList from "@/components/admin/BookingList";
import ShareSection from "@/components/admin/ShareSection";
import { signOut } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/constants";
import { getTodayKST } from "@/lib/utils";
import type {
  SlotWithCount,
  Booking,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type RawAdminSlot = {
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

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = getTodayKST();

  const {
    data: rawSlots,
    error: slotsError,
  } = await supabase
    .from("available_slots")
    .select(`
      *,
      bookings (
        status
      )
    `)
    .eq("owner_id", user.id)
    .gte("date", today)
    .order("date", {
      ascending: true,
    })
    .order("start_time", {
      ascending: true,
    });

  if (slotsError) {
    console.error(
      "AdminPage slots error:",
      slotsError
    );
  }

  const slots: SlotWithCount[] = (
    (rawSlots ?? []) as RawAdminSlot[]
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
        slot.max_guests - confirmedCount,
        0
      ),
      is_full:
        confirmedCount >=
        slot.max_guests,
    };
  });

  const slotIds = slots.map(
    (slot) => slot.id
  );

  let bookings: Booking[] = [];

  if (slotIds.length > 0) {
    const {
      data: bookingRows,
      error: bookingsError,
    } = await supabase
      .from("bookings")
      .select(`
        *,
        available_slots (
          date,
          start_time,
          end_time,
          title,
          location_text,
          meeting_type
        )
      `)
      .in("slot_id", slotIds)
      .order("created_at", {
        ascending: false,
      });

    if (bookingsError) {
      console.error(
        "AdminPage bookings error:",
        bookingsError
      );
    }

    bookings =
      (bookingRows as Booking[]) ?? [];
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://catch-catchbo.vercel.app";

  const bookUrl = `${siteUrl}/book`;

  const activeSlots = slots.filter(
    (slot) => slot.is_active
  );

  const inactiveSlots = slots.filter(
    (slot) => !slot.is_active
  );

  const confirmedBookings =
    bookings.filter(
      (booking) =>
        booking.status === "confirmed"
    );

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm border-b border-cream-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-warm-gray-800">
            {APP_NAME} 관리
          </h1>

          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-warm-gray-400 active:scale-95 transition-all"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="px-5 pt-6 flex flex-col gap-8">
        {/* 요약 카드 */}
        <section className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-peach-400">
              {activeSlots.length}
            </p>

            <p className="text-xs text-warm-gray-400 mt-0.5">
              열려있는 날
            </p>
          </div>

          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-sage-400">
              {confirmedBookings.length}
            </p>

            <p className="text-xs text-warm-gray-400 mt-0.5">
              예약 완료
            </p>
          </div>

          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-warm-gray-600">
              {slots.reduce(
                (total, slot) =>
                  total + slot.remaining,
                0
              )}
            </p>

            <p className="text-xs text-warm-gray-400 mt-0.5">
              남은 자리
            </p>
          </div>
        </section>

        {/* 공유 링크 */}
        <ShareSection
          bookUrl={bookUrl}
        />

        {/* Google Calendar 연결 */}
        <section className="card p-4">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold text-warm-gray-700">
                Google Calendar
              </h2>

              <p className="text-sm text-warm-gray-400 mt-1">
                예약을 확정하면 내 캘린더에 자동으로 등록해요.
              </p>
            </div>

            <a
              href="/api/auth/google"
              className="btn-primary w-full text-center"
            >
              Google Calendar 연결하기
            </a>
          </div>
        </section>

        {/* 일정 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-gray-700">
              내 일정
            </h2>

            <Link
              href="/admin/slots/new"
              className="btn-primary text-sm px-4 py-2.5 rounded-xl"
            >
              + 가능한 날 열기
            </Link>
          </div>

          {slots.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-3">
                📅
              </p>

              <p className="text-warm-gray-500 font-medium">
                아직 열어둔 날이 없어요
              </p>

              <p className="text-sm text-warm-gray-400 mt-1">
                가능한 날짜와 시간을 등록해보세요!
              </p>

              <Link
                href="/admin/slots/new"
                className="btn-primary inline-flex mt-4 text-sm"
              >
                첫 일정 열기
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeSlots.map(
                (slot) => (
                  <AdminSlotCard
                    key={slot.id}
                    slot={slot}
                  />
                )
              )}

              {inactiveSlots.length > 0 && (
                <>
                  <p className="text-xs text-warm-gray-400 mt-2">
                    비활성 일정
                  </p>

                  {inactiveSlots.map(
                    (slot) => (
                      <AdminSlotCard
                        key={slot.id}
                        slot={slot}
                      />
                    )
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* 예약 현황 */}
        <section>
          <h2 className="font-semibold text-warm-gray-700 mb-4">
            예약 현황
          </h2>

          <BookingList
            bookings={bookings}
          />
        </section>
      </div>
    </div>
  );
}
