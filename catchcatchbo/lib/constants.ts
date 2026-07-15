// ============================================================
// 서비스 기본 설정 (텍스트 상수)
// 서비스 이름, 문구를 변경하려면 이 파일만 수정하면 됩니다.
// ============================================================

export const APP_NAME = "캐치캐치보";
export const APP_TAGLINE = "편한 날 하나 골라주세요";

// 공개 예약 페이지 상단 문구
export const BOOKING_PAGE_GREETING =
  "이번 달 약속 가능한 날을 열어뒀어요.";

export const BOOKING_PAGE_SUB =
  "편한 날 하나 골라주세요.\n장소는 나중에 같이 정해요!";

// 예약 신청 완료 메시지
export const BOOKING_COMPLETE_TITLE =
  "예약 신청이 완료됐어요!";

export const BOOKING_COMPLETE_SUB =
  "관리자가 확인 후 확정하면 따로 알려드릴게요.";

// 공유 문구
export const SHARE_MESSAGE =
  "너랑 시간 맞추려고 가능한 날만 모아봤어.😊 편한 날 하나 골라주면 그날로 약속!";

// 예약 버튼
export const BOOKING_BUTTON_TEXT =
  "예약 신청하기";

// 약속 유형 추천 목록
// 실제 DB에는 아래 value 또는 직접 입력한 문구가 meeting_type으로 저장됩니다.
export const MEETING_TYPES = [
  { value: "dinner", label: "저녁" },
  { value: "cafe", label: "카페" },
  { value: "drink", label: "술" },
  { value: "exhibition", label: "전시" },
  { value: "exercise", label: "운동" },
  { value: "travel", label: "여행" },
  { value: "hangout", label: "그냥 만나기" },
  { value: "custom", label: "직접 입력" },
] as const;

export type MeetingTypePresetValue =
  (typeof MEETING_TYPES)[number]["value"];

// 장소 상태 목록
export const LOCATION_PRESETS = [
  { value: "tbd", label: "장소 미정" },
  { value: "hongdae", label: "홍대 근처" },
  { value: "mapo", label: "마포·서대문" },
  { value: "custom", label: "직접 입력" },
] as const;

export type LocationPresetValue =
  (typeof LOCATION_PRESETS)[number]["value"];

// 한국어 요일
export const KO_WEEKDAYS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;

// 예약 상태
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELED: "canceled",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
