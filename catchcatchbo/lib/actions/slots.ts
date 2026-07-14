"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_PRESETS } from "@/lib/constants";
import type { ActionResult, SlotFormData } from "@/lib/types";

// 장소 텍스트 결정: 프리셋이면 그 value, 직접 입력이면 custom 텍스트
function resolveLocationText(preset: string, custom: string): string {
  if (preset === "custom") {
    const trimmed = custom.trim();
    return trimmed || "장소 미정";
  }
  return LOCATION_PRESETS.find((p) => p.value === preset)?.value ?? "tbd";
}

// 입력값 유효성 검사
function validateSlotForm(data: SlotFormData): string | null {
  if (!data.date) return "날짜를 선택해주세요.";
  if (!data.start_time) return "시작 시간을 입력해주세요.";
  if (!data.end_time) return "종료 시간을 입력해주세요.";
  if (data.start_time >= data.end_time) return "종료 시간은 시작 시간보다 늦어야 해요.";
  if (!data.meeting_type) return "약속 유형을 선택해주세요.";
  if (data.max_guests < 1 || data.max_guests > 20)
    return "예약 인원은 1명~20명 사이여야 해요.";
  return null;
}

// 일정 생성
export async function createSlot(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "로그인이 필요해요." };
  }

  const data: SlotFormData = {
    date: formData.get("date") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    title: (formData.get("title") as string) || "",
    meeting_type: formData.get("meeting_type") as string,
    description: (formData.get("description") as string) || "",
    location_preset: (formData.get("location_preset") as string) || "tbd",
    location_custom: (formData.get("location_custom") as string) || "",
    max_guests: parseInt(formData.get("max_guests") as string, 10) || 1,
  };

  const validationError = validateSlotForm(data);
  if (validationError) return { success: false, error: validationError };

  const locationText = resolveLocationText(data.location_preset, data.location_custom);

  const { data: slot, error } = await supabase
    .from("available_slots")
    .insert({
      owner_id: user.id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title || null,
      meeting_type: data.meeting_type,
      description: data.description || null,
      location_text: locationText,
      max_guests: data.max_guests,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createSlot error:", error);
    return { success: false, error: "일정 등록 중 오류가 발생했어요. 다시 시도해주세요." };
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
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "로그인이 필요해요." };
  }

  const data: SlotFormData = {
    date: formData.get("date") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    title: (formData.get("title") as string) || "",
    meeting_type: formData.get("meeting_type") as string,
    description: (formData.get("description") as string) || "",
    location_preset: (formData.get("location_preset") as string) || "tbd",
    location_custom: (formData.get("location_custom") as string) || "",
    max_guests: parseInt(formData.get("max_guests") as string, 10) || 1,
  };

  const validationError = validateSlotForm(data);
  if (validationError) return { success: false, error: validationError };

  const locationText = resolveLocationText(data.location_preset, data.location_custom);

  const { error } = await supabase
    .from("available_slots")
    .update({
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title || null,
      meeting_type: data.meeting_type,
      description: data.description || null,
      location_text: locationText,
      max_guests: data.max_guests,
    })
    .eq("id", slotId)
    .eq("owner_id", user.id);

  if (error) {
    console.error("updateSlot error:", error);
    return { success: false, error: "일정 수정 중 오류가 발생했어요." };
  }

  revalidatePath("/admin");
  revalidatePath("/book");
  redirect("/admin");
}

// 일정 비활성화 (예약 있을 경우) 또는 삭제
export async function deleteOrDeactivateSlot(
  slotId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "로그인이 필요해요." };
  }

  // 확정 예약 수 확인
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slotId)
    .eq("status", "confirmed");

  if ((count ?? 0) > 0) {
    // 예약이 있으면 비활성화
    const { error } = await supabase
      .from("available_slots")
      .update({ is_active: false })
      .eq("id", slotId)
      .eq("owner_id", user.id);

    if (error) return { success: false, error: "일정 비활성화 중 오류가 발생했어요." };
    revalidatePath("/admin");
    revalidatePath("/book");
    return {
      success: true,
      error: undefined,
      data: undefined,
    };
  }

  // 예약 없으면 완전 삭제
  const { error } = await supabase
    .from("available_slots")
    .delete()
    .eq("id", slotId)
    .eq("owner_id", user.id);

  if (error) return { success: false, error: "일정 삭제 중 오류가 발생했어요." };

  revalidatePath("/admin");
  revalidatePath("/book");
  return { success: true };
}

// 일정 활성화/비활성화 토글
export async function toggleSlotActive(
  slotId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "로그인이 필요해요." };
  }

  const { error } = await supabase
    .from("available_slots")
    .update({ is_active: isActive })
    .eq("id", slotId)
    .eq("owner_id", user.id);

  if (error) return { success: false, error: "상태 변경 중 오류가 발생했어요." };

  revalidatePath("/admin");
  revalidatePath("/book");
  return { success: true };
}
