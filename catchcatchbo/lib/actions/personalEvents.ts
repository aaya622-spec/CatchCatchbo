"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncPersonalGoogleCalendarEvent, deletePersonalGoogleCalendarEvent } from "@/lib/google/calendar";
import type { PersonalEvent } from "@/lib/personal-events";
import type { ActionResult } from "@/lib/types";

export async function savePersonalEvent(
  id: string | null,
  form: FormData,
): Promise<ActionResult<{ warning?: string }>> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요해요." };
  const title = String(form.get("title") || "").trim();
  const note = String(form.get("note") || "").trim();
  const date = String(form.get("date") || "");
  const end_date = String(form.get("end_date") || date);
  const all_day = form.get("all_day") === "on";
  const start_time = all_day ? "00:00" : String(form.get("start_time") || "");
  const end_time = all_day ? "23:59" : String(form.get("end_time") || "");
  const validDate = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !title ||
    title.length > 80 ||
    note.length > 2000 ||
    !validDate(date) ||
    !validDate(end_date) ||
    end_date < date ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end_time) ||
    (!all_day && date === end_date && end_time <= start_time)
  )
    return { success: false, error: "제목과 날짜·시간을 확인해주세요." };
  const values = {
    owner_id: user.id,
    title,
    note: note || null,
    date,
    end_date,
    all_day,
    start_time,
    end_time,
  };
  const query = id
    ? db
        .from("personal_events")
        .update(values)
        .eq("id", id)
        .eq("owner_id", user.id)
    : db.from("personal_events").insert(values);
  const { data, error } = await query.select("*").single();
  if (error || !data)
    return {
      success: false,
      error: error?.message || "저장할 일정을 찾을 수 없어요.",
    };
  let warning: string | undefined;
  try {
    await syncPersonalGoogleCalendarEvent(data as PersonalEvent);
  } catch (err) {
    console.error("Personal calendar sync failed", err);
    warning = "개인 일정은 앱에 저장됐지만 캘린더 연동에 실패했어요. " +
      (err instanceof Error ? err.message : "아래 캘린더 연동 버튼으로 다시 시도해주세요.");
  }
  revalidatePath("/admin");
  revalidatePath("/book", "layout");
  return { success: true, data: { warning } };
}
export async function deletePersonalEvent(id: string): Promise<ActionResult> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요해요." };
  const { data: event, error: lookupError } = await db
    .from("personal_events")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (lookupError || !event) return { success: false, error: "삭제할 개인 일정을 찾을 수 없어요." };
  // 캘린더 삭제에 실패하면 앱 일정을 남겨 다시 삭제할 수 있게 합니다.
  try {
    await deletePersonalGoogleCalendarEvent(event as PersonalEvent);
  } catch (err) {
    console.error("Personal calendar delete failed", err);
    return { success: false, error: "개인 일정을 삭제하지 않았어요. " +
      (err instanceof Error ? err.message : "캘린더 연결을 확인한 뒤 다시 시도해주세요.") };
  }
  const { data, error } = await db
    .from("personal_events")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      success: false,
      error: "캘린더에서는 삭제했지만 앱 일정 삭제를 완료하지 못했어요. 다시 삭제해주세요.",
    };
  revalidatePath("/admin");
  revalidatePath("/book", "layout");
  return { success: true };
}

export async function syncPersonalEvent(id: string): Promise<ActionResult> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요해요." };
  const { data, error } = await db.from("personal_events").select("*")
    .eq("id", id).eq("owner_id", user.id).single();
  if (error || !data) return { success: false, error: "연동할 개인 일정을 찾을 수 없어요." };
  try {
    await syncPersonalGoogleCalendarEvent(data as PersonalEvent);
    return { success: true };
  } catch (err) {
    console.error("Personal calendar retry failed", err);
    return { success: false, error: err instanceof Error ? err.message : "캘린더 연동에 실패했어요." };
  }
}
