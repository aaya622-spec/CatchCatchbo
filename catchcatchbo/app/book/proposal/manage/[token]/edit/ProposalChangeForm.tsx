"use client";

import {
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  MEETING_TYPES,
} from "@/lib/constants";
import {
  createProposalChangeRequest,
} from "@/lib/actions/proposalChanges";

interface ProposalData {
  booking_title: string;
  proposed_date: string;
  proposed_end_date: string;
  guest_count: number;
  meeting_type: string;
  note: string;
}

interface ProposalChangeFormProps {
  token: string;
  proposal: ProposalData;
}

export default function ProposalChangeForm({
  token,
  proposal,
}: ProposalChangeFormProps) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const [
    selectedMeetingType,
    setSelectedMeetingType,
  ] = useState(
    proposal.meeting_type
  );

  // ============================================================
  // 변경 요청 전송
  // ============================================================

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    const formData =
      new FormData(
        event.currentTarget
      );

    startTransition(
      async () => {
        const result =
          await createProposalChangeRequest(
            token,
            formData
          );

        if (result.success) {
          setCompleted(true);
          return;
        }

        setError(
          result.error ??
            "변경 요청 중 오류가 발생했어요."
        );
      }
    );
  }

  // ============================================================
  // 완료 화면
  // ============================================================

  if (completed) {
    return (
      <div className="min-h-screen px-5 py-10">
        <div className="card p-7 text-center">
          <div className="text-5xl mb-5">
            🙌
          </div>

          <h1 className="text-xl font-bold text-warm-gray-800">
            변경 요청을 보냈어요!
          </h1>

          <p className="text-sm text-warm-gray-500 mt-3 leading-relaxed">
            관리자가 내용을 확인한 뒤
            수락하거나 거절할 거예요.
          </p>

          <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-left">
            <p className="text-sm font-semibold text-amber-700">
              아직 변경된 건 아니에요
            </p>

            <p className="text-xs text-amber-600 mt-1 leading-relaxed">
              관리자가 변경 요청을
              수락하면 제안 내용에
              반영돼요.
            </p>
          </div>

          <Link
            href={`/book/proposal/manage/${token}`}
            className="btn-primary w-full text-center mt-6"
          >
            내 제안 확인하기
          </Link>

          <Link
            href="/book"
            className="btn-ghost w-full text-center mt-3"
          >
            예약 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 변경 폼
  // ============================================================

  return (
    <div className="min-h-screen pb-20">
      <header className="px-5 pt-8 pb-5">
        <Link
          href={`/book/proposal/manage/${token}`}
          className="inline-flex items-center gap-2 text-sm text-warm-gray-500"
        >
          <span>←</span>

          <span>
            제안으로 돌아가기
          </span>
        </Link>
      </header>

      <main className="px-5">
        <div className="mb-7">
          <div className="text-4xl mb-4">
            ✏️
          </div>

          <h1 className="text-2xl font-bold text-warm-gray-800">
            약속 변경 요청
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            바꾸고 싶은 내용을
            수정해주세요.
            <br />
            관리자 확인 후 변경돼요.
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="flex flex-col gap-5"
        >
          {/* ================================================ */}
          {/* 약속 이름 */}
          {/* ================================================ */}

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
                proposal.booking_title
              }
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          {/* ================================================ */}
          {/* 시작일 */}
          {/* ================================================ */}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="proposed_date"
              className="text-sm font-medium text-warm-gray-700"
            >
              시작일
            </label>

            <input
              id="proposed_date"
              name="proposed_date"
              type="date"
              required
              defaultValue={
                proposal.proposed_date
              }
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          {/* ================================================ */}
          {/* 종료일 */}
          {/* ================================================ */}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="proposed_end_date"
              className="text-sm font-medium text-warm-gray-700"
            >
              종료일
            </label>

            <input
              id="proposed_end_date"
              name="proposed_end_date"
              type="date"
              required
              defaultValue={
                proposal.proposed_end_date
              }
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          {/* ================================================ */}
          {/* 인원 */}
          {/* ================================================ */}

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
                proposal.guest_count
              )}
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
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

          {/* ================================================ */}
          {/* 약속 유형 */}
          {/* ================================================ */}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-warm-gray-700">
              어떤 약속이에요?
            </label>

            <div className="grid grid-cols-3 gap-2">
              {MEETING_TYPES.map(
                (type) => (
                  <label
                    key={
                      type.value
                    }
                    className="relative cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="meeting_type"
                      value={
                        type.value
                      }
                      checked={
                        selectedMeetingType ===
                        type.value
                      }
                      onChange={() =>
                        setSelectedMeetingType(
                          type.value
                        )
                      }
                      className="sr-only"
                      required
                    />

                    <div
                      className={`flex items-center justify-center py-2.5 rounded-xl border text-sm transition-all ${
                        selectedMeetingType ===
                        type.value
                          ? "border-peach-300 bg-peach-100 text-peach-500"
                          : "border-warm-gray-200 bg-white text-warm-gray-600"
                      }`}
                    >
                      {
                        type.label
                      }
                    </div>
                  </label>
                )
              )}
            </div>
          </div>

          {/* ================================================ */}
          {/* 메모 */}
          {/* ================================================ */}

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
                proposal.note
              }
              placeholder="하고 싶은 말이 있으면 적어줘요"
              className="w-full resize-none rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          {/* ================================================ */}
          {/* 안내 */}
          {/* ================================================ */}

          <div className="rounded-2xl bg-cream-100 px-4 py-4">
            <p className="text-sm font-semibold text-warm-gray-700">
              변경 요청은 바로 반영되지 않아요
            </p>

            <p className="text-xs text-warm-gray-400 mt-1 leading-relaxed">
              변경 요청을 보내면
              관리자가 확인한 뒤
              수락하거나 거절할 수
              있어요.
            </p>
          </div>

          {/* ================================================ */}
          {/* 오류 */}
          {/* ================================================ */}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* ================================================ */}
          {/* 전송 */}
          {/* ================================================ */}

          <button
            type="submit"
            disabled={
              isPending
            }
            className="btn-primary w-full disabled:opacity-50"
          >
            {isPending
              ? "보내는 중…"
              : "변경 요청 보내기"}
          </button>
        </form>
      </main>
    </div>
  );
}
