// ============================================================
// 전역 타입 정의
// ============================================================

export interface AvailableSlot {
  id: string;
  owner_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  title: string | null;
  meeting_type: string;
  description: string | null;
  location_text: string;
  max_guests: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // 집계 필드 (쿼리 시 조인)
  booking_count?: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  guest_name: string;
  guest_contact: string | null;
  meeting_type: string;
  note: string | null;
  status: "confirmed" | "canceled";
  created_at: string;
  canceled_at: string | null;
  // 조인 필드
  available_slots?: Pick<
    AvailableSlot,
    "date" | "start_time" | "end_time" | "title" | "location_text" | "meeting_type"
  >;
}

export interface SlotWithCount extends AvailableSlot {
  booking_count: number;
  remaining: number;
  is_full: boolean;
}

// 폼 데이터 타입
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

// Server Action 응답 타입
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
