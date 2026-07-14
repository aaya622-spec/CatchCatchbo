import { KO_WEEKDAYS, MEETING_TYPES, LOCATION_PRESETS } from "./constants";

// 날짜를 한국어 형식으로 변환 (예: "7월 18일 토요일")
// YYYY-MM-DD 문자열을 Date로 변환하지 않고 직접 분리해서
// 서버 시간대와 관계없이 입력한 날짜 그대로 표시
export function formatKoreanDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);

  const weekdayIndex = new Date(
    Date.UTC(year, month - 1, day)
  ).getUTCDay();

  const weekday = KO_WEEKDAYS[weekdayIndex];

  return `${month}월 ${day}일 ${weekday}요일`;
}

// 시간 형식 변환 (HH:MM → 오전/오후 H:MM)
export function formatKoreanTime(timeStr: string): string {
  const [hourStr, minute = "00"] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);

  if (hour < 12) {
    return `오전 ${hour}:${minute}`;
  }

  if (hour === 12) {
    return `오후 12:${minute}`;
  }

  return `오후 ${hour - 12}:${minute}`;
}

// 시간 범위 문자열
export function formatTimeRange(
  startTime: string,
  endTime: string
): string {
  return `${formatKoreanTime(startTime)} – ${formatKoreanTime(endTime)}`;
}

// 약속 유형 label 반환
export function getMeetingTypeLabel(value: string): string {
  return MEETING_TYPES.find((type) => type.value === value)?.label ?? value;
}

// 장소 label 반환
export function getLocationLabel(locationText: string): string {
  const preset = LOCATION_PRESETS.find(
    (item) => item.value === locationText
  );

  return preset ? preset.label : locationText;
}

// 오늘 날짜를 한국 시간 기준 YYYY-MM-DD로 반환
export function getTodayKST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// 날짜가 오늘 이후인지 확인
export function isFutureOrToday(dateStr: string): boolean {
  return dateStr >= getTodayKST();
}

// 클래스 이름 결합 유틸
export function cn(
  ...classes: (string | undefined | false | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}
