import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 비로그인 수락에서도 확정된 초대 기록을 통해서만 소유자 연결을 사용합니다.
async function ownerToken(ownerId: string): Promise<string> {
  const db = createAdminClient();
  const { data: token, error } = await db.from("google_tokens")
    .select("access_token,refresh_token,expiry_date").eq("user_id", ownerId).single();
  if (error || !token) throw new Error("Google Calendar 연결을 확인해주세요.");
  if (token.access_token && Number(token.expiry_date) > Date.now() + 60_000) return token.access_token;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!token.refresh_token || !clientId || !clientSecret) throw new Error("Google Calendar 연결을 확인해주세요.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
      refresh_token: token.refresh_token, grant_type: "refresh_token" }), cache: "no-store",
  });
  const refreshed = await response.json();
  if (!response.ok || !refreshed.access_token) throw new Error("Google Calendar 연결을 갱신하지 못했어요.");
  const { error: saveError } = await db.from("google_tokens").update({ access_token: refreshed.access_token,
    expiry_date: Date.now() + (refreshed.expires_in || 3600) * 1000, updated_at: new Date().toISOString() }).eq("user_id", ownerId);
  if (saveError) throw new Error("Google Calendar 연결 정보를 저장하지 못했어요.");
  return refreshed.access_token as string;
}

export async function syncConfirmedInvitation(id: string): Promise<string | undefined> {
  const db = createAdminClient();
  const { data: invite, error } = await db.from("appointment_invitations")
    .select("id,owner_id,status,booking_id").eq("id", id).single();
  if (error) {
    const message = "약속은 확정됐지만 캘린더 연결 확인에 실패했어요. 관리자에서 다시 연동해주세요.";
    await db.from("appointment_invitations").update({ calendar_error: message }).eq("id", id);
    return message;
  }
  if (!invite || invite.status !== "confirmed" || !invite.booking_id) return;
  try {
    const { data: booking, error: bookingError } = await db.from("bookings")
      .select("id,status,booking_title,note,guest_count,guest_name,google_calendar_event_id,available_slots(date,end_date,location_text)")
      .eq("id", invite.booking_id).single();
    if (bookingError || !booking) throw new Error("확정된 약속을 불러오지 못했어요.");
    if (booking.status !== "confirmed") return;
    if (booking.google_calendar_event_id) {
      await db.from("appointment_invitations").update({ calendar_error: null }).eq("id", id);
      return;
    }
    const slot = (Array.isArray(booking.available_slots) ? booking.available_slots[0] : booking.available_slots) as
      { date: string; end_date: string | null; location_text: string } | null;
    if (!slot) throw new Error("약속 날짜를 찾을 수 없어요.");
    const token = await ownerToken(invite.owner_id);
    const eventId = `ccbinvite${id.replace(/-/g, "")}`;
    const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const url = `${base}/${eventId}`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const end = new Date(`${slot.end_date || slot.date}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const body = { id: eventId, summary: `🎯 ${booking.booking_title}`,
      description: `참석자: ${booking.guest_name}\n인원: ${booking.guest_count}명\n${booking.note || ""}`,
      location: slot.location_text, start: { date: slot.date }, end: { date: end.toISOString().slice(0, 10) },
      extendedProperties: { private: { ccb_invitation_id: id } }, reminders: { useDefault: true } };
    let found = await fetch(url, { headers, cache: "no-store" });
    if (found.status === 404) {
      const created = await fetch(base, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
      if (!created.ok && created.status !== 409) throw new Error("Google Calendar에 약속을 추가하지 못했어요.");
      found = await fetch(url, { headers, cache: "no-store" });
    }
    if (!found.ok) throw new Error("Google Calendar 일정을 확인하지 못했어요.");
    const remote = await found.json();
    if (remote.status === "cancelled" || remote.extendedProperties?.private?.ccb_invitation_id !== id)
      throw new Error("Google Calendar 일정을 다시 확인해주세요.");
    const { data: linked, error: linkError } = await db.from("bookings").update({ google_calendar_event_id: eventId })
      .eq("id", booking.id).eq("status", "confirmed").select("id").maybeSingle();
    if (linkError) throw new Error("캘린더 연결 결과를 저장하지 못했어요. 다시 연동해주세요.");
    if (!linked) {
      // 수락 직후 취소된 약속이면 Google에 남기지 않습니다.
      const removed = await fetch(url, { method: "DELETE", headers, cache: "no-store" });
      if (!removed.ok && removed.status !== 404 && removed.status !== 410)
        throw new Error("취소된 약속의 캘린더 정리가 필요해요.");
    }
    await db.from("appointment_invitations").update({ calendar_error: null }).eq("id", id);
  } catch (err) {
    console.error("Invitation calendar sync failed", err);
    const message = "약속은 확정됐지만 캘린더 반영에 실패했어요. 관리자에서 다시 연동해주세요.";
    await db.from("appointment_invitations").update({ calendar_error: message }).eq("id", id);
    return message;
  }
}
