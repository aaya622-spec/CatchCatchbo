"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Input,
  Textarea,
} from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  MEETING_TYPES,
  LOCATION_PRESETS,
} from "@/lib/constants";
import {
  createSlot,
  updateSlot,
} from "@/lib/actions/slots";
import type {
  AvailableSlot,
} from "@/lib/types";

interface SlotFormProps {
  slot?: AvailableSlot;
}

export default function SlotForm({
  slot,
}: SlotFormProps) {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState<string | null>(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState<string | null>(
    slot?.image_url ?? null
  );

  const [
    imagePosition,
    setImagePosition,
  ] = useState(
    slot?.image_position ??
      "center"
  );

  const [
    startDate,
    setStartDate,
  ] = useState(
    slot?.date ?? ""
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    slot?.end_date ??
      slot?.date ??
      ""
  );

  const isEdit = !!slot;

  // ============================================================
  // 기존 약속 유형
  // ============================================================

  const savedMeetingTypePreset =
    slot &&
    MEETING_TYPES.find(
      (type) =>
        type.value ===
          slot.meeting_type &&
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
        type.value ===
          slot.meeting_type &&
        type.value !== "custom"
    )
      ? slot.meeting_type
      : "";

  // ============================================================
  // 기존 장소
  // ============================================================

  const savedLocationPreset =
    slot &&
    LOCATION_PRESETS.find(
      (preset) =>
        preset.value ===
          slot.location_text &&
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
        preset.value ===
          slot.location_text &&
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

  // ============================================================
  // 오늘 날짜 KST
  // ============================================================

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

  // ============================================================
  // 약속 유형
  // ============================================================

  function handleMeetingTypeSelect(
    value: string
  ) {
    setMeetingTypePreset(value);

    if (value === "custom") {
      setMeetingTypeCustom("");
    }
  }

  // ============================================================
  // 시작일 변경
  // ============================================================

  function handleStartDateChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value;

    setStartDate(value);

    /*
     * 종료일이 비어있거나
     * 새 시작일보다 앞이라면
     * 자동으로 시작일과 동일하게 맞춤
     */
    if (
      !endDate ||
      endDate < value
    ) {
      setEndDate(value);
    }
  }

  // ============================================================
  // 종료일 변경
  // ============================================================

  function handleEndDateChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setEndDate(
      event.target.value
    );
  }

  // ============================================================
  // 이미지
  // ============================================================

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "이미지 파일만 업로드할 수 있어요."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "이미지는 5MB 이하로 올려주세요."
      );

      event.target.value =
        "";

      return;
    }

    setError(null);

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setImagePreview(
      previewUrl
    );
  }

  // ============================================================
  // 제출
  // ============================================================

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    if (!startDate) {
      setError(
        "시작 날짜를 선택해주세요."
      );
      return;
    }

    if (!endDate) {
      setError(
        "종료 날짜를 선택해주세요."
      );
      return;
    }

    if (
      endDate < startDate
    ) {
      setError(
        "종료 날짜는 시작 날짜보다 빠를 수 없어요."
      );
      return;
    }

    if (
      meetingTypePreset ===
        "custom" &&
      !meetingTypeCustom.trim()
    ) {
      setError(
        "무엇을 할지 직접 입력해주세요."
      );

      return;
    }

    if (
      locationPreset ===
        "custom" &&
      !locationCustom.trim()
    ) {
      setError(
        "장소를 직접 입력해주세요."
      );

      return;
    }

    const formData =
      new FormData(
        event.currentTarget
      );

    formData.set(
      "date",
      startDate
    );

    formData.set(
      "end_date",
      endDate
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

    formData.set(
      "image_position",
      imagePosition
    );

    formData.set(
      "current_image_url",
      slot?.image_url ?? ""
    );

    /*
     * 기존 slots.ts / DB 호환용.
     * 화면에서는 시간을 받지 않지만
     * 다음 단계에서 서버 로직을 교체하기 전까지
     * validation이 깨지지 않도록 값을 전달합니다.
     */
    formData.set(
      "start_time",
      "00:00"
    );

    formData.set(
      "end_time",
      "23:59"
    );

    /*
     * 기존 DB/트리거 호환용
     */
    formData.set(
      "max_guests",
      "1"
    );

    startTransition(
      async () => {
        const result =
          isEdit
            ? await updateSlot(
                slot.id,
                formData
              )
            : await createSlot(
                formData
              );

        if (
          result &&
          !result.success
        ) {
          setError(
            result.error ??
              "오류가 발생했어요."
          );
        }
      }
    );
  }

  // ============================================================
  // 화면
  // ============================================================

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="flex flex-col gap-5"
    >
      {/* ====================================================== */}
      {/* 날짜 범위 */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-warm-gray-700">
          날짜
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-warm-gray-400">
              시작일
            </span>

            <input
              name="date"
              type="date"
              required
              min={today}
              value={
                startDate
              }
              onChange={
                handleStartDateChange
              }
              className="input-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-warm-gray-400">
              종료일
            </span>

            <input
              name="end_date"
              type="date"
              required
              min={
                startDate ||
                today
              }
              value={
                endDate
              }
              onChange={
                handleEndDateChange
              }
              className="input-base"
            />
          </div>
        </div>

        <p className="text-xs text-warm-gray-400">
          당일 약속은 시작일과
          종료일을 같은 날짜로
          선택해주세요.
        </p>
      </div>

      {/* 서버 호환용 시간 */}
      <input
        type="hidden"
        name="start_time"
        value="00:00"
      />

      <input
        type="hidden"
        name="end_time"
        value="23:59"
      />

      {/* ====================================================== */}
      {/* 약속 유형 */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-warm-gray-700">
          무엇을 할까요?
        </label>

        <div className="grid grid-cols-2 gap-2">
          {MEETING_TYPES.map(
            (type) => (
              <button
                key={
                  type.value
                }
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
                {
                  type.label
                }
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
            onChange={(
              event
            ) =>
              setMeetingTypeCustom(
                event.target
                  .value
              )
            }
            placeholder="예: 야구 보기, 방탈출, 생일파티"
            maxLength={50}
            autoFocus
            className="input-base mt-1"
          />
        )}

        <p className="text-xs text-warm-gray-400">
          추천 유형을 고르거나
          직접 입력할 수 있어요.
        </p>
      </div>

      {/* ====================================================== */}
      {/* 장소 */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-warm-gray-700">
          장소
        </label>

        <div className="grid grid-cols-2 gap-2">
          {LOCATION_PRESETS.map(
            (preset) => (
              <button
                key={
                  preset.value
                }
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
                {
                  preset.label
                }
              </button>
            )
          )}
        </div>

        {locationPreset ===
          "custom" && (
          <input
            type="text"
            placeholder="장소를 직접 입력해주세요"
            value={
              locationCustom
            }
            onChange={(
              event
            ) =>
              setLocationCustom(
                event.target
                  .value
              )
            }
            maxLength={100}
            className="input-base mt-1"
          />
        )}
      </div>

      {/* ====================================================== */}
      {/* 일정 이름 */}
      {/* ====================================================== */}

      <Input
        label="일정 이름 (선택)"
        name="title"
        type="text"
        placeholder="예: 한강에서 치맥 먹자!"
        defaultValue={
          slot?.title ?? ""
        }
        hint="친구에게 보여줄 약속 제목이에요"
      />

      {/* ====================================================== */}
      {/* 대표 이미지 */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="slot_image"
          className="text-sm font-medium text-warm-gray-700"
        >
          대표 이미지 (선택)
        </label>

        {imagePreview ? (
          <div className="w-full aspect-[4/1] overflow-hidden rounded-2xl bg-warm-gray-100">
            <img
              src={
                imagePreview
              }
              alt="대표 이미지 미리보기"
              className="w-full h-full object-cover"
              style={{
                objectPosition:
                  imagePosition,
              }}
            />
          </div>
        ) : (
          <div className="w-full aspect-[4/1] rounded-2xl bg-cream-100 border border-dashed border-warm-gray-200 flex items-center justify-center">
            <span className="text-sm text-warm-gray-400">
              대표 이미지를
              추가해보세요
            </span>
          </div>
        )}

        <input
          id="slot_image"
          name="slot_image"
          type="file"
          accept="image/*"
          onChange={
            handleImageChange
          }
          className="block w-full text-sm text-warm-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-peach-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-peach-500"
        />

        <p className="text-xs text-warm-gray-400">
          가로형 이미지를
          권장해요. 최대 5MB
        </p>

        {/* 이미지 위치 */}

        {imagePreview && (
          <div className="flex gap-2 mt-1">
            {[
              {
                value: "top",
                label: "위",
              },
              {
                value:
                  "center",
                label:
                  "가운데",
              },
              {
                value:
                  "bottom",
                label:
                  "아래",
              },
            ].map(
              (item) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setImagePosition(
                      item.value
                    )
                  }
                  className={`flex-1 py-2 rounded-xl border text-xs ${
                    imagePosition ===
                    item.value
                      ? "border-peach-300 bg-peach-100 text-peach-500"
                      : "border-warm-gray-200 bg-white text-warm-gray-500"
                  }`}
                >
                  {
                    item.label
                  }
                </button>
              )
            )}
          </div>
        )}

        {/* 배너 글자색 */}

        <div className="flex flex-col gap-2 mt-2">
          <label className="text-sm font-medium text-warm-gray-700">
            배너 글자색
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="cursor-pointer">
              <input
                type="radio"
                name="image_text_color"
                value="dark"
                defaultChecked={
                  !slot?.image_text_color ||
                  slot.image_text_color ===
                    "dark"
                }
                className="sr-only peer"
              />

              <div className="py-2.5 rounded-xl border text-sm text-center transition-all border-warm-gray-200 bg-white text-warm-gray-700 peer-checked:border-peach-300 peer-checked:bg-peach-100 peer-checked:text-peach-500">
                어두운 글자
              </div>
            </label>

            <label className="cursor-pointer">
              <input
                type="radio"
                name="image_text_color"
                value="light"
                defaultChecked={
                  slot?.image_text_color ===
                  "light"
                }
                className="sr-only peer"
              />

              <div className="py-2.5 rounded-xl border text-sm text-center transition-all border-warm-gray-200 bg-white text-warm-gray-700 peer-checked:border-peach-300 peer-checked:bg-peach-100 peer-checked:text-peach-500">
                밝은 글자
              </div>
            </label>
          </div>

          <p className="text-xs text-warm-gray-400">
            이미지 배경에 맞춰
            글자색을 선택해주세요.
          </p>
        </div>
      </div>

      {/* ====================================================== */}
      {/* 메모 */}
      {/* ====================================================== */}

      <Textarea
        label="메모 (선택)"
        name="description"
        placeholder="추가로 전달하고 싶은 내용이 있으면 적어줘요"
        defaultValue={
          slot?.description ??
          ""
        }
      />

      {/* 오류 */}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* ====================================================== */}
      {/* 버튼 */}
      {/* ====================================================== */}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() =>
            router.back()
          }
          disabled={
            isPending
          }
        >
          취소
        </Button>

        <Button
          type="submit"
          fullWidth
          loading={
            isPending
          }
        >
          {isEdit
            ? "수정 완료"
            : "가능한 날 열기"}
        </Button>
      </div>
    </form>
  );
}
