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

  // 대표 이미지
  image_url: string | null;
  image_position: string;
  image_text_color: "dark" | "light";

  max_guests: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  booking_count?: number;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "canceled";

export interface Booking {
  id: string;
  slot_id: string;

  guest_name: string;
  guest_contact: string | null;

  booking_title: string;
  guest_count: number;

  meeting_type: string;
  note: string | null;

  status: BookingStatus;

  created_at: string;
  canceled_at: string | null;

  /*
   * 예약/캘린더 로직에서 필요한 일정 정보만 사용.
   * 이미지 정보는 Booking에 강제로 요구하지 않음.
   */
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

// ============================================================
// 날짜 제안
// ============================================================

export type DateProposalStatus =
  | "pending"
  | "accepted"
  | "rejected";

export interface DateProposal {
  id: string;

  guest_name: string;
  guest_contact: string | null;

  proposed_date: string;
  proposed_time: string | null;
  proposed_end_time: string | null;

  booking_title: string;
  guest_count: number;

  meeting_type: string;
  note: string | null;

  status: DateProposalStatus;

  created_at: string;
}

// ============================================================
// 공개 / 관리자 일정
// ============================================================

export interface SlotWithCount
  extends AvailableSlot {
  booking_count: number;
  remaining: number;
  is_full: boolean;
}

// ============================================================
// 일정 폼
// ============================================================

export interface SlotFormData {
  date: string;
  start_time: string;
  end_time: string;

  title: string;
  meeting_type: string;
  description: string;

  location_preset: string;
  location_custom: string;

  image_url: string;
  image_position: string;
  image_text_color: "dark" | "light";

  max_guests: number;
}

// ============================================================
// 예약 폼
// ============================================================

export interface BookingFormData {
  guest_name: string;
  guest_contact: string;

  booking_title: string;
  guest_count: number;

  meeting_type: string;
  note: string;
}

// ============================================================
// 날짜 제안 폼
// ============================================================

export interface DateProposalFormData {
  guest_name: string;
  guest_contact: string;

  proposed_date: string;
  proposed_time: string;
  proposed_end_time: string;

  booking_title: string;
  guest_count: number;

  meeting_type: string;
  note: string;
}

// ============================================================
// Server Action 공통 응답
// ============================================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
