"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  MEETING_TYPES,
  LOCATION_PRESETS,
} from "@/lib/constants";
import {
  createSlot,
  updateSlot,
} from "@/lib/actions/slots";
import type { AvailableSlot } from "@/lib/types";

interface SlotFormProps {
  slot?: AvailableSlot;
}

export default function SlotForm({
  slot,
}: SlotFormProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [error, setError] = useState<
    string | null
  >(null);

  const isEdit = !!slot;

  const savedMeetingTypePreset =
    slot &&
    MEETING_TYPES.find(
      (type) =>
        type.value === slot.meeting_type &&
        type.value !== "custom"
    )
      ? slot.meeting_type
      : slot
        ? "custom"
        : "hangout";

  const savedMeetingTypeCustom =
    slot &&
    !MEETING_TYPES.find(
      (type) =>
        type.value === slot.meeting_type &&
        type.value !== "custom"
    )
      ? slot.meeting_type
      : "";

  const savedLocationPreset =
    slot &&
    LOCATION_PRESETS.find(
      (preset) =>
        preset.value === slot.location_text &&
        preset.value !== "custom"
    )
      ? slot.location_text
      : slot
        ? "custom"
        : "tbd";

  const savedLocationCustom =
    slot &&
    !LOCATION_PRESETS.find(
      (preset) =>
        preset.value === slot.location_text &&
        preset.value !== "custom"
    )
      ? slot.location_text
      : "";

  const [
    meetingTypePreset,
    setMeetingTypePreset,
  ] = useState<string>(
    savedMeetingTypePreset
  );

  const [
    meetingTypeCustom,
    setMeetingTypeCustom,
  ] = useState<string>(
    savedMeetingTypeCustom
  );

  const [
    locationPreset,
    setLocationPreset,
  ] = useState<string>(
    savedLocationPreset
  );

  const [
    locationCustom,
    setLocationCustom,
  ] = useState<string>(
    savedLocationCustom
  );

  const today = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

  function handleMeetingTypeSelect(
    value: string
  ) {
    setMeetingTypePreset(value);

    if (value === "custom") {
      setMeetingTypeCustom("");
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    if (
      meetingTypePreset === "custom" &&
      !meetingTypeCustom.trim()
    ) {
      setError(
        "무엇을 할지 직접 입력해주세요."
      );
      return;
    }

    if (
      locationPreset === "custom" &&
      !locationCustom.trim()
    ) {
      setError(
        "장소를 직접 입력해주세요."
      );
      return;
    }

    const formData = new FormData(
      event.currentTarget
    );

    formData.set(
      "meeting_type_preset",
      meetingTypePreset
    );

    formData.set(
      "meeting_type_custom",
      meetingTypeCustom.trim()
    );

    formData.set(
      "location_preset",
      locationPreset
    );

    formData.set(
      "location_custom",
      locationCustom.trim()
    );

    startTransition(async () => {
      const result = isEdit
        ? await updateSlot(
            slot.id,
            formData
          )
        : await createSlot(formData);

      if (
        result &&
        !result.success
      ) {
        setError(
          result.error ??
            "오류가 발생했어요."
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {/* 날짜 */}
      <Input
        label="날짜"
        name="date"
        type="date"
        required
        min={today}
        defaultValue={slot?.date ?? ""}
      />

      {/* 시간 */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="시작 시간"
          name="start_time"
          type="time"
          required
          defaultValue={
            slot?.start_time?.slice(
              0,
              5
            ) ?? ""
          }
        />

        <Input
          label="종료 시간"
          name="end_time"
          type="time"
          required
          defaultValue={
            slot?.end_time?.slice(
              0,
              5
            ) ?? ""
          }
        />
      </div>

      {/* 약속 유형 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-warm-gray-700">
          무엇을 할까요?
        </label>

        <div className="grid grid-cols-2 gap-2">
          {MEETING_TYPES.map(
            (type) => (
              <button
                key={type.value}
                type="button"
                onClick={() =>
                  handleMeetingTypeSelect(
                    type.value
                  )
                }
                className={`py-2.5 rounded-xl border text-sm transition-all ${
                  meetingTypePreset ===
                  type.value
                    ? "border-peach-300 bg-peach-100 text-peach-500"
                    : "border-warm-gray-200 bg-white text-warm-gray-600"
                }`}
              >
                {type.label}
              </button>
            )
          )}
        </div>

        {meetingTypePreset ===
          "custom" && (
          <input
            type="text"
            value={
              meetingTypeCustom
            }
            onChange={(event) =>
              setMeetingTypeCustom(
                event.target.value
              )
            }
            placeholder="예: 야구 보기, 방탈출, 생일파티"
            maxLength={50}
            autoFocus
            className="input-base mt-1"
          />
        )}

        <p className="text-xs text-warm-gray-400">
          추천 유형을 고르거나 직접
          입력할 수 있어요.
        </p>
      </div>

      {/* 장소 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-warm-gray-700">
          장소
        </label>

        <div className="grid grid-cols-2 gap-2">
          {LOCATION_PRESETS.map(
            (preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  setLocationPreset(
                    preset.value
                  )
                }
                className={`py-2.5 rounded-xl border text-sm transition-all ${
                  locationPreset ===
                  preset.value
                    ? "border-peach-300 bg-peach-100 text-peach-500"
                    : "border-warm-gray-200 bg-white text-warm-gray-600"
                }`}
              >
                {preset.label}
              </button>
            )
          )}
        </div>

        {locationPreset ===
          "custom" && (
          <input
            type="text"
            placeholder="장소를 직접 입력해주세요"
            value={locationCustom}
            onChange={(event) =>
              setLocationCustom(
                event.target.value
              )
            }
            maxLength={100}
            className="input-base mt-1"
          />
        )}
      </div>

      {/* 최대 인원 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="max_guests"
          className="text-sm font-medium text-warm-gray-700"
        >
          최대 예약 인원
        </label>

        <select
          id="max_guests"
          name="max_guests"
          defaultValue={
            slot?.max_guests ?? 1
          }
          className="input-base"
        >
          {Array.from(
            {
              length: 10,
            },
            (_, index) =>
              index + 1
          ).map((number) => (
            <option
              key={number}
              value={number}
            >
              {number}명
            </option>
          ))}
        </select>
      </div>

      {/* 일정 이름 */}
      <Input
        label="일정 이름 (선택)"
        name="title"
        type="text"
        placeholder="예: 7월 셋째 주 저녁"
        defaultValue={
          slot?.title ?? ""
        }
        hint="비워두면 날짜와 시간으로 표시돼요"
      />

      {/* 설명 */}
      <Textarea
        label="메모 (선택)"
        name="description"
        placeholder="추가로 전달하고 싶은 내용이 있으면 적어줘요"
        defaultValue={
          slot?.description ?? ""
        }
      />

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() =>
            router.back()
          }
          disabled={isPending}
        >
          취소
        </Button>

        <Button
          type="submit"
          fullWidth
          loading={isPending}
        >
          {isEdit
            ? "수정 완료"
            : "가능한 날 열기"}
        </Button>
      </div>
    </form>
  );
}
