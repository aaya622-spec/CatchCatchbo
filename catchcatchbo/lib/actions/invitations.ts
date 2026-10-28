"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncConfirmedInvitation } from "@/lib/google/invitation-calendar";
import type { ActionResult } from "@/lib/types";
import type { InviteSnapshot } from "@/lib/invitations";
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
function refresh() { revalidatePath("/admin"); revalidatePath("/book", "layout"); }
export async function createInvitation(form: FormData): Promise<ActionResult<{ id: string }>> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요해요." };
  const p: Record<string, string | string[]> = {};
  for (const key of ["title", "date", "end_date", "location_text", "meeting_type", "note"]) p[key] = String(form.get(key) || "").trim();
  p.names = String(form.get("names") || "").split(/\r?\n/).map(n => n.trim()).filter(Boolean);
  const { data, error } = await db.rpc("ccb_invite_create", { p });
  if (error || !data) return { success: false, error: error?.message || "초대를 등록하지 못했어요." };
  refresh(); return { success: true, data: { id: data as string } };
}
export async function readInvitation(token: string): Promise<InviteSnapshot | null> {
  if (!uuid(token)) return null;
  const { data, error } = await createAdminClient().rpc("ccb_invite_read", { p_token: token });
  if (error) throw new Error("초대를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  return data as InviteSnapshot | null;
}
export async function respondInvitation(token: string, accept: boolean): Promise<ActionResult<{ invite: InviteSnapshot; warning?: string }>> {
  if (!uuid(token) || typeof accept !== "boolean") return { success: false, error: "초대 링크를 확인해주세요." };
  const { data, error } = await createAdminClient().rpc("ccb_invite_respond", { p_token: token, p_accept: accept });
  if (error || !data) return { success: false, error: error?.message || "응답을 저장하지 못했어요." };
  const invite = data as InviteSnapshot;
  const warning = invite.status === "confirmed" ? await syncConfirmedInvitation(invite.id) : undefined;
  refresh(); return { success: true, data: { invite, warning } };
}
export async function cancelInvitation(id: string): Promise<ActionResult> {
  if (!uuid(id)) return { success: false, error: "초대를 확인해주세요." };
  const db = await createClient();
  const { error } = await db.rpc("ccb_invite_cancel", { p_id: id });
  if (error) return { success: false, error: error.message };
  refresh(); return { success: true };
}
export async function retryInvitationCalendar(id: string): Promise<ActionResult> {
  if (!uuid(id)) return { success: false, error: "초대를 확인해주세요." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요해요." };
  const { data } = await db.from("appointment_invitations").select("id,status").eq("id", id).eq("owner_id", user.id).single();
  if (!data || data.status !== "confirmed") return { success: false, error: "확정된 초대를 찾을 수 없어요." };
  const warning = await syncConfirmedInvitation(id);
  refresh(); return warning ? { success: false, error: warning } : { success: true };
}
