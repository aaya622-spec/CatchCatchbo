"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  acceptProposalChangeRequest,
  rejectProposalChangeRequest,
} from "@/lib/actions/proposalChanges";

import {
  formatKoreanDate,
  getMeetingTypeLabel,
} from "@/lib/utils";

// ============================================================
// 타입
// ============================================================

interface ProposalChangeRequest {
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
}

interface Props {
  requests:
    ProposalChangeRequest[];
}

// ============================================================
// 날짜 표시
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
// 컴포넌트
// ============================================================

export default function ProposalChangeRequestList({
  requests,
}: Props) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  // ============================================================
  // 수락
  // ============================================================

  function handleAccept(
    requestId: string
  ) {
    const confirmed =
      window.confirm(
        "이 변경 요청을 수락할까요?"
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setProcessingId(
      requestId
    );

    startTransition(
      async () => {
        const result =
          await acceptProposalChangeRequest(
            requestId
          );

        if (!result.success) {
          setError(
            result.error ??
              "변경 요청을 수락하지 못했어요."
          );
        }

        setProcessingId(
          null
        );
      }
    );
  }

  // ============================================================
  // 거절
  // ============================================================

  function handleReject(
    requestId: string
  ) {
    const confirmed =
      window.confirm(
        "이 변경 요청을 거절할까요?"
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setProcessingId(
      requestId
    );

    startTransition(
      async () => {
        const result =
          await rejectProposalChangeRequest(
            requestId
          );

        if (!result.success) {
          setError(
            result.error ??
              "변경 요청을 거절하지 못했어요."
          );
        }

        setProcessingId(
          null
        );
      }
    );
  }

  // ============================================================
  // 없음
  // ============================================================

  if (
    requests.length === 0
  ) {
    return null;
  }

  // ============================================================
  // 화면
  // ============================================================

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {requests.map(
        (request) => {
          const rawProposal =
            request.date_proposals;

          const proposal =
            Array.isArray(
              rawProposal
            )
              ? rawProposal[0]
              : rawProposal;

          if (!proposal) {
            return null;
          }

          const processing =
            isPending &&
            processingId ===
              request.id;

          return (
            <div
              key={request.id}
              className="card p-5"
            >
              {/* ========================================== */}
              {/* 헤더 */}
              {/* ========================================== */}

              <div className="flex items-start justify-between gap-3 pb-4 border-b border-cream-200">
                <div>
                  <p className="text-xs text-warm-gray-400 mb-1">
                    {
                      proposal.guest_name
                    }
                    님의 변경 요청
                  </p>

                  <h3 className="font-bold text-warm-gray-800">
                    {
                      request.booking_title
                    }
                  </h3>
                </div>

                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                  변경 요청
                </span>
              </div>

              {/* ========================================== */}
              {/* 기존 */}
              {/* ========================================== */}

              <div className="mt-4 rounded-2xl bg-cream-100 px-4 py-4">
                <p className="text-xs font-semibold text-warm-gray-500 mb-3">
                  기존 제안
                </p>

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      약속
                    </span>

                    <span className="text-warm-gray-600 text-right">
                      {
                        proposal.booking_title
                      }
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      날짜
                    </span>

                    <span className="text-warm-gray-600 text-right">
                      {formatDateRange(
                        proposal.proposed_date,
                        proposal.proposed_end_date
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      인원
                    </span>

                    <span className="text-warm-gray-600">
                      {
                        proposal.guest_count
                      }
                      명
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      유형
                    </span>

                    <span className="text-warm-gray-600">
                      {getMeetingTypeLabel(
                        proposal.meeting_type
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================== */}
              {/* 변경 */}
              {/* ========================================== */}

              <div className="mt-3 rounded-2xl border border-peach-200 bg-peach-50 px-4 py-4">
                <p className="text-xs font-semibold text-peach-500 mb-3">
                  변경 요청
                </p>

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      약속
                    </span>

                    <span className="font-medium text-warm-gray-700 text-right">
                      {
                        request.booking_title
                      }
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      날짜
                    </span>

                    <span className="font-medium text-warm-gray-700 text-right">
                      {formatDateRange(
                        request.proposed_date,
                        request.proposed_end_date
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      인원
                    </span>

                    <span className="font-medium text-warm-gray-700">
                      {
                        request.guest_count
                      }
                      명
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-warm-gray-400">
                      유형
                    </span>

                    <span className="font-medium text-warm-gray-700">
                      {getMeetingTypeLabel(
                        request.meeting_type
                      )}
                    </span>
                  </div>

                  {request.note && (
                    <div className="pt-3 mt-1 border-t border-peach-100">
                      <p className="text-warm-gray-400 mb-1">
                        메모
                      </p>

                      <p className="text-warm-gray-600 leading-relaxed">
                        {
                          request.note
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================== */}
              {/* 버튼 */}
              {/* ========================================== */}

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={() =>
                    handleReject(
                      request.id
                    )
                  }
                  className="btn-secondary w-full disabled:opacity-50"
                >
                  {processing
                    ? "처리 중..."
                    : "거절"}
                </button>

                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={() =>
                    handleAccept(
                      request.id
                    )
                  }
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {processing
                    ? "처리 중..."
                    : "변경 수락"}
                </button>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
