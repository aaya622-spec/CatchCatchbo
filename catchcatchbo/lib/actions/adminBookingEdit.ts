"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateGoogleCalendarEvent } from "@/lib/google/calendar";
import type { ActionResult, Booking } from "@/lib/types";

export async function adminUpdateBooking(
  id: string,
  form: FormData,
): Promise<ActionResult<{ warning?: string }>> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요해요." };
  const keys = [
    "date",
    "end_date",
    "guest_name",
    "guest_contact",
    "booking_title",
    "meeting_type",
    "location_text",
    "note",
  ];
  const fields: Record<string, string | number> = {};
  for (const key of keys) fields[key] = String(form.get(key) || "").trim();
  fields.guest_count = Number(form.get("guest_count"));
  const { data, error } = await db.rpc("ccb_admin_edit_booking", {
    p_id: id,
    p_fields: fields,
  });
  if (error || !data)
    return {
      success: false,
      error: error?.message || "예약을 수정하지 못했어요.",
    };
  const booking = data as Booking & {
    google_calendar_event_id?: string | null;
  };
  let warning: string | undefined;
  if (booking.google_calendar_event_id && booking.status === "confirmed") {
    try {
      await updateGoogleCalendarEvent(
        booking.google_calendar_event_id,
        booking,
      );
    } catch (err) {
      console.error("Calendar update failed after booking edit", err);
      warning =
        "예약은 저장됐지만 Google Calendar 갱신에 실패했어요. 캘린더를 직접 수정하거나 Google 연결을 확인한 뒤 예약 수정을 다시 저장해주세요.";
    }
  }
  revalidatePath("/admin");
  revalidatePath("/book", "layout");
  return { success: true, data: { warning } };
}
