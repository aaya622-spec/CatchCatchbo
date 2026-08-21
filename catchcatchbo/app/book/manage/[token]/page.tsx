import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";

export const dynamic =
  "force-dynamic";

interface ManageBookingPageProps {
  params: Promise<{
    token: string;
  }>;
}

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

function getStatusInfo(
  status: string
) {
  switch (status) {
    case "confirmed":
      return {
        label: "약속 확정",
        className:
          "bg-green-50 text-green-600",
      };

    case "canceled":
      return {
        label: "취소됨",
        className:
          "bg-red-50 text-red-500",
      };

    default:
      return {
        label: "확정 대기",
        className:
          "bg-amber-50 text-amber-600",
      };
  }
}

export default async function ManageBookingPage({
  params,
}: ManageBookingPageProps) {
  const { token } =
    await params;

  if (!token) {
    notFound();
  }

  const supabase =
    createAdminClient();

  // ============================================================
  // 예약 조회
  // ============================================================

  const {
    data: booking,
    error,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      guest_name,
      guest_contact,
      booking_title,
      guest_count,
      meeting_type,
      note,
      status,
      created_at,
      canceled_at,
      manage_token,
      available_slots (
        date,
        end_date,
        title,
        location_text,
        meeting_type
      )
    `)
    .eq(
      "manage_token",
      token
    )
    .single();

  if (
    error ||
    !booking
  ) {
    console.error(
      "Manage booking lookup error:",
      error
    );

    notFound();
  }

  const rawSlot =
    booking.available_slots;

  const slot =
    Array.isArray(rawSlot)
      ? rawSlot[0]
      : rawSlot;

  if (!slot) {
    notFound();
  }

  // ============================================================
  // 현재 처리 중인 변경 요청 확인
  // ============================================================

  const {
    data: pendingChangeRequest,
    error: changeRequestError,
  } = await supabase
    .from(
      "booking_change_requests"
    )
    .select(`
      id,
      requested_booking_title,
      requested_guest_count,
      requested_meeting_type,
      requested_note,
      requested_date,
      requested_end_date,
      status,
      created_at
    `)
    .eq(
      "booking_id",
      booking.id
    )
    .eq(
      "status",
      "pending"
    )
    .maybeSingle();

  if (
    changeRequestError
  ) {
    console.error(
      "Manage booking change request lookup error:",
      changeRequestError
    );
  }

  const statusInfo =
    getStatusInfo(
      booking.status
    );

  const dateRange =
    formatDateRange(
      slot.date,
      slot.end_date
    );

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 */}
      <header className="px-5 pt-8 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            🎯
          </span>

          <span className="font-bold text-warm-gray-800">
            캐치캐치보
          </span>
        </div>
      </header>

      <main className="px-5">
        <div className="mb-6">
          <p className="text-3xl mb-3">
            🗓️
          </p>

          <h1 className="text-2xl font-bold text-warm-gray-800">
            내 예약
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2">
            신청한 약속을 확인할 수
            있어요.
          </p>
        </div>

        {/* ================================================== */}
        {/* 예약 정보 */}
        {/* ================================================== */}

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-cream-200">
            <div>
              <p className="text-xs text-warm-gray-400 mb-1">
                약속 이름
              </p>

              <h2 className="font-bold text-lg text-warm-gray-800">
                {
                  booking.booking_title
                }
              </h2>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}
            >
              {
                statusInfo.label
              }
            </span>
          </div>

          <div className="flex flex-col gap-4 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                날짜
              </span>

              <span className="font-medium text-warm-gray-700 text-right">
                {dateRange}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                이름
              </span>

              <span className="font-medium text-warm-gray-700">
                {
                  booking.guest_name
                }
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                인원
              </span>

              <span className="font-medium text-warm-gray-700">
                {
                  booking.guest_count
                }
                명
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                약속 유형
              </span>

              <span className="font-medium text-warm-gray-700">
                {getMeetingTypeLabel(
                  booking.meeting_type
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                장소
              </span>

              <span className="font-medium text-warm-gray-700 text-right">
                {getLocationLabel(
                  slot.location_text
                )}
              </span>
            </div>

            {booking.guest_contact && (
              <div className="flex justify-between gap-4">
                <span className="text-warm-gray-400">
                  연락처
                </span>

                <span className="font-medium text-warm-gray-700 text-right">
                  {
                    booking.guest_contact
                  }
                </span>
              </div>
            )}

            {booking.note && (
              <div className="pt-3 border-t border-cream-200">
                <p className="text-warm-gray-400 mb-2">
                  메모
                </p>

                <p className="text-warm-gray-600 leading-relaxed">
                  {
                    booking.note
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* 처리 중인 변경 요청 */}
        {/* ================================================== */}

        {pendingChangeRequest && (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  변경 요청을 확인하고 있어요
                </p>

                <p className="text-xs text-amber-600 mt-1">
                  관리자가 확인 후
                  알려드릴게요.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-600">
                확인 중
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-100 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-amber-600">
                  요청 날짜
                </span>

                <span className="font-medium text-warm-gray-700 text-right">
                  {formatDateRange(
                    pendingChangeRequest
                      .requested_date,
                    pendingChangeRequest
                      .requested_end_date
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-amber-600">
                  약속 이름
                </span>

                <span className="font-medium text-warm-gray-700 text-right">
                  {
                    pendingChangeRequest
                      .requested_booking_title
                  }
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-amber-600">
                  인원
                </span>

                <span className="font-medium text-warm-gray-700">
                  {
                    pendingChangeRequest
                      .requested_guest_count
                  }
                  명
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* 변경 요청 */}
        {/* ================================================== */}

        {booking.status !==
          "canceled" &&
          !pendingChangeRequest && (
            <div className="mt-5">
              <Link
                href={`/book/manage/${token}/change`}
                className="btn-primary w-full text-center"
              >
                변경 요청하기
              </Link>

              <p className="text-xs text-center text-warm-gray-400 mt-2 leading-relaxed">
                날짜나 약속 내용을
                변경하고 싶다면 요청을
                보내주세요.
                <br />
                관리자 확인 후 반영돼요.
              </p>
            </div>
          )}

        {/* 취소된 예약 */}
        {booking.status ===
          "canceled" && (
          <div className="mt-5 rounded-2xl bg-warm-gray-100 px-4 py-4 text-center">
            <p className="text-sm text-warm-gray-500">
              취소된 예약은 변경할 수
              없어요.
            </p>
          </div>
        )}

        <Link
          href="/book"
          className="btn-secondary w-full text-center mt-5"
        >
          예약 페이지로 돌아가기
        </Link>
      </main>
    </div>
  );
}
