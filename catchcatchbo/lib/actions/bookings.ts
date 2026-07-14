"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Booking } from "@/lib/types";

// 예약 생성 (공개 사용자)
export async function createBooking(
  slotId: string,
  formData: FormData
): Promise<ActionResult<{ booking: Booking }>> {
  // 입력값 추출
  const guestName = (formData.get("guest_name") as string)?.trim();
  const guestContact = (formData.get("guest_contact") as string)?.trim() || null;
  const meetingType = formData.get("meeting_type") as string;
  const note = (formData.get("note") as string)?.trim() || null;

  // 필수값 검증
  if (!guestName) return { success: false, error: "이름을 입력해주세요." };
  if (guestName.length > 20)
    return { success: false, error: "이름은 20자 이내로 입력해주세요." };
  if (!meetingType) return { success: false, error: "약속 유형을 선택해주세요." };
  if (!slotId) return { success: false, error: "일정 정보가 올바르지 않아요." };

  const supabase = await createClient();

  // 슬롯 유효성 재확인 (프론트 우회 방지)
  const { data: slot, error: slotError } = await supabase
    .from("available_slots")
    .select("id, is_active, date, max_guests")
    .eq("id", slotId)
    .single();

  if (slotError || !slot) {
    return { success: false, error: "존재하지 않는 일정이에요." };
  }
  if (!slot.is_active) {
    return { success: false, error: "비활성화된 일정이에요." };
  }

  // 날짜 확인 (KST)
  const todayKST = new Date(
    new Date().getTime() + 9 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];
  if (slot.date < todayKST) {
    return { success: false, error: "이미 지난 날짜예요." };
  }

  // 현재 예약 수 확인
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slotId)
    .eq("status", "confirmed");

  if ((count ?? 0) >= slot.max_guests) {
    return { success: false, error: "이미 예약이 꽉 찼어요. 다른 날을 선택해줘요." };
  }

  // 예약 생성 (트리거에서 최종 정원 검증)
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      slot_id: slotId,
      guest_name: guestName,
      guest_contact: guestContact,
      meeting_type: meetingType,
      note,
      status: "confirmed",
    })
    .select(
      `
      id, slot_id, guest_name, guest_contact, meeting_type, note, status, created_at, canceled_at,
      available_slots (date, start_time, end_time, title, location_text, meeting_type)
    `
    )
    .single();

  if (insertError) {
    console.error("createBooking error:", insertError);
    // Postgres 트리거 에러 메시지 추출
    const msg =
      insertError.message?.includes("이미 예약이 꽉 찼어요")
        ? "이미 예약이 꽉 찼어요. 다른 날을 선택해줘요."
        : insertError.message?.includes("지난 날짜")
        ? "이미 지난 날짜예요."
        : "예약 중 오류가 발생했어요. 다시 시도해주세요.";
    return { success: false, error: msg };
  }

  revalidatePath("/book");
  revalidatePath("/admin");

  return { success: true, data: { booking: booking as unknown as Booking } };
}

// 예약 취소 (관리자)
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "로그인이 필요해요." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "confirmed"); // 이미 취소된 건은 수정 안 함

  if (error) {
    console.error("cancelBooking error:", error);
    return { success: false, error: "예약 취소 중 오류가 발생했어요." };
  }

  revalidatePath("/admin");
  revalidatePath("/book");
  return { success: true };
}
