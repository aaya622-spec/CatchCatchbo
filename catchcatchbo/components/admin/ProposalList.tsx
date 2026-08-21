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
// 날짜 범위
// ============================================================

function formatProposalDateRange(
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
  proposal: DateProposal
) {
  const dateRange =
    formatProposalDateRange(
      proposal.proposed_date,
      proposal.proposed_end_date
    );

  const message = `🎯 캐치캐치보

${proposal.guest_name}아, 제안한 날짜 좋아! 🙌

💬 ${proposal.booking_title}
👥 ${proposal.guest_count}명
📅 ${dateRange}

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
  proposal: DateProposal
) {
  const dateRange =
    formatProposalDateRange(
      proposal.proposed_date,
      proposal.proposed_end_date
    );

  const message = `🎯 캐치캐치보

${proposal.guest_name}아, 제안해준 날짜는 아쉽게도 어려울 것 같아 🥲

💬 ${proposal.booking_title}
📅 ${dateRange}

다른 날짜로 다시 맞춰보자!`;

  await shareMessage(
    "캐치캐치보 날짜 제안 안내",
    message
  );
}

// ============================================================
// 대기 중 제안 카드
// ============================================================

function PendingProposalCard({
  proposal,
}: {
  proposal: DateProposal;
}) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [
    processed,
    setProcessed,
  ] =
    useState<ProcessedState>(
      null
    );

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

        setProcessed({
          type: "accepted",
          proposal:
            result.data.proposal,
        });
      }
    );
  }

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

          <p className="text-xs text-warm-gray-500 mt-1">
            {
              processed.proposal
                .guest_name
            }
            님에게 메시지를
            보내주세요.
          </p>
        </div>

        <div className="bg-cream-100 rounded-xl px-3 py-3">
          <p className="font-semibold text-warm-gray-700">
            {
              processed.proposal
                .booking_title
            }
          </p>

          <p className="text-sm text-warm-gray-500 mt-1">
            {formatProposalDateRange(
              processed.proposal
                .proposed_date,
              processed.proposal
                .proposed_end_date
            )}
          </p>
        </div>

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
              : "w-full rounded-xl bg-red-500 py-3 text-sm font-semibold text-white"
          }
        >
          💬{" "}
          {isAccepted
            ? "수락 메시지 보내기"
            : "거절 메시지 보내기"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.refresh()
          }
          className="text-xs text-warm-gray-400 py-1"
        >
          완료
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <ProposalInfo
        proposal={proposal}
      />

      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}

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
// 공통 제안 정보
// ============================================================

function ProposalInfo({
  proposal,
}: {
  proposal: DateProposal;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-warm-gray-800">
            {
              proposal.guest_name
            }
          </p>

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

      <div className="bg-cream-100 rounded-xl px-3 py-3">
        <p className="font-medium text-warm-gray-700">
          {formatProposalDateRange(
            proposal.proposed_date,
            proposal.proposed_end_date
          )}
        </p>
      </div>

      {proposal.note && (
        <p className="text-sm text-warm-gray-500 italic">
          &ldquo;
          {proposal.note}
          &rdquo;
        </p>
      )}
    </>
  );
}

// ============================================================
// 처리 완료 카드
// ============================================================

function ProcessedProposalCard({
  proposal,
}: {
  proposal: DateProposal;
}) {
  const isRejected =
    proposal.status ===
    "rejected";

  return (
    <div className="card p-4 flex flex-col gap-3 opacity-75">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            isRejected
              ? "bg-red-50 text-red-500"
              : "bg-green-50 text-green-600"
          }`}
        >
          {isRejected
            ? "거절됨"
            : "수락됨"}
        </span>

        <span className="text-xs text-warm-gray-400">
          {formatProposalDateRange(
            proposal.proposed_date,
            proposal.proposed_end_date
          )}
        </span>
      </div>

      <ProposalInfo
        proposal={proposal}
      />

      <button
        type="button"
        onClick={() =>
          isRejected
            ? shareRejectedProposal(
                proposal
              )
            : shareAcceptedProposal(
                proposal
              )
        }
        className="btn-ghost border border-warm-gray-200 w-full text-sm"
      >
        💬{" "}
        {isRejected
          ? "거절 메시지 다시 보내기"
          : "수락 메시지 다시 보내기"}
      </button>
    </div>
  );
}

// ============================================================
// 전체 목록
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

  const accepted =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "accepted"
    );

  const rejected =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "rejected"
    );

  return (
    <div className="flex flex-col gap-7">
      {/* 대기 */}

      <section>
        <h3 className="text-sm font-semibold text-amber-600 mb-3">
          확인 대기 ·{" "}
          {pending.length}건
        </h3>

        {pending.length >
        0 ? (
          <div className="flex flex-col gap-3">
            {pending.map(
              (proposal) => (
                <PendingProposalCard
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
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm text-warm-gray-400">
              새로운 날짜 제안이
              없어요
            </p>
          </div>
        )}
      </section>

      {/* 수락 */}

      {accepted.length >
        0 && (
        <section>
          <h3 className="text-sm font-semibold text-green-600 mb-3">
            수락된 제안 ·{" "}
            {accepted.length}건
          </h3>

          <div className="flex flex-col gap-3">
            {accepted.map(
              (proposal) => (
                <ProcessedProposalCard
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
        </section>
      )}

      {/* 거절 */}

      {rejected.length >
        0 && (
        <section>
          <h3 className="text-sm font-semibold text-red-400 mb-3">
            거절된 제안 ·{" "}
            {rejected.length}건
          </h3>

          <div className="flex flex-col gap-3">
            {rejected.map(
              (proposal) => (
                <ProcessedProposalCard
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
        </section>
      )}
    </div>
  );
}
