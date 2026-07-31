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

  function isWeekend(
    dateString: string
  ): boolean {
    const [
      year,
      month,
      day,
    ] = dateString
      .split("-")
      .map(Number);

    const date = new Date(
      year,
      month - 1,
      day
    );

    const weekday =
      date.getDay();

    return (
      weekday === 0 ||
      weekday === 6
    );
  }

  function handleDateChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedDate =
      event.target.value;

    setError(null);

    if (
      selectedDate &&
      isWeekend(selectedDate)
    ) {
      setError(
        "주말에는 만나기 어려워요. 평일 날짜로 선택해주세요."
      );

      event.target.value = "";
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    const formData =
      new FormData(
        event.currentTarget
      );

    const proposedDate =
      (
        formData.get(
          "proposed_date"
        ) as string
      )?.trim();

    if (
      !proposedDate
    ) {
      setError(
        "희망 날짜를 선택해주세요."
      );
      return;
    }

    if (
      isWeekend(
        proposedDate
      )
    ) {
      setError(
        "주말에는 만나기 어려워요. 월요일부터 금요일 중 선택해주세요."
      );
      return;
    }

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
      <Input
        label="이름"
        name="guest_name"
        type="text"
        required
        placeholder="홍길동"
        maxLength={20}
        autoComplete="name"
      />

      <Input
        label="연락처 또는 카카오톡 이름 (선택)"
        name="guest_contact"
        type="text"
        placeholder="카카오톡 이름이나 전화번호"
        hint="제안 확인 후 연락할 수 있게 남겨주세요"
      />

      <Input
        label="약속 이름"
        name="booking_title"
        type="text"
        required
        placeholder="예: 성수에서 전시 보고 저녁 먹기"
        maxLength={40}
      />

      {/* 주말 불가 안내 */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-700">
          주말 약속은 제가 열어둔 날짜에만 가능해요 🙏
        </p>

        <p className="text-xs text-amber-600 mt-1">
          다른 날짜를 제안할 때는 월요일부터 금요일 중 골라주세요.
        </p>
      </div>

      <Input
        label="희망 날짜"
        name="proposed_date"
        type="date"
        required
        min={today}
        onChange={
          handleDateChange
        }
      />

      {/* 시작 / 종료 시간 */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="시작 시간"
          name="proposed_time"
          type="time"
          required
        />

        <Input
          label="종료 시간"
          name="proposed_end_time"
          type="time"
          required
        />
      </div>

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

      <Textarea
        label="메모 (선택)"
        name="note"
        placeholder="추가로 하고 싶은 말이 있으면 적어줘요"
        rows={3}
      />

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
        제안을 보내면 확인 후 따로 알려드릴게요 😊
      </p>
    </form>
  );
}
