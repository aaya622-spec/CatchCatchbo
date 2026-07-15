"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LOCATION_PRESETS,
  MEETING_TYPES,
} from "@/lib/constants";
import type {
  ActionResult,
  SlotFormData,
} from "@/lib/types";

// 장소 최종값 결정
function resolveLocationText(
  preset: string,
  custom: string
): string {
  if (preset === "custom") {
    const trimmed = custom.trim();

    return trimmed || "장소 미정";
  }

  return (
    LOCATION_PRESETS.find(
      (item) => item.value === preset
    )?.value ?? "tbd"
  );
}

// 약속 유형 최종값 결정
function resolveMeetingType(
  preset: string,
  custom: string
): string {
  if (preset === "custom") {
    return custom.trim();
  }

  const selectedPreset = MEETING_TYPES.find(
    (item) =>
      item.value === preset &&
      item.value !== "custom"
  );

  return selectedPreset?.value ?? preset.trim();
}

// FormData를 일정 데이터로 변환
function getSlotFormData(
  formData: FormData
): SlotFormData {
  const meetingTypePreset =
    (
      formData.get(
        "meeting_type_preset"
      ) as string
    ) || "hangout";

  const meetingTypeCustom =
    (
      formData.get(
        "meeting_type_custom"
      ) as string
    ) || "";

  const meetingType = resolveMeetingType(
    meetingTypePreset,
    meetingTypeCustom
  );

  return {
    date:
      (formData.get("date") as string) ||
      "",

    start_time:
      (formData.get(
        "start_time"
      ) as string) || "",

    end_time:
      (formData.get(
        "end_time"
      ) as string) || "",

    title:
      (
        formData.get("title") as string
      )?.trim() || "",

    meeting_type: meetingType,

    description:
      (
        formData.get(
          "description"
        ) as string
      )?.trim() || "",

    location_preset:
      (
        formData.get(
          "location_preset"
        ) as string
      ) || "tbd",

    location_custom:
      (
        formData.get(
          "location_custom"
        ) as string
      )?.trim() || "",

    max_guests:
      parseInt(
        formData.get(
          "max_guests"
        ) as string,
        10
      ) || 1,
  };
}

// 입력값 검사
function validateSlotForm(
  data: SlotFormData
): string | null {
  if (!data.date) {
    return "날짜를 선택해주세요.";
  }

  if (!data.start_time) {
    return "시작 시간을 입력해주세요.";
  }

  if (!data.end_time) {
    return "종료 시간을 입력해주세요.";
  }

  if (
    data.start_time >= data.end_time
  ) {
    return "종료 시간은 시작 시간보다 늦어야 해요.";
  }

  if (!data.meeting_type.trim()) {
    return "무엇을 할지 입력해주세요.";
  }

  if (
    data.meeting_type.trim().length > 50
  ) {
    return "약속 내용은 50자 이내로 입력해주세요.";
  }

  if (
    data.location_preset ===
      "custom" &&
    !data.location_custom.trim()
  ) {
    return "장소를 직접 입력해주세요.";
  }

  if (
    data.max_guests < 1 ||
    data.max_guests > 20
  ) {
    return "예약 인원은 1명~20명 사이여야 해요.";
  }

  return null;
}

// 일정 생성
export async function createSlot(
  formData: FormData
): Promise<
  ActionResult<{
    id: string;
  }>
> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "로그인이 필요해요.",
    };
  }

  const data =
    getSlotFormData(formData);

  const validationError =
    validateSlotForm(data);

  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  const locationText =
    resolveLocationText(
      data.location_preset,
      data.location_custom
    );

  const {
    data: slot,
    error,
  } = await supabase
    .from("available_slots")
    .insert({
      owner_id: user.id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title || null,
      meeting_type:
        data.meeting_type.trim(),
      description:
        data.description || null,
      location_text: locationText,
      max_guests: data.max_guests,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !slot) {
    console.error(
      "createSlot error:",
      error
    );

    return {
      success: false,
      error:
        "일정 등록 중 오류가 발생했어요. 다시 시도해주세요.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  redirect("/admin");
}

// 일정 수정
export async function updateSlot(
  slotId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "로그인이 필요해요.",
    };
  }

  if (!slotId) {
    return {
      success: false,
      error:
        "수정할 일정 정보가 올바르지 않아요.",
    };
  }

  const data =
    getSlotFormData(formData);

  const validationError =
    validateSlotForm(data);

  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  const locationText =
    resolveLocationText(
      data.location_preset,
      data.location_custom
    );

  const { error } = await supabase
    .from("available_slots")
    .update({
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title || null,
      meeting_type:
        data.meeting_type.trim(),
      description:
        data.description || null,
      location_text: locationText,
      max_guests: data.max_guests,
    })
    .eq("id", slotId)
    .eq("owner_id", user.id);

  if (error) {
    console.error(
      "updateSlot error:",
      error
    );

    return {
      success: false,
      error:
        "일정 수정 중 오류가 발생했어요.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  redirect("/admin");
}

// 일정 완전 삭제
export async function deleteOrDeactivateSlot(
  slotId: string
): Promise<ActionResult> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "로그인이 필요해요.",
    };
  }

  if (!slotId) {
    return {
      success: false,
      error:
        "삭제할 일정 정보가 올바르지 않아요.",
    };
  }

  const { error } = await supabase
    .from("available_slots")
    .delete()
    .eq("id", slotId)
    .eq("owner_id", user.id);

  if (error) {
    console.error(
      "deleteSlot error:",
      error
    );

    return {
      success: false,
      error:
        "일정 삭제 중 오류가 발생했어요.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    success: true,
  };
}

// 일정 활성화·비활성화
export async function toggleSlotActive(
  slotId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "로그인이 필요해요.",
    };
  }

  if (!slotId) {
    return {
      success: false,
      error:
        "일정 정보가 올바르지 않아요.",
    };
  }

  const { error } = await supabase
    .from("available_slots")
    .update({
      is_active: isActive,
    })
    .eq("id", slotId)
    .eq("owner_id", user.id);

  if (error) {
    console.error(
      "toggleSlotActive error:",
      error
    );

    return {
      success: false,
      error:
        "상태 변경 중 오류가 발생했어요.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    success: true,
  };
}
