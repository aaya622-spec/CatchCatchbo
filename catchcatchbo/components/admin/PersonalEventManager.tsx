"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  savePersonalEvent,
  deletePersonalEvent,
  syncPersonalEvent,
} from "@/lib/actions/personalEvents";
import type { PersonalEvent } from "@/lib/personal-events";
import { getTodayKST } from "@/lib/utils";

export default function PersonalEventManager({
  events,
}: {
  events: PersonalEvent[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PersonalEvent | "new" | null>(null);
  const [allDay, setAllDay] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;
  function open(event: PersonalEvent | "new") {
    setEditing(event);
    setAllDay(event === "new" ? true : event.all_day);
    setError("");
  }
  return (
    <section className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-warm-gray-700">🟣 개인 일정</h3>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={pending}
          onClick={() => open("new")}
        >
          + 개인 일정
        </button>
      </div>
      <p className="text-xs text-warm-gray-500">
        제목과 메모가 친구들에게도 보여요. 저장·수정·삭제하면 연결된 Google Calendar에도 반영돼요.
      </p>
      {events.length > 0 && (
        <button type="button" className="btn-secondary text-sm" disabled={pending}
          onClick={() => {
            setError(""); setNotice("");
            start(async () => {
              let succeeded = 0;
              const failed: string[] = [];
              for (const event of events) {
                setNotice(`캘린더 연동 중… ${succeeded + failed.length + 1}/${events.length}`);
                try {
                  const result = await syncPersonalEvent(event.id);
                  if (result.success) succeeded++;
                  else failed.push(`${event.title}: ${result.error || "연동 실패"}`);
                } catch { failed.push(`${event.title}: 연결을 확인해주세요.`); }
              }
              setNotice(`${succeeded}개 일정의 캘린더 연동을 완료했어요.`);
              if (failed.length) setError(failed.join("\n"));
            });
          }}>
          {pending ? "처리 중…" : "기존 개인 일정 전체 캘린더 연동"}
        </button>
      )}
      {notice && <p role="status" className="text-sm text-warm-gray-700 whitespace-pre-wrap">{notice}</p>}
      {editing && (
        <form
          key={current?.id || "new"}
          className="card p-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError("");
            setNotice("");
            start(async () => {
              try {
                const r = await savePersonalEvent(current?.id || null, form);
                if (!r.success) {
                  setError(r.error || "저장 실패");
                  return;
                }
                setEditing(null);
                setNotice(r.data?.warning || "개인 일정을 저장하고 Google Calendar에도 반영했어요.");
                router.refresh();
              } catch {
                setError("연결에 실패했어요. 다시 시도해주세요.");
              }
            });
          }}
        >
          <label>
            일정 제목
            <input
              className="input-base w-full"
              name="title"
              required
              maxLength={80}
              defaultValue={current?.title}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              시작일
              <input
                className="input-base w-full"
                type="date"
                name="date"
                required
                defaultValue={current?.date || getTodayKST()}
              />
            </label>
            <label>
              종료일
              <input
                className="input-base w-full"
                type="date"
                name="end_date"
                required
                defaultValue={current?.end_date || getTodayKST()}
              />
            </label>
          </div>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              name="all_day"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            종일
          </label>
          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <label>
                시작 시간
                <input
                  className="input-base w-full"
                  type="time"
                  name="start_time"
                  required
                  defaultValue={current?.start_time.slice(0, 5) || "09:00"}
                />
              </label>
              <label>
                종료 시간
                <input
                  className="input-base w-full"
                  type="time"
                  name="end_time"
                  required
                  defaultValue={current?.end_time.slice(0, 5) || "18:00"}
                />
              </label>
            </div>
          )}
          <label>
            메모
            <textarea
              className="input-base w-full"
              name="note"
              maxLength={2000}
              defaultValue={current?.note || ""}
            />
          </label>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => setEditing(null)}
            >
              닫기
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500 whitespace-pre-wrap">
          {error}
        </p>
      )}
      {!events.length && (
        <p className="card p-4 text-sm text-warm-gray-400">
          등록한 개인 일정이 없어요.
        </p>
      )}
      {events.map((e) => (
        <div key={e.id} className="card p-4 border-l-4 border-purple-300">
          <p className="font-semibold">{e.title}</p>
          <p className="text-sm text-warm-gray-500">
            {e.date} ~ {e.end_date} ·{" "}
            {e.all_day
              ? "종일"
              : `${e.start_time.slice(0, 5)} ~ ${e.end_time.slice(0, 5)}`}
          </p>
          {e.note && (
            <p className="text-sm whitespace-pre-wrap mt-2">{e.note}</p>
          )}
          <div className="flex gap-4 mt-3">
            <button
              type="button"
              disabled={pending}
              className="text-sm text-purple-600"
              onClick={() => open(e)}
            >
              수정
            </button>
            <button type="button" disabled={pending} className="text-sm text-purple-600"
              onClick={() => {
                setError(""); setNotice("");
                start(async () => {
                  try {
                    const result = await syncPersonalEvent(e.id);
                    if (!result.success) setError(result.error || "연동 실패");
                    else setNotice(`‘${e.title}’ 일정을 Google Calendar에 반영했어요.`);
                  } catch { setError("연결에 실패했어요. 다시 연동해주세요."); }
                });
              }}>캘린더 연동</button>
            <button
              type="button"
              disabled={pending}
              className="text-sm text-red-500 whitespace-pre-wrap"
              onClick={() => {
                if (!confirm(`‘${e.title}’ 일정을 삭제할까요?`)) return;
                setError("");
                start(async () => {
                  try {
                    const r = await deletePersonalEvent(e.id);
                    if (!r.success) setError(r.error || "삭제 실패");
                    else {
                      setNotice("개인 일정을 앱과 Google Calendar에서 삭제했어요.");
                      router.refresh();
                    }
                  } catch {
                    setError("연결에 실패했어요.");
                  }
                });
              }}
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
