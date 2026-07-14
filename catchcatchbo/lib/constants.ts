// ============================================================
// 서비스 기본 설정 (텍스트 상수)
// 서비스 이름, 문구를 변경하려면 이 파일만 수정하면 됩니다.
// ============================================================

export const APP_NAME = "캐치캐치보";
export const APP_TAGLINE = "편한 날 하나 골라주세요";

// 공개 예약 페이지 상단 문구
export const BOOKING_PAGE_GREETING = "이번 달 약속 가능한 날을 열어뒀어요.";
export const BOOKING_PAGE_SUB = "편한 날 하나 골라주세요.\n장소는 나중에 같이 정해요!";

// 예약 완료 메시지
export const BOOKING_COMPLETE_TITLE = "약속이 잡혔어요! 🎉";
export const BOOKING_COMPLETE_SUB =
  "장소와 세부 일정은 따로 이야기해요.";

// 공유 문구
export const SHARE_MESSAGE =
  "나 요즘 일정 잡는 게 너무 귀찮아서 가능한 날 열어놨어ㅋㅋ 편한 날 하나 골라줘";

// 예약 버튼
export const BOOKING_BUTTON_TEXT = "이날 만날래요";

// 약속 유형 목록
export const MEETING_TYPES = [
  { value: "dinner", label: "저녁" },
  { value: "cafe", label: "카페" },
  { value: "drink", label: "술" },
  { value: "exhibition", label: "전시" },
  { value: "exercise", label: "운동" },
  { value: "hangout", label: "그냥 만나기" },
] as const;

export type MeetingTypeValue = (typeof MEETING_TYPES)[number]["value"];

// 장소 상태 목록
export const LOCATION_PRESETS = [
  { value: "tbd", label: "장소 미정" },
  { value: "hongdae", label: "홍대 근처" },
  { value: "mapo", label: "마포·서대문" },
  { value: "custom", label: "직접 입력" },
] as const;

export type LocationPresetValue = (typeof LOCATION_PRESETS)[number]["value"];

// 한국어 요일
export const KO_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 예약 상태
export const BOOKING_STATUS = {
  CONFIRMED: "confirmed",
  CANCELED: "canceled",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
