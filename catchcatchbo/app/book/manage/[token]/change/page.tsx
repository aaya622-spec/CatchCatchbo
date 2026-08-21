import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEETING_TYPES } from "@/lib/constants";
import { getTodayKST } from "@/lib/utils";

export const dynamic =
  "force-dynamic";

interface ChangeBookingPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ChangeBookingPage({
  params,
}: ChangeBookingPageProps) {
  const { token } =
    await params;

  if (!token) {
    notFound();
  }

  const supabase =
    createAdminClient();

  const {
    data: booking,
    error,
  } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_title,
      guest_count,
      meeting_type,
      note,
      status,
      manage_token,
      available_slots (
        date,
        end_date
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
      "Change booking lookup error:",
      error
    );

    notFound();
  }

  // 취소된 예약은 변경 불가
  if (
    booking.status ===
    "canceled"
  ) {
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

  // 이미 처리 대기 중인 요청이 있는지 확인
  const {
    data: existingRequest,
    error: requestError,
  } = await supabase
    .from(
      "booking_change_requests"
    )
    .select("id")
    .eq(
      "booking_id",
      booking.id
    )
    .eq(
      "status",
      "pending"
    )
    .maybeSingle();

  if (requestError) {
    console.error(
      "Existing change request lookup error:",
      requestError
    );
  }

  // 직접 URL 접근으로 중복 요청하는 것도 방지
  if (existingRequest) {
    return (
      <div className="min-h-screen px-5 py-10">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-4">
            ⏳
          </div>

          <h1 className="text-xl font-bold text-warm-gray-800">
            이미 변경 요청을 보냈어요
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            현재 변경 요청을
            확인하고 있어요.
            <br />
            처리 후 다시 변경할 수
            있어요.
          </p>

          <Link
            href={`/book/manage/${token}`}
            className="btn-secondary w-full text-center mt-6"
          >
            내 예약으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const today =
    getTodayKST();

  const startDate =
    slot.date;

  const endDate =
    slot.end_date ||
    slot.date;

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 */}
      <header className="px-5 pt-8 pb-5">
        <Link
          href={`/book/manage/${token}`}
          className="inline-flex items-center gap-2 text-sm text-warm-gray-500"
        >
          <span>←</span>

          <span>
            내 예약으로 돌아가기
          </span>
        </Link>
      </header>

      <main className="px-5">
        <div className="mb-7">
          <div className="text-4xl mb-4">
            🔄
          </div>

          <h1 className="text-2xl font-bold text-warm-gray-800">
            변경 요청
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            변경하고 싶은 내용을
            수정해서 보내주세요.
            <br />
            관리자 확인 후
            반영돼요.
          </p>
        </div>

        <form
          action={`/book/manage/${token}/change/submit`}
          method="POST"
          className="flex flex-col gap-5"
        >
          {/* 약속 이름 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="booking_title"
              className="text-sm font-medium text-warm-gray-700"
            >
              약속 이름
            </label>

            <input
              id="booking_title"
              name="booking_title"
              type="text"
              required
              maxLength={40}
              defaultValue={
                booking.booking_title
              }
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="requested_date"
                className="text-sm font-medium text-warm-gray-700"
              >
                시작 날짜
              </label>

              <input
                id="requested_date"
                name="requested_date"
                type="date"
                required
                min={today}
                defaultValue={
                  startDate
                }
                className="w-full rounded-2xl border border-warm-gray-200 bg-white px-3 py-3.5 text-sm text-warm-gray-700 outline-none focus:border-peach-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="requested_end_date"
                className="text-sm font-medium text-warm-gray-700"
              >
                종료 날짜
              </label>

              <input
                id="requested_end_date"
                name="requested_end_date"
                type="date"
                required
                min={today}
                defaultValue={
                  endDate
                }
                className="w-full rounded-2xl border border-warm-gray-200 bg-white px-3 py-3.5 text-sm text-warm-gray-700 outline-none focus:border-peach-300"
              />
            </div>
          </div>

          <p className="-mt-3 text-xs text-warm-gray-400">
            하루 약속이면 시작 날짜와
            종료 날짜를 같게 선택해주세요.
          </p>

          {/* 인원 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="guest_count"
              className="text-sm font-medium text-warm-gray-700"
            >
              몇 명이 함께 와요?
            </label>

            <select
              id="guest_count"
              name="guest_count"
              required
              defaultValue={String(
                booking.guest_count
              )}
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none focus:border-peach-300"
            >
              <option value="1">
                1명
              </option>

              <option value="2">
                2명
              </option>

              <option value="3">
                3명
              </option>

              <option value="4">
                4명
              </option>
            </select>
          </div>

          {/* 약속 유형 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="meeting_type"
              className="text-sm font-medium text-warm-gray-700"
            >
              어떤 약속이에요?
            </label>

            <select
              id="meeting_type"
              name="meeting_type"
              required
              defaultValue={
                booking.meeting_type
              }
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none focus:border-peach-300"
            >
              {MEETING_TYPES.map(
                (type) => (
                  <option
                    key={
                      type.value
                    }
                    value={
                      type.value
                    }
                  >
                    {
                      type.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* 메모 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="note"
              className="text-sm font-medium text-warm-gray-700"
            >
              메모 (선택)
            </label>

            <textarea
              id="note"
              name="note"
              rows={3}
              defaultValue={
                booking.note ?? ""
              }
              placeholder="변경하고 싶은 내용이나 하고 싶은 말을 적어주세요"
              className="w-full resize-none rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-sm font-semibold text-amber-700">
              아직 변경되는 건 아니에요
            </p>

            <p className="text-xs text-amber-600 mt-1 leading-relaxed">
              요청을 보내면 관리자가
              확인하고 수락한 뒤
              실제 약속에 반영돼요.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
          >
            변경 요청 보내기
          </button>
        </form>
      </main>
    </div>
  );
}
