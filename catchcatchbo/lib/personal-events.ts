import type { SlotWithCount } from "@/lib/types";

export interface PersonalEvent {
  id: string;
  owner_id: string;
  title: string;
  note: string | null;
  date: string;
  end_date: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
  created_at: string;
}

// 날짜/시간은 모두 한국 시간. 끝 시각과 다음 시작 시각이 같으면 겹치지 않습니다.
export function period(
  date: string,
  endDate: string,
  start: string,
  end: string,
  allDay = false,
): [number, number] {
  const first = Date.parse(
    `${date}T${allDay ? "00:00:00" : start.slice(0, 5) + ":00"}+09:00`,
  );
  const last =
    allDay || end.slice(0, 5) === "23:59"
      ? Date.parse(`${endDate}T00:00:00+09:00`) + 86400000
      : Date.parse(`${endDate}T${end.slice(0, 5)}:00+09:00`);
  return [first, last];
}
export function overlaps(a: [number, number], b: [number, number]) {
  return a[0] < b[1] && b[0] < a[1];
}
export function personalBlocksSlot(event: PersonalEvent, slot: SlotWithCount) {
  return (
    event.owner_id === slot.owner_id &&
    overlaps(
      period(
        event.date,
        event.end_date,
        event.start_time,
        event.end_time,
        event.all_day,
      ),
      period(
        slot.date,
        slot.end_date || slot.date,
        slot.start_time,
        slot.end_time,
      ),
    )
  );
}
export function personalAsSlot(e: PersonalEvent): SlotWithCount {
  return {
    id: `personal-${e.id}`,
    owner_id: e.owner_id,
    date: e.date,
    end_date: e.end_date,
    start_time: e.start_time,
    end_time: e.end_time,
    title: e.title,
    description: e.note,
    meeting_type: "personal",
    location_text: "tbd",
    image_url: null,
    image_position: "center",
    image_text_color: "dark",
    max_guests: 0,
    is_active: true,
    created_at: e.created_at,
    updated_at: e.created_at,
    booking_count: 0,
    remaining: 0,
    is_full: true,
    personal_event: true,
    all_day: e.all_day,
  };
}
