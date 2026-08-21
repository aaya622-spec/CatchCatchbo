import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import AdminSlotCard from "@/components/admin/AdminSlotCard";
import BookingList from "@/components/admin/BookingList";
import ProposalList from "@/components/admin/ProposalList";
import ProposalChangeRequestList from "./ProposalChangeRequestList";
import HistoryManager from "./HistoryManager";
import ShareSection from "@/components/admin/ShareSection";

import { signOut } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/constants";

import {
  formatKoreanDate,
  getMeetingTypeLabel,
  getTodayKST,
} from "@/lib/utils";

import type {
  SlotWithCount,
  Booking,
  DateProposal,
} from "@/lib/types";

export const dynamic =
  "force-dynamic";

// ============================================================
// 탭
// ============================================================

type AdminTab =
  | "home"
  | "requests"
  | "schedule"
  | "history";

interface AdminPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

// ============================================================
// 관리자 일정 타입
// ============================================================

type RawAdminSlot = {
  id: string;
  owner_id: string;

  date: string;
  end_date: string | null;

  start_time: string;
  end_time: string;

  title: string | null;
  meeting_type: string;
  description: string | null;
  location_text: string;

  image_url: string | null;
  image_position: string | null;

  image_text_color:
    | "dark"
    | "light";

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

// ============================================================
// 날짜 제안 변경 요청 타입
// ============================================================

type ProposalChangeRequest = {
  id: string;

  proposal_id: string;

  booking_title: string;

  proposed_date: string;

  proposed_end_date:
    | string
    | null;

  guest_count: number;

  meeting_type: string;

  note: string | null;

  status: string;

  created_at: string;

  date_proposals:
    | {
        id: string;
        guest_name: string;
        guest_contact:
          | string
          | null;
        booking_title: string;
        proposed_date: string;
        proposed_end_date:
          | string
          | null;
        guest_count: number;
        meeting_type: string;
        note: string | null;
        status: string;
      }
    | {
        id: string;
        guest_name: string;
        guest_contact:
          | string
          | null;
        booking_title: string;
        proposed_date: string;
        proposed_end_date:
          | string
          | null;
        guest_count: number;
        meeting_type: string;
        note: string | null;
        status: string;
      }[]
    | null;
};

// ============================================================
// 날짜 범위
// ============================================================

function formatDateRange(
  startDate: string,
  endDate?: string | null
) {
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
// 탭 버튼
// ============================================================

function AdminTabLink({
  tab,
  currentTab,
  label,
  count,
}: {
  tab: AdminTab;
  currentTab: AdminTab;
  label: string;
  count?: number;
}) {
  const active =
    tab === currentTab;

  return (
    <Link
      href={`/admin?tab=${tab}`}
      className={`relative flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center text-sm font-medium transition-all ${
        active
          ? "bg-white text-warm-gray-800 shadow-sm"
          : "text-warm-gray-400"
      }`}
    >
      {label}

      {!!count && (
        <span
          className={`ml-1 text-xs ${
            active
              ? "text-peach-500"
              : "text-warm-gray-400"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

// ============================================================
// 관리자 페이지
// ============================================================

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
  const params =
    await searchParams;

  const allowedTabs:
    AdminTab[] = [
      "home",
      "requests",
      "schedule",
      "history",
    ];

  const currentTab =
    allowedTabs.includes(
      params.tab as AdminTab
    )
      ? (params.tab as AdminTab)
      : "home";

  // ============================================================
  // 인증
  // ============================================================

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminSupabase =
    createAdminClient();

  const today =
    getTodayKST();

  // ============================================================
  // 일정
  // ============================================================

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
    .eq(
      "owner_id",
      user.id
    )
    .gte(
      "date",
      today
    )
    .order(
      "date",
      {
        ascending: true,
      }
    )
    .order(
      "start_time",
      {
        ascending: true,
      }
    );

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
        booking.status ===
        "confirmed"
    ).length;

    return {
      id:
        slot.id,

      owner_id:
        slot.owner_id,

      date:
        slot.date,

      end_date:
        slot.end_date ??
        slot.date,

      start_time:
        slot.start_time,

      end_time:
        slot.end_time,

      title:
        slot.title,

      meeting_type:
        slot.meeting_type,

      description:
        slot.description,

      location_text:
        slot.location_text,

      image_url:
        slot.image_url ??
        null,

      image_position:
        slot.image_position ??
        "center",

      image_text_color:
        slot.image_text_color ??
        "dark",

      max_guests:
        slot.max_guests,

      is_active:
        slot.is_active,

      created_at:
        slot.created_at,

      updated_at:
        slot.updated_at,

      booking_count:
        confirmedCount,

      remaining:
        Math.max(
          slot.max_guests -
            confirmedCount,
          0
        ),

      is_full:
        confirmedCount >=
        slot.max_guests,
    };
  });

  // ============================================================
  // 예약
  // ============================================================

  const slotIds =
    slots.map(
      (slot) =>
        slot.id
    );

  let bookings:
    Booking[] = [];

  if (
    slotIds.length > 0
  ) {
    const {
      data: bookingRows,
      error: bookingsError,
    } = await supabase
      .from("bookings")
      .select(`
        *,
        available_slots (
          date,
          end_date,
          start_time,
          end_time,
          title,
          location_text,
          meeting_type
        )
      `)
      .in(
        "slot_id",
        slotIds
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (bookingsError) {
      console.error(
        "AdminPage bookings error:",
        bookingsError
      );
    }

    bookings =
      (bookingRows as Booking[]) ??
      [];
  }

  // ============================================================
  // 날짜 제안
  // ============================================================

  const {
    data: proposalRows,
    error: proposalsError,
  } = await supabase
    .from("date_proposals")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (proposalsError) {
    console.error(
      "AdminPage proposals error:",
      proposalsError
    );
  }

  const proposals:
    DateProposal[] =
      (proposalRows as DateProposal[]) ??
      [];

  // ============================================================
  // 날짜 제안 변경 요청
  // ============================================================

  const {
    data:
      proposalChangeRows,

    error:
      proposalChangesError,
  } =
    await adminSupabase
      .from(
        "proposal_change_requests"
      )
      .select(`
        id,
        proposal_id,
        booking_title,
        proposed_date,
        proposed_end_date,
        guest_count,
        meeting_type,
        note,
        status,
        created_at,
        date_proposals (
          id,
          guest_name,
          guest_contact,
          booking_title,
          proposed_date,
          proposed_end_date,
          guest_count,
          meeting_type,
          note,
          status
        )
      `)
      .eq(
        "status",
        "pending"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (
    proposalChangesError
  ) {
    console.error(
      "AdminPage proposal changes error:",
      proposalChangesError
    );
  }

  const proposalChangeRequests =
    (
      proposalChangeRows ??
      []
    ) as ProposalChangeRequest[];

  // ============================================================
  // 데이터 분류
  // ============================================================

  const activeSlots =
    slots.filter(
      (slot) =>
        slot.is_active
    );

  const inactiveSlots =
    slots.filter(
      (slot) =>
        !slot.is_active
    );

  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        "pending"
    );

  const confirmedBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        "confirmed"
    );

  const canceledBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        "canceled"
    );

  const pendingProposals =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "pending"
    );

  const rejectedProposals =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "rejected"
    );

  const totalPending =
    pendingBookings.length +
    pendingProposals.length +
    proposalChangeRequests.length;

  // ============================================================
  // 홈 미리보기
  // ============================================================

  const upcomingBookings =
    confirmedBookings
      .filter(
        (booking) =>
          booking.available_slots
      )
      .sort(
        (a, b) => {
          const aDate =
            a.available_slots?.date ??
            "";

          const bDate =
            b.available_slots?.date ??
            "";

          return aDate.localeCompare(
            bDate
          );
        }
      )
      .slice(
        0,
        4
      );

  const previewSlots =
    activeSlots.slice(
      0,
      3
    );

  // ============================================================
  // 공유 URL
  // ============================================================

  const siteUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    "https://catch-catchbo.vercel.app";

  const bookUrl =
    `${siteUrl}/book`;

  // ============================================================
  // 화면
  // ============================================================

  return (
    <div className="min-h-screen pb-24">
      {/* ================================================== */}
      {/* 헤더 */}
      {/* ================================================== */}

      <header className="sticky top-0 z-20 bg-cream-100/95 backdrop-blur-sm border-b border-cream-200">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-warm-gray-800">
              {APP_NAME} 관리
            </h1>

            <form
              action={
                signOut
              }
            >
              <button
                type="submit"
                className="text-sm text-warm-gray-400"
              >
                로그아웃
              </button>
            </form>
          </div>

          <div className="mt-4 flex gap-1 rounded-2xl bg-cream-200/70 p-1">
            <AdminTabLink
              tab="home"
              currentTab={
                currentTab
              }
              label="홈"
            />

            <AdminTabLink
              tab="requests"
              currentTab={
                currentTab
              }
              label="요청"
              count={
                totalPending
              }
            />

            <AdminTabLink
              tab="schedule"
              currentTab={
                currentTab
              }
              label="일정"
            />

            <AdminTabLink
              tab="history"
              currentTab={
                currentTab
              }
              label="기록"
            />
          </div>
        </div>
      </header>

      <main className="px-5 pt-6">
        {/* ================================================== */}
        {/* HOME */}
        {/* ================================================== */}

        {currentTab ===
          "home" && (
          <div className="flex flex-col gap-8">
            {/* 요약 */}

            <section className="grid grid-cols-3 gap-3">
              <Link
                href="/admin?tab=requests"
                className="card p-4 text-center"
              >
                <p className="text-2xl font-bold text-peach-400">
                  {
                    totalPending
                  }
                </p>

                <p className="text-xs text-warm-gray-400 mt-1">
                  처리 대기
                </p>
              </Link>

              <Link
                href="/admin?tab=schedule"
                className="card p-4 text-center"
              >
                <p className="text-2xl font-bold text-sage-400">
                  {
                    confirmedBookings.length
                  }
                </p>

                <p className="text-xs text-warm-gray-400 mt-1">
                  예정 약속
                </p>
              </Link>

              <Link
                href="/admin?tab=schedule"
                className="card p-4 text-center"
              >
                <p className="text-2xl font-bold text-warm-gray-600">
                  {
                    activeSlots.length
                  }
                </p>

                <p className="text-xs text-warm-gray-400 mt-1">
                  열린 일정
                </p>
              </Link>
            </section>

            {/* 처리할 요청이 있을 때만 표시 */}

            {totalPending >
              0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-warm-gray-700">
                      🚨 지금 확인해주세요
                    </h2>

                    <p className="text-xs text-warm-gray-400 mt-1">
                      아직 처리하지 않은 요청이에요.
                    </p>
                  </div>

                  <Link
                    href="/admin?tab=requests"
                    className="text-sm text-peach-500"
                  >
                    전체 보기
                  </Link>
                </div>

                <div className="card p-5">
                  <div className="flex flex-col gap-4">
                    {proposalChangeRequests.length >
                      0 && (
                      <Link
                        href="/admin?tab=requests"
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-warm-gray-700">
                          🔄 변경 요청
                        </span>

                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                          {
                            proposalChangeRequests.length
                          }
                          건
                        </span>
                      </Link>
                    )}

                    {pendingBookings.length >
                      0 && (
                      <Link
                        href="/admin?tab=requests"
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-warm-gray-700">
                          🎯 예약 신청
                        </span>

                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                          {
                            pendingBookings.length
                          }
                          건
                        </span>
                      </Link>
                    )}

                    {pendingProposals.length >
                      0 && (
                      <Link
                        href="/admin?tab=requests"
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-warm-gray-700">
                          💌 날짜 제안
                        </span>

                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                          {
                            pendingProposals.length
                          }
                          건
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 다가오는 약속 */}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-warm-gray-700">
                  📅 다가오는 약속
                </h2>

                <Link
                  href="/admin?tab=schedule"
                  className="text-sm text-warm-gray-400"
                >
                  전체 보기
                </Link>
              </div>

              {upcomingBookings.length ===
              0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-warm-gray-400">
                    아직 예정된 약속이 없어요.
                  </p>
                </div>
              ) : (
                <div className="card divide-y divide-cream-200">
                  {upcomingBookings.map(
                    (booking) => {
                      const slot =
                        booking.available_slots;

                      if (
                        !slot
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={
                            booking.id
                          }
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-warm-gray-700">
                                {
                                  booking.booking_title
                                }
                              </p>

                              <p className="text-sm text-warm-gray-400 mt-1">
                                {
                                  booking.guest_name
                                }
                                님 ·{" "}
                                {getMeetingTypeLabel(
                                  booking.meeting_type
                                )}
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-medium text-warm-gray-600">
                              {formatDateRange(
                                slot.date,
                                slot.end_date
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* 가능한 날 */}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-warm-gray-700">
                  🗓 가능한 날
                </h2>

                <Link
                  href="/admin?tab=schedule"
                  className="text-sm text-warm-gray-400"
                >
                  전체 관리
                </Link>
              </div>

              {previewSlots.length ===
              0 ? (
                <div className="card p-6 text-center">
                  <p className="text-sm text-warm-gray-400">
                    현재 열려있는 일정이 없어요.
                  </p>
                </div>
              ) : (
                <div className="card divide-y divide-cream-200">
                  {previewSlots.map(
                    (slot) => (
                      <div
                        key={
                          slot.id
                        }
                        className="p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium text-warm-gray-700">
                            {slot.title ||
                              "약속 가능"}
                          </p>

                          <p className="text-xs text-warm-gray-400 mt-1">
                            {getMeetingTypeLabel(
                              slot.meeting_type
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-warm-gray-600">
                            {formatDateRange(
                              slot.date,
                              slot.end_date
                            )}
                          </p>

                          <p className="text-xs text-warm-gray-400 mt-1">
                            잔여{" "}
                            {
                              slot.remaining
                            }
                            명
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* 관리 */}

            <section>
              <h2 className="font-semibold text-warm-gray-700 mb-4">
                ⚙️ 관리
              </h2>

              <div className="card overflow-hidden divide-y divide-cream-200">
                <details>
                  <summary className="list-none cursor-pointer p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warm-gray-700">
                        🔗 예약 링크 공유
                      </p>

                      <p className="text-xs text-warm-gray-400 mt-1">
                        친구에게 보낼 예약 링크
                      </p>
                    </div>

                    <span className="text-warm-gray-300">
                      ›
                    </span>
                  </summary>

                  <div className="px-4 pb-4">
                    <ShareSection
                      bookUrl={
                        bookUrl
                      }
                    />
                  </div>
                </details>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-warm-gray-700">
                      📅 Google Calendar
                    </p>

                    <p className="text-xs text-warm-gray-400 mt-1">
                      확정 약속을 자동 등록해요.
                    </p>
                  </div>

                  <a
                    href="/api/auth/google"
                    className="btn-secondary text-sm shrink-0"
                  >
                    연결
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================== */}
        {/* REQUESTS */}
        {/* ================================================== */}

        {currentTab ===
          "requests" && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold text-warm-gray-800">
                요청
              </h2>

              <p className="text-sm text-warm-gray-400 mt-1">
                지금 처리해야 하는 요청만 모았어요.
              </p>
            </div>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-gray-700">
                  🔄 변경 요청
                </h3>

                {proposalChangeRequests.length >
                  0 && (
                  <span className="text-xs font-medium bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">
                    {
                      proposalChangeRequests.length
                    }
                    건
                  </span>
                )}
              </div>

              {proposalChangeRequests.length >
              0 ? (
                <ProposalChangeRequestList
                  requests={
                    proposalChangeRequests
                  }
                />
              ) : (
                <div className="card p-5 text-center text-sm text-warm-gray-400">
                  변경 요청이 없어요.
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-gray-700">
                  🎯 예약 신청
                </h3>

                {pendingBookings.length >
                  0 && (
                  <span className="text-xs font-medium bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">
                    {
                      pendingBookings.length
                    }
                    건
                  </span>
                )}
              </div>

              <BookingList
                bookings={
                  pendingBookings
                }
              />
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-gray-700">
                  💌 날짜 제안
                </h3>

                {pendingProposals.length >
                  0 && (
                  <span className="text-xs font-medium bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">
                    {
                      pendingProposals.length
                    }
                    건
                  </span>
                )}
              </div>

              <ProposalList
                proposals={
                  pendingProposals
                }
              />
            </section>
          </div>
        )}

        {/* ================================================== */}
        {/* SCHEDULE */}
        {/* ================================================== */}

        {currentTab ===
          "schedule" && (
          <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-warm-gray-800">
                  일정
                </h2>

                <p className="text-sm text-warm-gray-400 mt-1">
                  예정된 약속과 열어둔 날짜를 관리해요.
                </p>
              </div>

              <Link
                href="/admin/slots/new"
                className="btn-primary text-sm shrink-0"
              >
                + 날짜 열기
              </Link>
            </div>

            <section>
              <h3 className="font-semibold text-warm-gray-700 mb-4">
                📅 예정된 약속
              </h3>

              <BookingList
                bookings={
                  confirmedBookings
                }
              />
            </section>

            <section>
              <h3 className="font-semibold text-warm-gray-700 mb-4">
                🗓 가능한 날
              </h3>

              {slots.length ===
              0 ? (
                <div className="card p-8 text-center">
                  <p className="text-sm text-warm-gray-400">
                    아직 열어둔 날이 없어요.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeSlots.map(
                    (slot) => (
                      <AdminSlotCard
                        key={
                          slot.id
                        }
                        slot={
                          slot
                        }
                      />
                    )
                  )}

                  {inactiveSlots.length >
                    0 && (
                    <>
                      <p className="text-xs text-warm-gray-400 mt-3">
                        비활성 일정
                      </p>

                      {inactiveSlots.map(
                        (slot) => (
                          <AdminSlotCard
                            key={
                              slot.id
                            }
                            slot={
                              slot
                            }
                          />
                        )
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================== */}
        {/* HISTORY */}
        {/* ================================================== */}

        {currentTab ===
          "history" && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold text-warm-gray-800">
                기록
              </h2>

              <p className="text-sm text-warm-gray-400 mt-1">
                필요 없는 테스트나 지난 기록을 정리할 수 있어요.
              </p>
            </div>

            <HistoryManager
              rejectedProposals={
                rejectedProposals
              }
              canceledBookings={
                canceledBookings
              }
            />
          </div>
        )}
      </main>
    </div>
  );
}
