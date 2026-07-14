import { KO_WEEKDAYS, MEETING_TYPES, LOCATION_PRESETS } from "./constants";

// 날짜를 한국어 형식으로 변환 (예: "7월 18일 토요일")
export function formatKoreanDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00+09:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = KO_WEEKDAYS[date.getDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

// 시간 형식 변환 (HH:MM → 오전/오후 H:MM)
export function formatKoreanTime(timeStr: string): string {
  const [hourStr, minute] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (hour < 12) {
    return `오전 ${hour}:${minute}`;
  } else if (hour === 12) {
    return `오후 12:${minute}`;
  } else {
    return `오후 ${hour - 12}:${minute}`;
  }
}

// 시간 범위 문자열
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatKoreanTime(startTime)} – ${formatKoreanTime(endTime)}`;
}

// 약속 유형 label 반환
export function getMeetingTypeLabel(value: string): string {
  return MEETING_TYPES.find((t) => t.value === value)?.label ?? value;
}

// 장소 label 반환
export function getLocationLabel(locationText: string): string {
  const preset = LOCATION_PRESETS.find((p) => p.value === locationText);
  return preset ? preset.label : locationText;
}

// 오늘 날짜를 KST 기준 YYYY-MM-DD 반환
export function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

// 날짜가 오늘 이후인지 확인 (KST)
export function isFutureOrToday(dateStr: string): boolean {
  return dateStr >= getTodayKST();
}

// 클래스 이름 결합 유틸
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
