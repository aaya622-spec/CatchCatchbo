import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ManageProposalPageProps {
  params: Promise<{
    token: string;
  }>;
}

// ============================================================
// 날짜 범위 표시
// ============================================================

function formatDateRange(
  startDate: string,
  endDate?: string | null
): string {
  const finalEndDate =
    endDate || startDate;

  if (startDate === finalEndDate) {
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
// 상태
// ============================================================

function getStatusInfo(
  status: string
) {
  switch (status) {
    case "accepted":
      return {
        label: "제안 수락",
        className:
          "bg-green-50 text-green-600",
      };

    case "rejected":
      return {
        label: "제안 거절",
        className:
          "bg-red-50 text-red-500",
      };

    default:
      return {
        label: "제안 확인 중",
        className:
          "bg-amber-50 text-amber-600",
      };
  }
}

// ============================================================
// 페이지
// ============================================================

export default async function ManageProposalPage({
  params,
}: ManageProposalPageProps) {
  const { token } =
    await params;

  if (!token) {
    notFound();
  }

  const supabase =
    createAdminClient();

  const {
    data: proposal,
    error,
  } = await supabase
    .from("date_proposals")
    .select(`
      id,
      manage_token,
      guest_name,
      guest_contact,
      proposed_date,
      proposed_end_date,
      proposed_time,
      proposed_end_time,
      booking_title,
      guest_count,
      meeting_type,
      note,
      status,
      created_at
    `)
    .eq("manage_token", token)
    .single();

  if (
    error ||
    !proposal
  ) {
    console.error(
      "Manage proposal lookup error:",
      error
    );

    notFound();
  }

  const statusInfo =
    getStatusInfo(
      proposal.status
    );

  const dateRange =
    formatDateRange(
      proposal.proposed_date,
      proposal.proposed_end_date
    );

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 */}
      <header className="px-5 pt-8 pb-5">
        <Link
          href="/book/find"
          className="inline-flex items-center gap-2 text-sm text-warm-gray-500"
        >
          <span>←</span>
          <span>다시 검색하기</span>
        </Link>
      </header>

      <main className="px-5">
        {/* 타이틀 */}
        <div className="mb-6">
          <p className="text-3xl mb-3">
            💌
          </p>

          <h1 className="text-2xl font-bold text-warm-gray-800">
            내가 제안한 약속
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2">
            보낸 날짜 제안을 확인할 수
            있어요.
          </p>
        </div>

        {/* 제안 정보 */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-cream-200">
            <div>
              <p className="text-xs text-warm-gray-400 mb-1">
                약속 이름
              </p>

              <h2 className="font-bold text-lg text-warm-gray-800">
                {proposal.booking_title}
              </h2>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>

          <div className="flex flex-col gap-4 pt-4 text-sm">
            {/* 날짜 */}
            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                제안 날짜
              </span>

              <span className="font-medium text-warm-gray-700 text-right">
                {dateRange}
              </span>
            </div>

            {/* 이름 */}
            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                이름
              </span>

              <span className="font-medium text-warm-gray-700">
                {proposal.guest_name}
              </span>
            </div>

            {/* 인원 */}
            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                인원
              </span>

              <span className="font-medium text-warm-gray-700">
                {proposal.guest_count}명
              </span>
            </div>

            {/* 약속 유형 */}
            <div className="flex justify-between gap-4">
              <span className="text-warm-gray-400">
                약속 유형
              </span>

              <span className="font-medium text-warm-gray-700 text-right">
                {getMeetingTypeLabel(
                  proposal.meeting_type
                )}
              </span>
            </div>

            {/* 연락처 */}
            {proposal.guest_contact && (
              <div className="flex justify-between gap-4">
                <span className="text-warm-gray-400">
                  연락처
                </span>

                <span className="font-medium text-warm-gray-700 text-right">
                  {proposal.guest_contact}
                </span>
              </div>
            )}

            {/* 메모 */}
            {proposal.note && (
              <div className="pt-3 border-t border-cream-200">
                <p className="text-warm-gray-400 mb-2">
                  메모
                </p>

                <p className="text-warm-gray-600 leading-relaxed">
                  {proposal.note}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* pending 안내 */}
        {proposal.status ===
          "pending" && (
          <>
            <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-700">
                아직 확인 중이에요
              </p>

              <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                아직 약속이 확정되기
                전이에요. 내용을 바꾸고
                싶다면 변경 요청을 보낼 수
                있어요.
              </p>
            </div>

            {/* 다음 단계에서 연결 */}
            <button
              type="button"
              disabled
              className="btn-primary w-full mt-4 opacity-50 cursor-not-allowed"
            >
              변경 요청하기
            </button>

            <p className="text-xs text-center text-warm-gray-400 mt-2">
              변경 요청 기능을 연결하는
              중이에요.
            </p>
          </>
        )}

        {/* accepted */}
        {proposal.status ===
          "accepted" && (
          <div className="mt-5 rounded-2xl bg-green-50 px-4 py-4">
            <p className="text-sm font-semibold text-green-700">
              이 제안은 수락됐어요 🎉
            </p>

            <p className="text-xs text-green-600 mt-1 leading-relaxed">
              확정된 약속은 내 예약
              검색에서 확인할 수 있어요.
            </p>
          </div>
        )}

        {/* rejected */}
        {proposal.status ===
          "rejected" && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-4">
            <p className="text-sm font-semibold text-red-600">
              이 제안은 거절됐어요
            </p>

            <p className="text-xs text-red-500 mt-1 leading-relaxed">
              다른 날짜가 괜찮다면 새로운
              날짜를 다시 제안해주세요.
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
