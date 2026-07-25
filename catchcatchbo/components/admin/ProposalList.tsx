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

  async function shareMessage(
    title: string,
    message: string
  ) {
    const bookUrl =
      `${window.location.origin}/book`;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: message,
          url: bookUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        `${message}\n\n${bookUrl}`
      );

      alert(
        "메시지를 복사했어요. 카카오톡에 붙여넣어 주세요."
      );
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name ===
          "AbortError"
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          `${message}\n\n${bookUrl}`
        );

        alert(
          "공유창을 열지 못해 메시지를 복사했어요."
        );
      } catch {
        alert(
          "공유창을 열지 못했어요."
        );
      }
    }
  }

  function handleAccept() {
    setError(null);

    startTransition(async () => {
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

      const accepted =
        result.data.proposal;

      const message = `🎯 캐치캐치보

${accepted.guest_name}아, 제안한 날짜 좋아! 🙌

💬 ${accepted.booking_title}
👥 ${accepted.guest_count}명
📅 ${formatKoreanDate(
        accepted.proposed_date
      )}
🕐 ${
        accepted.proposed_time ||
        "시간은 같이 정해보자!"
      }

이날 보자!`;

      await shareMessage(
        "캐치캐치보 날짜 제안 수락",
        message
      );

      router.refresh();
    });
  }

  function handleReject() {
    setError(null);

    startTransition(async () => {
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

      const rejected =
        result.data.proposal;

      const message = `🎯 캐치캐치보

${rejected.guest_name}아, 제안해준 날짜는 아쉽게도 어려울 것 같아 🥲

💬 ${rejected.booking_title}
📅 ${formatKoreanDate(
        rejected.proposed_date
      )}
🕐 ${
        rejected.proposed_time ||
        "시간 미정"
      }

다른 날짜로 다시 맞춰보자!`;

      await shareMessage(
        "캐치캐치보 날짜 제안 안내",
        message
      );

      router.refresh();
    });
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-warm-gray-800">
              {proposal.guest_name}
            </p>

            <span className="rounded-full bg-amber-50 text-amber-600 px-2.5 py-1 text-xs font-medium">
              날짜 제안
            </span>
          </div>

          {proposal.guest_contact && (
            <p className="text-sm text-warm-gray-400 mt-1">
              📱{" "}
              {proposal.guest_contact}
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
          {proposal.booking_title}
        </p>

        <p className="text-sm text-warm-gray-500 mt-1">
          👥 {proposal.guest_count}명
        </p>
      </div>

      <div className="bg-cream-100 rounded-xl px-3 py-3">
        <p className="font-medium text-warm-gray-700">
          {formatKoreanDate(
            proposal.proposed_date
          )}
        </p>

        <p className="text-sm text-warm-gray-400 mt-1">
          🕐{" "}
          {proposal.proposed_time
            ? proposal.proposed_time
            : "시간 협의"}
        </p>
      </div>

      {proposal.note && (
        <p className="text-sm text-warm-gray-500 italic">
          &ldquo;{proposal.note}&rdquo;
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="btn-ghost border border-warm-gray-200"
        >
          거절
        </button>

        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
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

export default function ProposalList({
  proposals,
}: ProposalListProps) {
  const pending =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "pending"
    );

  if (pending.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl mb-2">
          💌
        </p>

        <p className="text-sm text-warm-gray-400">
          새로운 날짜 제안이 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.map(
        (proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
          />
        )
      )}
    </div>
  );
}
