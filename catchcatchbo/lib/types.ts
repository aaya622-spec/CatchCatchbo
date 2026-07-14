// ============================================================
// 전역 타입 정의
// ============================================================

export interface AvailableSlot {
  id: string;
  owner_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string | null;
  meeting_type: string;
  description: string | null;
  location_text: string;
  max_guests: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  booking_count?: number;
}

export type BookingStatus = "pending" | "confirmed" | "canceled";

export interface Booking {
  id: string;
  slot_id: string;
  guest_name: string;
  guest_contact: string | null;
  meeting_type: string;
  note: string | null;
  status: BookingStatus;
  created_at: string;
  canceled_at: string | null;
  available_slots?: Pick<
    AvailableSlot,
    | "date"
    | "start_time"
    | "end_time"
    | "title"
    | "location_text"
    | "meeting_type"
  >;
}

export interface SlotWithCount extends AvailableSlot {
  booking_count: number;
  remaining: number;
  is_full: boolean;
}

export interface SlotFormData {
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  meeting_type: string;
  description: string;
  location_preset: string;
  location_custom: string;
  max_guests: number;
}

export interface BookingFormData {
  guest_name: string;
  guest_contact: string;
  meeting_type: string;
  note: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
