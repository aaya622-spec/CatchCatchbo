"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  deleteRejectedProposals,
  deleteCanceledBookings,
} from "@/lib/actions/adminHistory";

import {
  formatKoreanDate,
} from "@/lib/utils";

import type {
  Booking,
  DateProposal,
} from "@/lib/types";

// ============================================================
// Props
// ============================================================

interface HistoryManagerProps {
  rejectedProposals: DateProposal[];
  canceledBookings: Booking[];
}

// ============================================================
// 날짜 범위
// ============================================================

function formatDateRange(
  startDate: string,
  endDate?: string | null
) {
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
// 기록 관리자
// ============================================================

export default function HistoryManager({
  rejectedProposals,
  canceledBookings,
}: HistoryManagerProps) {
  const [
    selectedProposals,
    setSelectedProposals,
  ] = useState<string[]>([]);

  const [
    selectedBookings,
    setSelectedBookings,
  ] = useState<string[]>([]);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  // ============================================================
  // 제안 선택
  // ============================================================

  function toggleProposal(
    id: string
  ) {
    setSelectedProposals(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  function toggleAllProposals() {
    if (
      selectedProposals.length ===
      rejectedProposals.length
    ) {
      setSelectedProposals(
        []
      );

      return;
    }

    setSelectedProposals(
      rejectedProposals.map(
        (proposal) =>
          proposal.id
      )
    );
  }

  // ============================================================
  // 예약 선택
  // ============================================================

  function toggleBooking(
    id: string
  ) {
    setSelectedBookings(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  function toggleAllBookings() {
    if (
      selectedBookings.length ===
      canceledBookings.length
    ) {
      setSelectedBookings(
        []
      );

      return;
    }

    setSelectedBookings(
      canceledBookings.map(
        (booking) =>
          booking.id
      )
    );
  }

  // ============================================================
  // 거절 제안 삭제
  // ============================================================

  function handleDeleteProposals() {
    if (
      selectedProposals.length ===
      0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `선택한 ${selectedProposals.length}개의 거절된 제안을 삭제할까요?\n\n삭제한 기록은 복구할 수 없어요.`
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(
      async () => {
        const result =
          await deleteRejectedProposals(
            selectedProposals
          );

        if (!result.success) {
          setError(
            result.error ??
              "삭제하지 못했어요."
          );

          return;
        }

        setSelectedProposals(
          []
        );
      }
    );
  }

  // ============================================================
  // 취소 예약 삭제
  // ============================================================

  function handleDeleteBookings() {
    if (
      selectedBookings.length ===
      0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `선택한 ${selectedBookings.length}개의 취소된 예약을 삭제할까요?\n\n삭제한 기록은 복구할 수 없어요.`
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(
      async () => {
        const result =
          await deleteCanceledBookings(
            selectedBookings
          );

        if (!result.success) {
          setError(
            result.error ??
              "삭제하지 못했어요."
          );

          return;
        }

        setSelectedBookings(
          []
        );
      }
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ================================================== */}
      {/* 오류 */}
      {/* ================================================== */}

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3">
          <p className="text-sm text-red-500">
            {error}
          </p>
        </div>
      )}

      {/* ================================================== */}
      {/* 거절된 날짜 제안 */}
      {/* ================================================== */}

      <section>
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-warm-gray-700">
              💌 거절된 날짜 제안
            </h3>

            <p className="text-xs text-warm-gray-400 mt-1">
              필요 없는 테스트나
              지난 제안을 정리할 수
              있어요.
            </p>
          </div>

          {rejectedProposals.length >
            0 && (
            <button
              type="button"
              onClick={
                toggleAllProposals
              }
              disabled={
                isPending
              }
              className="shrink-0 text-xs text-warm-gray-400"
            >
              {selectedProposals.length ===
              rejectedProposals.length
                ? "전체 해제"
                : "전체 선택"}
            </button>
          )}
        </div>

        {rejectedProposals.length ===
        0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-warm-gray-400">
              거절된 날짜 제안이
              없어요.
            </p>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden divide-y divide-cream-200">
              {rejectedProposals.map(
                (proposal) => {
                  const selected =
                    selectedProposals.includes(
                      proposal.id
                    );

                  return (
                    <label
                      key={
                        proposal.id
                      }
                      className="flex items-start gap-3 p-4 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        disabled={
                          isPending
                        }
                        onChange={() =>
                          toggleProposal(
                            proposal.id
                          )
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-current"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-warm-gray-700 truncate">
                              {
                                proposal.booking_title
                              }
                            </p>

                            <p className="text-xs text-warm-gray-400 mt-1">
                              {
                                proposal.guest_name
                              }
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500">
                            거절
                          </span>
                        </div>

                        <p className="text-sm text-warm-gray-500 mt-3">
                          {formatDateRange(
                            proposal.proposed_date,
                            proposal.proposed_end_date
                          )}
                        </p>
                      </div>
                    </label>
                  );
                }
              )}
            </div>

            {selectedProposals.length >
              0 && (
              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  handleDeleteProposals
                }
                className="w-full mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-500 disabled:opacity-50"
              >
                {isPending
                  ? "삭제 중..."
                  : `${selectedProposals.length}개 선택 삭제`}
              </button>
            )}
          </>
        )}
      </section>

      {/* ================================================== */}
      {/* 취소된 예약 */}
      {/* ================================================== */}

      <section>
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-warm-gray-700">
              🗑 취소된 예약
            </h3>

            <p className="text-xs text-warm-gray-400 mt-1">
              더 이상 필요하지 않은
              취소 기록을 정리해요.
            </p>
          </div>

          {canceledBookings.length >
            0 && (
            <button
              type="button"
              onClick={
                toggleAllBookings
              }
              disabled={
                isPending
              }
              className="shrink-0 text-xs text-warm-gray-400"
            >
              {selectedBookings.length ===
              canceledBookings.length
                ? "전체 해제"
                : "전체 선택"}
            </button>
          )}
        </div>

        {canceledBookings.length ===
        0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-warm-gray-400">
              취소된 예약이 없어요.
            </p>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden divide-y divide-cream-200">
              {canceledBookings.map(
                (booking) => {
                  const selected =
                    selectedBookings.includes(
                      booking.id
                    );

                  const rawSlot =
                    booking.available_slots;

                  const slot =
                    Array.isArray(
                      rawSlot
                    )
                      ? rawSlot[0]
                      : rawSlot;

                  return (
                    <label
                      key={
                        booking.id
                      }
                      className="flex items-start gap-3 p-4 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        disabled={
                          isPending
                        }
                        onChange={() =>
                          toggleBooking(
                            booking.id
                          )
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-current"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-warm-gray-700 truncate">
                              {
                                booking.booking_title
                              }
                            </p>

                            <p className="text-xs text-warm-gray-400 mt-1">
                              {
                                booking.guest_name
                              }
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500">
                            취소됨
                          </span>
                        </div>

                        {slot && (
                          <p className="text-sm text-warm-gray-500 mt-3">
                            {formatDateRange(
                              slot.date,
                              slot.end_date
                            )}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                }
              )}
            </div>

            {selectedBookings.length >
              0 && (
              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  handleDeleteBookings
                }
                className="w-full mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-500 disabled:opacity-50"
              >
                {isPending
                  ? "삭제 중..."
                  : `${selectedBookings.length}개 선택 삭제`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
