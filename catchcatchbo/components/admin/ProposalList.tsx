"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  acceptProposal,
  rejectProposal,
} from "@/lib/actions/proposals";
import {
  formatKoreanDate,
  formatTimeRange,
  getMeetingTypeLabel,
} from "@/lib/utils";
import type {
  DateProposal,
} from "@/lib/types";

interface ProposalListProps {
  proposals: DateProposal[];
}

type ProcessedState =
  | {
      type: "accepted";
      proposal: DateProposal;
    }
  | {
      type: "rejected";
      proposal: DateProposal;
    }
  | null;

// ============================================================
// 개별 날짜 제안 카드
// ============================================================

function ProposalCard({
  proposal,
}: {
  proposal: DateProposal;
}) {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(null);

  const [
    processed,
    setProcessed,
  ] = useState<ProcessedState>(
    null
  );

  // ============================================================
  // 공유
  // ============================================================

  async function shareMessage(
    title: string,
    message: string
  ) {
    const bookUrl =
      `${window.location.origin}/book`;

    const fullMessage =
      `${message}\n\n${bookUrl}`;

    /*
     * 반드시 실제 버튼 클릭 이벤트에서
     * navigator.share를 바로 실행합니다.
     */
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
          url: bookUrl,
        });

        return;
      } catch (shareError) {
        if (
          shareError instanceof
            DOMException &&
          shareError.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Proposal share error:",
          shareError
        );
      }
    }

    /*
     * 공유 API가 지원되지 않거나 실패하면
     * 클립보드에 복사
     */
    try {
      await navigator.clipboard.writeText(
        fullMessage
      );

      alert(
        "메시지를 복사했어요. 카카오톡에 붙여넣어 주세요."
      );
    } catch (
      clipboardError
    ) {
      console.error(
        "Proposal clipboard error:",
        clipboardError
      );

      alert(
        "공유창을 열지 못했어요. 다시 시도해주세요."
      );
    }
  }

  // ============================================================
  // 수락 메시지
  // ============================================================

  async function shareAcceptedProposal(
    accepted: DateProposal
  ) {
    const timeText =
      accepted.proposed_time &&
      accepted.proposed_end_time
        ? formatTimeRange(
            accepted.proposed_time,
            accepted.proposed_end_time
          )
        : accepted.proposed_time
          ? accepted.proposed_time.slice(
              0,
              5
            )
          : "시간은 같이 정해보자!";

    const message = `🎯 캐치캐치보

${accepted.guest_name}아, 제안한 날짜 좋아! 🙌

💬 ${accepted.booking_title}
👥 ${accepted.guest_count}명
📅 ${formatKoreanDate(
      accepted.proposed_date
    )}
🕐 ${timeText}

이날 보자!`;

    await shareMessage(
      "캐치캐치보 날짜 제안 수락",
      message
    );
  }

  // ============================================================
  // 거절 메시지
  // ============================================================

  async function shareRejectedProposal(
    rejected: DateProposal
  ) {
    const timeText =
      rejected.proposed_time &&
      rejected.proposed_end_time
        ? formatTimeRange(
            rejected.proposed_time,
            rejected.proposed_end_time
          )
        : rejected.proposed_time
          ? rejected.proposed_time.slice(
              0,
              5
            )
          : "시간 미정";

    const message = `🎯 캐치캐치보

${rejected.guest_name}아, 제안해준 날짜는 아쉽게도 어려울 것 같아 🥲

💬 ${rejected.booking_title}
📅 ${formatKoreanDate(
      rejected.proposed_date
    )}
🕐 ${timeText}

다른 날짜로 다시 맞춰보자!`;

    await shareMessage(
      "캐치캐치보 날짜 제안 안내",
      message
    );
  }

  // ============================================================
  // 제안 수락
  // ============================================================

  function handleAccept() {
    setError(null);

    startTransition(
      async () => {
        const result =
          await acceptProposal(
            proposal.id
          );

        if (
          !result.success ||
          !result.data
        ) {
          setError(
            result.error ??
              "수락 중 오류가 발생했어요."
          );

          return;
        }

        /*
         * 서버 처리 후 자동 공유하지 않음.
         * 완료 화면에서 사용자가 직접
         * 공유 버튼을 누르게 합니다.
         */
        setProcessed({
          type: "accepted",
          proposal:
            result.data.proposal,
        });
      }
    );
  }

  // ============================================================
  // 제안 거절
  // ============================================================

  function handleReject() {
    setError(null);

    startTransition(
      async () => {
        const result =
          await rejectProposal(
            proposal.id
          );

        if (
          !result.success ||
          !result.data
        ) {
          setError(
            result.error ??
              "거절 중 오류가 발생했어요."
          );

          return;
        }

        setProcessed({
          type: "rejected",
          proposal:
            result.data.proposal,
        });
      }
    );
  }

  // ============================================================
  // 수락/거절 완료 화면
  // ============================================================

  if (processed) {
    const isAccepted =
      processed.type ===
      "accepted";

    return (
      <div
        className={`card p-4 flex flex-col gap-3 ${
          isAccepted
            ? "border border-green-100"
            : "border border-red-100"
        }`}
      >
        <div
          className={`rounded-xl p-4 ${
            isAccepted
              ? "bg-green-50"
              : "bg-red-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              isAccepted
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {isAccepted
              ? "날짜 제안을 수락했어요! 🎉"
              : "날짜 제안을 거절했어요."}
          </p>

          <p
            className={`mt-1 text-xs ${
              isAccepted
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {processed.proposal.guest_name}
            님에게 메시지를
            보내주세요.
          </p>
        </div>

        {/* 제안 정보 */}
        <div className="bg-cream-100 rounded-xl px-3 py-3">
          <p className="font-semibold text-warm-gray-700">
            {
              processed.proposal
                .booking_title
            }
          </p>

          <p className="text-sm text-warm-gray-500 mt-1">
            {formatKoreanDate(
              processed.proposal
                .proposed_date
            )}
          </p>

          <p className="text-xs text-warm-gray-400 mt-1">
            🕐{" "}
            {processed.proposal
              .proposed_time &&
            processed.proposal
              .proposed_end_time
              ? formatTimeRange(
                  processed.proposal
                    .proposed_time,
                  processed.proposal
                    .proposed_end_time
                )
              : processed.proposal
                    .proposed_time
                ? processed.proposal
                    .proposed_time
                    .slice(0, 5)
                : "시간 미정"}
          </p>
        </div>

        {/* 공유 버튼 */}
        <button
          type="button"
          onClick={() =>
            isAccepted
              ? shareAcceptedProposal(
                  processed.proposal
                )
              : shareRejectedProposal(
                  processed.proposal
                )
          }
          className={
            isAccepted
              ? "btn-primary w-full"
              : "w-full rounded-xl bg-red-500 py-3 text-sm font-semibold text-white active:scale-[0.99] transition-all"
          }
        >
          💬{" "}
          {isAccepted
            ? "수락 메시지 보내기"
            : "거절 메시지 보내기"}
        </button>

        {/* 관리자 화면 갱신 */}
        <button
          type="button"
          onClick={() => {
            router.refresh();
          }}
          className="text-xs text-warm-gray-400 py-1"
        >
          완료
        </button>
      </div>
    );
  }

  // ============================================================
  // 기존 pending 카드
  // ============================================================

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* 신청자 */}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-warm-gray-800">
              {
                proposal.guest_name
              }
            </p>

            <span className="rounded-full bg-amber-50 text-amber-600 px-2.5 py-1 text-xs font-medium">
              날짜 제안
            </span>
          </div>

          {proposal.guest_contact && (
            <p className="text-sm text-warm-gray-400 mt-1">
              📱{" "}
              {
                proposal.guest_contact
              }
            </p>
          )}
        </div>

        <span className="text-xs rounded-full bg-cream-100 px-2.5 py-1 text-warm-gray-500">
          {getMeetingTypeLabel(
            proposal.meeting_type
          )}
        </span>
      </div>

      {/* 약속 */}

      <div>
        <p className="text-xs text-warm-gray-400 mb-1">
          제안한 약속
        </p>

        <p className="font-semibold text-warm-gray-800">
          {
            proposal.booking_title
          }
        </p>

        <p className="text-sm text-warm-gray-500 mt-1">
          👥{" "}
          {
            proposal.guest_count
          }
          명
        </p>
      </div>

      {/* 날짜 / 시간 */}

      <div className="bg-cream-100 rounded-xl px-3 py-3">
        <p className="font-medium text-warm-gray-700">
          {formatKoreanDate(
            proposal.proposed_date
          )}
        </p>

        <p className="text-sm text-warm-gray-400 mt-1">
          🕐{" "}
          {proposal.proposed_time &&
          proposal.proposed_end_time
            ? formatTimeRange(
                proposal.proposed_time,
                proposal.proposed_end_time
              )
            : proposal.proposed_time
              ? proposal.proposed_time.slice(
                  0,
                  5
                )
              : "시간 협의"}
        </p>
      </div>

      {/* 메모 */}

      {proposal.note && (
        <p className="text-sm text-warm-gray-500 italic">
          &ldquo;
          {proposal.note}
          &rdquo;
        </p>
      )}

      {/* 오류 */}

      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}

      {/* 버튼 */}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={
            handleReject
          }
          disabled={
            isPending
          }
          className="btn-ghost border border-warm-gray-200"
        >
          {isPending
            ? "처리 중…"
            : "거절"}
        </button>

        <button
          type="button"
          onClick={
            handleAccept
          }
          disabled={
            isPending
          }
          className="btn-primary"
        >
          {isPending
            ? "처리 중…"
            : "제안 수락"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 목록
// ============================================================

export default function ProposalList({
  proposals,
}: ProposalListProps) {
  const pending =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "pending"
    );

  if (
    pending.length === 0
  ) {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl mb-2">
          💌
        </p>

        <p className="text-sm text-warm-gray-400">
          새로운 날짜 제안이
          없어요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.map(
        (proposal) => (
          <ProposalCard
            key={
              proposal.id
            }
            proposal={
              proposal
            }
          />
        )
      )}
    </div>
  );
}
