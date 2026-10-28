import type { SlotWithCount } from "@/lib/types";
export interface Invitee { id: string; name: string; token: string; status: "pending" | "accepted" | "declined"; position: number }
export interface Invitation {
  id: string; title: string; note: string | null; date: string; end_date: string;
  location_text: string; status: "pending" | "confirmed" | "rejected" | "canceled";
  booking_id: string | null; calendar_error: string | null; appointment_invitees: Invitee[];
}
export interface InviteSnapshot {
  id: string; title: string; note: string | null; date: string; end_date: string;
  location_text: string; status: Invitation["status"]; own_name: string; own_status: Invitee["status"];
  participants: { name: string; status: Invitee["status"] }[];
}
export interface InvitationHold { id: string; owner_id: string; title: string; note: string | null; date: string; end_date: string; status: "pending" | "confirmed"; slot_id: string | null }
export function holdAsSlot(i: InvitationHold): SlotWithCount {
  return { id: `invite-${i.id}`, owner_id: i.owner_id, title: i.title, description: i.note,
    date: i.date, end_date: i.end_date, start_time: "00:00", end_time: "23:59", meeting_type: "hangout",
    location_text: "tbd", max_guests: 1, remaining: 0, is_full: true, booking_count: 0,
    is_active: true, created_at: "", updated_at: "", image_url: null,
    image_position: "center", image_text_color: "dark", invitation_pending: true };
}
export function holdBlocksSlot(i: InvitationHold, s: SlotWithCount) {
  return i.owner_id === s.owner_id && i.date <= (s.end_date || s.date) && i.end_date >= s.date;
}
