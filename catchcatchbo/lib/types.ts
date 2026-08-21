// ============================================================
// 전역 타입 정의
// ============================================================

export interface AvailableSlot {
  id: string;
  owner_id: string;

  // 일정 시작일 / 종료일
  date: string;
  end_date: string;

  // 기존 호환용 시간값
  start_time: string;
  end_time: string;

  title: string | null;
  meeting_type: string;
  description: string | null;
  location_text: string;

  // 대표 이미지
  image_url: string | null;
  image_position: string | null;
  image_text_color: "dark" | "light";

  max_guests: number;
  is_active: boolean;

  created_at: string;
  updated_at: string;

  booking_count?: number;
}

// ============================================================
// 예약
// ============================================================

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

  available_slots?: Pick<
    AvailableSlot,
    | "date"
    | "end_date"
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

  // 제안 시작일 / 종료일
  proposed_date: string;
  proposed_end_date: string;

  // 기존 호환용 시간값
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
// 슬롯 + 예약 현황
// ============================================================

export interface SlotWithCount
  extends AvailableSlot {
  booking_count: number;
  remaining: number;
  is_full: boolean;
}

// ============================================================
// 관리자 일정 등록 폼
// ============================================================

export interface SlotFormData {
  // 일정 시작일 / 종료일
  date: string;
  end_date: string;

  // 기존 서버/DB 호환용
  start_time: string;
  end_time: string;

  title: string;
  meeting_type: string;
  description: string;

  location_preset: string;
  location_custom: string;

  image_url: string;
  image_position: string;
  image_text_color:
    | "dark"
    | "light";

  max_guests: number;
}

// ============================================================
// 예약 신청 폼
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

  // 제안 시작일 / 종료일
  proposed_date: string;
  proposed_end_date: string;

  // 기존 호환용
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

export interface ActionResult<
  T = void
> {
  success: boolean;
  data?: T;
  error?: string;
}
