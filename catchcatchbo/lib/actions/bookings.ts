"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Booking } from "@/lib/types";

// 친구가 예약 신청
export async function createBooking(
  slotId: string,
  formData: FormData
): Promise<ActionResult<{ booking: Booking }>> {
  const guestName = (formData.get("guest_name") as string)?.trim();
  const guestContact =
    (formData.get("guest_contact") as string)?.trim() || null;
  const meetingType = formData.get("meeting_type") as string;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!guestName) {
    return { success: false, error: "이름을 입력해주세요." };
  }

  if (guestName.length > 20) {
    return {
      success: false,
      error: "이름은 20자 이내로 입력해주세요.",
    };
  }

  if (!meetingType) {
    return {
      success: false,
      error: "약속 유형을 선택해주세요.",
    };
  }

  if (!slotId) {
    return {
      success: false,
      error: "일정 정보가 올바르지 않아요.",
    };
  }

  const supabase = await createClient();

  const { data: slot, error: slotError } = await supabase
    .from("available_slots")
    .select("id, is_active, date, max_guests")
    .eq("id", slotId)
    .single();

  if (slotError || !slot) {
    return {
      success: false,
      error: "존재하지 않는 일정이에요.",
    };
  }

  if (!slot.is_active) {
    return {
      success: false,
      error: "비활성화된 일정이에요.",
    };
  }

  const todayKST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (slot.date < todayKST) {
    return {
      success: false,
      error: "이미 지난 날짜예요.",
    };
  }

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slotId)
    .eq("status", "confirmed");

  if ((count ?? 0) >= slot.max_guests) {
    return {
      success: false,
      error: "이미 예약이 꽉 찼어요. 다른 날을 선택해줘요.",
    };
  }

  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      slot_id: slotId,
      guest_name: guestName,
      guest_contact: guestContact,
      meeting_type: meetingType,
      note,
      status: "pending",
    })
    .select(
      `
      id,
      slot_id,
      guest_name,
      guest_contact,
      meeting_type,
      note,
      status,
      created_at,
      canceled_at,
      available_slots (
        date,
        start_time,
        end_time,
        title,
        location_text,
        meeting_type
      )
    `
    )
    .single();

  if (insertError) {
    console.error("createBooking error:", insertError);

    return {
      success: false,
      error: "예약 신청 중 오류가 발생했어요. 다시 시도해주세요.",
    };
  }

  revalidatePath("/book");
  revalidatePath("/admin");

  return {
    success: true,
    data: {
      booking: booking as unknown as Booking,
    },
  };
}

// 관리자가 예약 확정
export async function confirmBooking(
  bookingId: string
): Promise<ActionResult<{ booking: Booking }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "로그인이 필요해요.",
    };
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      canceled_at: null,
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select(
      `
      id,
      slot_id,
      guest_name,
      guest_contact,
      meeting_type,
      note,
      status,
      created_at,
      canceled_at,
      available_slots (
        date,
        start_time,
        end_time,
        title,
        location_text,
        meeting_type
      )
    `
    )
    .single();

  if (error || !booking) {
    console.error("confirmBooking error:", error);

    const message = error?.message?.includes("이미 예약이 꽉 찼어요")
      ? "이미 예약 인원이 가득 찼어요."
      : "예약 확정 중 오류가 발생했어요.";

    return {
      success: false,
      error: message,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    success: true,
    data: {
      booking: booking as unknown as Booking,
    },
  };
}

// 관리자가 예약 취소 또는 거절
export async function cancelBooking(
  bookingId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "로그인이 필요해요.",
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"]);

  if (error) {
    console.error("cancelBooking error:", error);

    return {
      success: false,
      error: "예약 처리 중 오류가 발생했어요.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/book");

  return { success: true };
}
