"use client";

import { useMemo, useState } from "react";
import PublicSlotCard from "@/components/booking/PublicSlotCard";
import type { SlotWithCount } from "@/lib/types";

interface BookingCalendarProps {
  slots: SlotWithCount[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getMonthKey(dateString: string): string {
  return dateString.slice(0, 7);
}

function getDateParts(dateString: string) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return {
    year,
    month,
    day,
  };
}

function formatSelectedDate(dateString: string): string {
  const { year, month, day } =
    getDateParts(dateString);

  const date = new Date(
    year,
    month - 1,
    day
  );

  const weekday = WEEKDAYS[date.getDay()];

  return `${month}월 ${day}일 ${weekday}요일`;
}

export default function BookingCalendar({
  slots,
}: BookingCalendarProps) {
  /*
   * 첫 화면에서는 예약 가능한 가장 가까운 날짜를 선택합니다.
   * 모든 일정이 마감됐다면 가장 가까운 일정 날짜를 선택합니다.
   */
  const initialSlot =
    slots.find((slot) => !slot.is_full) ??
    slots[0];

  const initialDate = initialSlot.date;

  const initialParts =
    getDateParts(initialDate);

  const [visibleYear, setVisibleYear] =
    useState(initialParts.year);

  const [visibleMonth, setVisibleMonth] =
    useState(initialParts.month);

  const [selectedDate, setSelectedDate] =
    useState(initialDate);

  /*
   * 날짜별 일정을 묶습니다.
   * 같은 날짜에 일정이 여러 개 있어도 대응할 수 있습니다.
   */
  const slotsByDate = useMemo(() => {
    const map = new Map<
      string,
      SlotWithCount[]
    >();

    slots.forEach((slot) => {
      const current =
        map.get(slot.date) ?? [];

      current.push(slot);

      map.set(slot.date, current);
    });

    return map;
  }, [slots]);

  const selectedSlots =
    slotsByDate.get(selectedDate) ?? [];

  const currentMonthKey = `${visibleYear}-${String(
    visibleMonth
  ).padStart(2, "0")}`;

  const hasSlotsInCurrentMonth =
    slots.some(
      (slot) =>
        getMonthKey(slot.date) ===
        currentMonthKey
    );

  /*
   * 현재 보이는 월의 달력 셀을 만듭니다.
   * 이전 달과 다음 달 날짜도 흐리게 함께 표시합니다.
   */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      visibleYear,
      visibleMonth - 1,
      1
    );

    const firstWeekday =
      firstDay.getDay();

    const daysInMonth = new Date(
      visibleYear,
      visibleMonth,
      0
    ).getDate();

    const daysInPreviousMonth =
      new Date(
        visibleYear,
        visibleMonth - 1,
        0
      ).getDate();

    const totalCells = 42;

    return Array.from(
      { length: totalCells },
      (_, index) => {
        const dayOffset =
          index - firstWeekday + 1;

        if (dayOffset < 1) {
          const day =
            daysInPreviousMonth +
            dayOffset;

          const previousMonthDate =
            new Date(
              visibleYear,
              visibleMonth - 2,
              day
            );

          return {
            date: formatDateKey(
              previousMonthDate
            ),
            day,
            isCurrentMonth: false,
          };
        }

        if (
          dayOffset > daysInMonth
        ) {
          const day =
            dayOffset - daysInMonth;

          const nextMonthDate =
            new Date(
              visibleYear,
              visibleMonth,
              day
            );

          return {
            date: formatDateKey(
              nextMonthDate
            ),
            day,
            isCurrentMonth: false,
          };
        }

        const currentDate = new Date(
          visibleYear,
          visibleMonth - 1,
          dayOffset
        );

        return {
          date: formatDateKey(
            currentDate
          ),
          day: dayOffset,
          isCurrentMonth: true,
        };
      }
    );
  }, [visibleYear, visibleMonth]);

  function formatDateKey(
    date: Date
  ): string {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function moveMonth(
    direction: -1 | 1
  ) {
    const nextDate = new Date(
      visibleYear,
      visibleMonth - 1 + direction,
      1
    );

    const nextYear =
      nextDate.getFullYear();

    const nextMonth =
      nextDate.getMonth() + 1;

    setVisibleYear(nextYear);
    setVisibleMonth(nextMonth);

    const nextMonthKey = `${nextYear}-${String(
      nextMonth
    ).padStart(2, "0")}`;

    /*
     * 이동한 월에 일정이 있으면
     * 가장 가까운 예약 가능 날짜를 자동 선택합니다.
     */
    const nextMonthSlots =
      slots.filter(
        (slot) =>
          getMonthKey(slot.date) ===
          nextMonthKey
      );

    const nextSelectedSlot =
      nextMonthSlots.find(
        (slot) => !slot.is_full
      ) ?? nextMonthSlots[0];

    if (nextSelectedSlot) {
      setSelectedDate(
        nextSelectedSlot.date
      );
    }
  }

  function handleDateClick(
    dateString: string
  ) {
    if (!slotsByDate.has(dateString)) {
      return;
    }

    setSelectedDate(dateString);
  }

  function getDateStatus(
    dateString: string
  ):
    | "available"
    | "full"
    | "mixed"
    | null {
    const dateSlots =
      slotsByDate.get(dateString);

    if (
      !dateSlots ||
      dateSlots.length === 0
    ) {
      return null;
    }

    const availableCount =
      dateSlots.filter(
        (slot) => !slot.is_full
      ).length;

    const fullCount =
      dateSlots.filter(
        (slot) => slot.is_full
      ).length;

    if (
      availableCount > 0 &&
      fullCount > 0
    ) {
      return "mixed";
    }

    if (availableCount > 0) {
      return "available";
    }

    return "full";
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 캘린더 */}
      <section className="w-full">
        {/* 월 이동 */}
        <div className="flex items-center justify-between px-1 mb-5">
          <button
            type="button"
            onClick={() =>
              moveMonth(-1)
            }
            aria-label="이전 달"
            className="w-10 h-10 flex items-center justify-center rounded-full text-warm-gray-500 active:bg-cream-200 transition-all"
          >
            ‹
          </button>

          <h2 className="text-lg font-bold text-warm-gray-800">
            {visibleYear}년{" "}
            {visibleMonth}월
          </h2>

          <button
            type="button"
            onClick={() =>
              moveMonth(1)
            }
            aria-label="다음 달"
            className="w-10 h-10 flex items-center justify-center rounded-full text-warm-gray-500 active:bg-cream-200 transition-all"
          >
            ›
          </button>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(
            (weekday, index) => (
              <div
                key={weekday}
                className={`text-center text-xs font-medium py-2 ${
                  index === 0
                    ? "text-red-400"
                    : index === 6
                      ? "text-blue-400"
                      : "text-warm-gray-400"
                }`}
              >
                {weekday}
              </div>
            )
          )}
        </div>

        {/* 날짜 */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map(
            ({
              date,
              day,
              isCurrentMonth,
            }) => {
              const status =
                getDateStatus(date);

              const isSelected =
                selectedDate === date;

              const weekday =
                new Date(
                  `${date}T00:00:00`
                ).getDay();

              const isClickable =
                status !== null;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() =>
                    handleDateClick(date)
                  }
                  disabled={!isClickable}
                  className={`relative min-h-[52px] rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? "bg-peach-100 text-peach-500"
                      : isClickable
                        ? "active:bg-cream-200"
                        : ""
                  } ${
                    !isCurrentMonth
                      ? "opacity-30"
                      : ""
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? "text-peach-500"
                        : weekday === 0
                          ? "text-red-400"
                          : weekday === 6
                            ? "text-blue-400"
                            : isClickable
                              ? "text-warm-gray-700"
                              : "text-warm-gray-300"
                    }`}
                  >
                    {day}
                  </span>

                  {/* 날짜 상태 점 */}
                  {status && (
                    <span
                      className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${
                        status ===
                        "available"
                          ? "bg-green-400"
                          : status ===
                              "full"
                            ? "bg-red-400"
                            : "bg-amber-400"
                      }`}
                    />
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-warm-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            예약 가능
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            마감
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            여러 일정
          </div>
        </div>
      </section>

      {/* 선택 날짜 일정 */}
      <section>
        {selectedSlots.length >
        0 ? (
          <div
            key={selectedDate}
            className="flex flex-col gap-3 slide-up"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-warm-gray-800">
                {formatSelectedDate(
                  selectedDate
                )}
              </h3>

              {selectedSlots.length >
                1 && (
                <span className="text-xs text-warm-gray-400">
                  일정{" "}
                  {
                    selectedSlots.length
                  }
                  개
                </span>
              )}
            </div>

            {selectedSlots.map(
              (slot) => (
                <PublicSlotCard
                  key={slot.id}
                  slot={slot}
                />
              )
            )}
          </div>
        ) : hasSlotsInCurrentMonth ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">
              📅
            </p>

            <p className="text-sm font-medium text-warm-gray-600">
              일정이 있는 날짜를
              선택해주세요
            </p>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">
              🌙
            </p>

            <p className="text-sm font-medium text-warm-gray-600">
              이 달에는 열려 있는
              일정이 없어요
            </p>

            <p className="text-xs text-warm-gray-400 mt-2">
              다른 달을 확인해주세요
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
