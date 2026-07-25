"use client";

import { useState, useTransition } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  MEETING_TYPES,
} from "@/lib/constants";

export default function ProposalForm() {
  const [
    selectedMeetingType,
    setSelectedMeetingType,
  ] = useState("hangout");

  const [
    isPending,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(null);

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      "아직 제출 기능을 연결하는 중이에요."
    );
  }

  const today = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

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

      {error && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-600">
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
        제안을 보내면 확인 후 따로 알려드릴게요 😊
      </p>
    </form>
  );
}
