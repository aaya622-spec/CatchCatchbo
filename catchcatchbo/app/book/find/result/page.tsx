import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
  getLocationLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

interface FindBookingResultPageProps {
  searchParams: Promise<{
    name?: string;
    contact?: string;
  }>;
}

function normalizeContact(
  value: string
): string {
  return value.replace(
    /[^0-9]/g,
    ""
  );
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

export default async function FindBookingResultPage({
  searchParams,
}: FindBookingResultPageProps) {
  const params =
    await searchParams;

  const name =
    params.name?.trim() ?? "";

  const contact =
    normalizeContact(
      params.contact ?? ""
    );

  // 잘못된 직접 접근 방지
  if (
    !name ||
    !contact
  ) {
    return (
      <div className="min-h-screen px-5 py-10">
        <div className="card p-6 text-center">
          <p className="text-4xl mb-4">
            🔎
          </p>

          <h1 className="text-xl font-bold text-warm-gray-800">
            예약 정보를 입력해주세요
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2">
            이름과 연락처가 모두
            필요해요.
          </p>

          <Link
            href="/book/find"
            className="btn-secondary w-full text-center mt-6"
          >
            다시 입력하기
          </Link>
        </div>
      </div>
    );
  }

  const supabase =
    createAdminClient();

  const {
    data: bookings,
    error,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      manage_token,
      guest_name,
      booking_title,
      guest_count,
      meeting_type,
      status,
      created_at,
      available_slots (
        date,
        end_date,
        title,
        location_text
      )
    `)
    .eq(
      "guest_name",
      name
    )
    .eq(
      "guest_contact",
      contact
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Find booking error:",
      error
    );

    return (
      <div className="min-h-screen px-5 py-10">
        <div className="card p-6 text-center">
          <p className="text-4xl mb-4">
            😢
          </p>

          <h1 className="text-xl font-bold text-warm-gray-800">
            예약을 불러오지 못했어요
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2">
            잠시 후 다시
            시도해주세요.
          </p>

          <Link
            href="/book/find"
            className="btn-secondary w-full text-center mt-6"
          >
            다시 시도하기
          </Link>
        </div>
      </div>
    );
  }

  const results =
    bookings ?? [];

  return (
    <div className="min-h-screen pb-20">
      <header className="px-5 pt-8 pb-5">
        <Link
          href="/book/find"
          className="inline-flex items-center gap-2 text-sm text-warm-gray-500"
        >
          <span>←</span>
          <span>
            다시 검색하기
          </span>
        </Link>
      </header>

      <main className="px-5">
        <div className="mb-6">
          <div className="text-4xl mb-4">
            🗓️
          </div>

          <h1 className="text-2xl font-bold text-warm-gray-800">
            내 예약
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2">
            {name}님이 신청한
            약속이에요.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="card p-7 text-center">
            <p className="text-4xl mb-4">
              🤔
            </p>

            <p className="font-semibold text-warm-gray-700">
              일치하는 예약이 없어요
            </p>

            <p className="text-sm text-warm-gray-400 mt-2 leading-relaxed">
              예약할 때 입력한 이름과
              연락처가 맞는지
              확인해주세요.
            </p>

            <Link
              href="/book/find"
              className="btn-secondary w-full text-center mt-6"
            >
              다시 입력하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map(
              (booking) => {
                const rawSlot =
                  booking.available_slots;

                const slot =
                  Array.isArray(
                    rawSlot
                  )
                    ? rawSlot[0]
                    : rawSlot;

                const status =
                  getStatusInfo(
                    booking.status
                  );

                return (
                  <div
                    key={
                      booking.id
                    }
                    className="card p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-warm-gray-400 mb-1">
                          약속 이름
                        </p>

                        <h2 className="font-bold text-warm-gray-800">
                          {
                            booking.booking_title
                          }
                        </h2>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        {
                          status.label
                        }
                      </span>
                    </div>

                    {slot && (
                      <div className="mt-4 pt-4 border-t border-cream-200 flex flex-col gap-2">
                        <p className="text-sm text-warm-gray-600">
                          📅{" "}
                          {formatDateRange(
                            slot.date,
                            slot.end_date
                          )}
                        </p>

                        <p className="text-sm text-warm-gray-500">
                          📍{" "}
                          {getLocationLabel(
                            slot.location_text
                          )}
                        </p>

                        <p className="text-sm text-warm-gray-500">
                          💬{" "}
                          {getMeetingTypeLabel(
                            booking.meeting_type
                          )}
                        </p>

                        <p className="text-sm text-warm-gray-500">
                          👥{" "}
                          {
                            booking.guest_count
                          }
                          명
                        </p>
                      </div>
                    )}

                    {booking.manage_token && (
                      <Link
                        href={`/book/manage/${booking.manage_token}`}
                        className="btn-primary w-full text-center mt-5"
                      >
                        확인 / 변경하기
                      </Link>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        <Link
          href="/book"
          className="btn-ghost w-full text-center mt-6"
        >
          예약 페이지로 돌아가기
        </Link>
      </main>
    </div>
  );
}
