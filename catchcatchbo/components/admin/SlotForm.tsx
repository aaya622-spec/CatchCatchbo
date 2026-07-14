"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { MEETING_TYPES, LOCATION_PRESETS } from "@/lib/constants";
import { createSlot, updateSlot } from "@/lib/actions/slots";
import type { AvailableSlot } from "@/lib/types";

interface SlotFormProps {
  slot?: AvailableSlot; // 수정 모드일 때 기존 데이터
}

export default function SlotForm({ slot }: SlotFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationPreset, setLocationPreset] = useState<string>(
    slot
      ? LOCATION_PRESETS.find((p) => p.value === slot.location_text)
        ? slot.location_text
        : "custom"
      : "tbd"
  );
  const [locationCustom, setLocationCustom] = useState<string>(
    slot && !LOCATION_PRESETS.find((p) => p.value === slot.location_text)
      ? slot.location_text
      : ""
  );

  const isEdit = !!slot;

  // 오늘 날짜 (min 값)
  const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("location_preset", locationPreset);
    formData.set("location_custom", locationCustom);

    startTransition(async () => {
      const result = isEdit
        ? await updateSlot(slot!.id, formData)
        : await createSlot(formData);

      if (result && !result.success) {
        setError(result.error ?? "오류가 발생했어요.");
      }
      // 성공 시 Server Action 내부에서 redirect 처리
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          defaultValue={slot?.start_time?.slice(0, 5) ?? ""}
        />
        <Input
          label="종료 시간"
          name="end_time"
          type="time"
          required
          defaultValue={slot?.end_time?.slice(0, 5) ?? ""}
        />
      </div>

      {/* 약속 유형 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-warm-gray-700">약속 유형</label>
        <div className="grid grid-cols-3 gap-2">
          {MEETING_TYPES.map((type) => (
            <label
              key={type.value}
              className="relative cursor-pointer"
            >
              <input
                type="radio"
                name="meeting_type"
                value={type.value}
                defaultChecked={slot?.meeting_type === type.value || (!slot && type.value === "hangout")}
                className="sr-only peer"
                required
              />
              <div className="flex items-center justify-center py-2.5 rounded-xl border border-warm-gray-200 bg-white text-sm text-warm-gray-600 peer-checked:border-peach-300 peer-checked:bg-peach-100 peer-checked:text-peach-500 transition-all">
                {type.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 장소 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-warm-gray-700">장소</label>
        <div className="grid grid-cols-2 gap-2">
          {LOCATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setLocationPreset(preset.value)}
              className={`py-2.5 rounded-xl border text-sm transition-all ${
                locationPreset === preset.value
                  ? "border-peach-300 bg-peach-100 text-peach-500"
                  : "border-warm-gray-200 bg-white text-warm-gray-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {locationPreset === "custom" && (
          <input
            type="text"
            placeholder="장소를 직접 입력해주세요"
            value={locationCustom}
            onChange={(e) => setLocationCustom(e.target.value)}
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
          defaultValue={slot?.max_guests ?? 1}
          className="input-base"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}명
            </option>
          ))}
        </select>
      </div>

      {/* 슬롯 이름 (선택) */}
      <Input
        label="슬롯 이름 (선택)"
        name="title"
        type="text"
        placeholder="예: 7월 셋째 주 저녁"
        defaultValue={slot?.title ?? ""}
        hint="비워두면 날짜와 시간으로 자동 표시돼요"
      />

      {/* 설명 (선택) */}
      <Textarea
        label="메모 (선택)"
        name="description"
        placeholder="추가로 전달하고 싶은 내용이 있으면 적어줘요"
        defaultValue={slot?.description ?? ""}
      />

      {/* 에러 메시지 */}
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
          onClick={() => router.back()}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" fullWidth loading={isPending}>
          {isEdit ? "수정 완료" : "가능한 날 열기"}
        </Button>
      </div>
    </form>
  );
}
