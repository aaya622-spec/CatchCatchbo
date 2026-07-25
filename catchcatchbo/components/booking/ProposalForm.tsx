"use client";

import {
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  Input,
  Textarea,
} from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { MEETING_TYPES } from "@/lib/constants";
import { createProposal } from "@/lib/actions/proposals";

export default function ProposalForm() {
  const [
    selectedMeetingType,
    setSelectedMeetingType,
  ] = useState("hangout");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(null);

  const [isCompleted, setIsCompleted] =
    useState(false);

  const today =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date());

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    const formData =
      new FormData(
        event.currentTarget
      );

    startTransition(async () => {
      const result =
        await createProposal(
          formData
        );

      if (!result.success) {
        setError(
          result.error ??
            "날짜 제안 중 오류가 발생했어요."
        );

        return;
      }

      setIsCompleted(true);
    });
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div className="text-6xl mb-6">
          💌
        </div>

        <h2 className="text-2xl font-bold text-warm-gray-800">
          날짜 제안을 보냈어요!
        </h2>

        <p className="text-sm text-warm-gray-500 mt-3 leading-relaxed">
          일정 확인해보고
          <br />
          가능한지 알려드릴게요 😊
        </p>

        <Link
          href="/book"
          className="btn-primary w-full text-center mt-8"
        >
          예약 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {/* 이름 */}
      <Input
        label="이름"
        name="guest_name"
        type="text"
        required
        placeholder="홍길동"
        maxLength={20}
        autoComplete="name"
      />

      {/* 연락처 */}
      <Input
        label="연락처 또는 카카오톡 이름 (선택)"
        name="guest_contact"
        type="text"
        placeholder="카카오톡 이름이나 전화번호"
        hint="제안 확인 후 연락할 수 있게 남겨주세요"
      />

      {/* 약속 이름 */}
      <Input
        label="약속 이름"
        name="booking_title"
        type="text"
        required
        placeholder="예: 성수에서 전시 보고 저녁 먹기"
        maxLength={40}
      />

      {/* 희망 날짜 */}
      <Input
        label="희망 날짜"
        name="proposed_date"
        type="date"
        required
        min={today}
      />

      {/* 희망 시간 */}
      <Input
        label="희망 시간 (선택)"
        name="proposed_time"
        type="time"
      />

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
          defaultValue="1"
          required
          className="input-base"
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
        <label className="text-sm font-medium text-warm-gray-700">
          어떤 약속이에요?
        </label>

        <div className="grid grid-cols-3 gap-2">
          {MEETING_TYPES.map(
            (type) => (
              <label
                key={type.value}
                className="relative cursor-pointer"
              >
                <input
                  type="radio"
                  name="meeting_type"
                  value={type.value}
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
                  {type.label}
                </div>
              </label>
            )
          )}
        </div>
      </div>

      {/* 메모 */}
      <Textarea
        label="메모 (선택)"
        name="note"
        placeholder="추가로 하고 싶은 말이 있으면 적어줘요"
        rows={3}
      />

      {/* 오류 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={isPending}
        size="lg"
      >
        이 날짜 제안하기
      </Button>

      <p className="text-xs text-center text-warm-gray-400">
        제안을 보내면 확인 후 따로
        알려드릴게요 😊
      </p>
    </form>
  );
}
