"use client";

import {
  useMemo,
  useState,
} from "react";
import PublicSlotCard from "@/components/booking/PublicSlotCard";
import type {
  SlotWithCount,
} from "@/lib/types";

interface BookingCalendarProps {
  slots: SlotWithCount[];
}

const WEEKDAYS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
];

// ============================================================
// 날짜 유틸
// ============================================================

function getDateParts(
  dateString: string
) {
  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  return {
    year,
    month,
    day,
  };
}

function formatDateKey(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSelectedDate(
  dateString: string
): string {
  const {
    year,
    month,
    day,
  } =
    getDateParts(
      dateString
    );

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  const weekday =
    WEEKDAYS[
      date.getDay()
    ];

  return `${month}월 ${day}일 ${weekday}요일`;
}

/*
 * 시작일 ~ 종료일 사이의
 * 모든 날짜를 반환합니다.
 *
 * 예:
 * 2026-09-05 ~ 2026-09-07
 *
 * [
 *   "2026-09-05",
 *   "2026-09-06",
 *   "2026-09-07"
 * ]
 */
function getDatesInRange(
  startDate: string,
  endDate: string
): string[] {
  const startParts =
    getDateParts(
      startDate
    );

  const endParts =
    getDateParts(
      endDate
    );

  const current =
    new Date(
      startParts.year,
      startParts.month - 1,
      startParts.day
    );

  const end =
    new Date(
      endParts.year,
      endParts.month - 1,
      endParts.day
    );

  const dates:
    string[] = [];

  while (
    current <= end
  ) {
    dates.push(
      formatDateKey(
        current
      )
    );

    current.setDate(
      current.getDate() +
        1
    );
  }

  return dates;
}

// ============================================================
// BookingCalendar
// ============================================================

export default function BookingCalendar({
  slots,
}: BookingCalendarProps) {
  /*
   * 첫 화면에서는
   * 가장 가까운 예약 가능 일정.
   *
   * 전부 마감이면
   * 가장 가까운 일정.
   */
  const initialSlot =
    slots.find(
      (slot) =>
        !slot.is_full
    ) ??
    slots[0];

  const initialDate =
    initialSlot.date;

  const initialParts =
    getDateParts(
      initialDate
    );

  const [
    visibleYear,
    setVisibleYear,
  ] =
    useState(
      initialParts.year
    );

  const [
    visibleMonth,
    setVisibleMonth,
  ] =
    useState(
      initialParts.month
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      initialDate
    );

  // ============================================================
  // 날짜별 일정
  // ============================================================

  /*
   * 기존:
   *
   * slot.date에만 일정을 연결
   *
   * 변경:
   *
   * slot.date ~ slot.end_date
   * 모든 날짜에 같은 일정을 연결
   */
  const slotsByDate =
    useMemo(() => {
      const map =
        new Map<
          string,
          SlotWithCount[]
        >();

      slots.forEach(
        (slot) => {
          const startDate =
            slot.date;

          const endDate =
            slot.end_date ??
            slot.date;

          const range =
            getDatesInRange(
              startDate,
              endDate
            );

          range.forEach(
            (date) => {
              const current =
                map.get(
                  date
                ) ?? [];

              /*
               * 같은 슬롯이 중복으로
               * 들어가지 않도록 방어
               */
              if (
                !current.some(
                  (item) =>
                    item.id ===
                    slot.id
                )
              ) {
                current.push(
                  slot
                );
              }

              map.set(
                date,
                current
              );
            }
          );
        }
      );

      return map;
    }, [slots]);

  const selectedSlots =
    slotsByDate.get(
      selectedDate
    ) ?? [];

  // ============================================================
  // 현재 월
  // ============================================================

  const currentMonthKey =
    `${visibleYear}-${String(
      visibleMonth
    ).padStart(
      2,
      "0"
    )}`;

  /*
   * 시작일이 이 달에 있는지만 보는 게 아니라
   * 기간 일정이 이 달에 걸쳐 있어도 true.
   */
  const hasSlotsInCurrentMonth =
    useMemo(() => {
      for (
        const date
        of slotsByDate.keys()
      ) {
        if (
          date.startsWith(
            currentMonthKey
          )
        ) {
          return true;
        }
      }

      return false;
    }, [
      slotsByDate,
      currentMonthKey,
    ]);

  // ============================================================
  // 달력 셀
  // ============================================================

  const calendarDays =
    useMemo(() => {
      const firstDay =
        new Date(
          visibleYear,
          visibleMonth - 1,
          1
        );

      const firstWeekday =
        firstDay.getDay();

      const daysInMonth =
        new Date(
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

      const totalCells =
        42;

      return Array.from(
        {
          length:
            totalCells,
        },
        (
          _,
          index
        ) => {
          const dayOffset =
            index -
            firstWeekday +
            1;

          // 이전 달
          if (
            dayOffset <
            1
          ) {
            const day =
              daysInPreviousMonth +
              dayOffset;

            const previousMonthDate =
              new Date(
                visibleYear,
                visibleMonth -
                  2,
                day
              );

            return {
              date:
                formatDateKey(
                  previousMonthDate
                ),

              day,

              isCurrentMonth:
                false,
            };
          }

          // 다음 달
          if (
            dayOffset >
            daysInMonth
          ) {
            const day =
              dayOffset -
              daysInMonth;

            const nextMonthDate =
              new Date(
                visibleYear,
                visibleMonth,
                day
              );

            return {
              date:
                formatDateKey(
                  nextMonthDate
                ),

              day,

              isCurrentMonth:
                false,
            };
          }

          // 현재 달
          const currentDate =
            new Date(
              visibleYear,
              visibleMonth -
                1,
              dayOffset
            );

          return {
            date:
              formatDateKey(
                currentDate
              ),

            day:
              dayOffset,

            isCurrentMonth:
              true,
          };
        }
      );
    }, [
      visibleYear,
      visibleMonth,
    ]);

  // ============================================================
  // 월 이동
  // ============================================================

  function moveMonth(
    direction:
      -1 | 1
  ) {
    const nextDate =
      new Date(
        visibleYear,
        visibleMonth -
          1 +
          direction,
        1
      );

    const nextYear =
      nextDate.getFullYear();

    const nextMonth =
      nextDate.getMonth() +
      1;

    setVisibleYear(
      nextYear
    );

    setVisibleMonth(
      nextMonth
    );

    const nextMonthKey =
      `${nextYear}-${String(
        nextMonth
      ).padStart(
        2,
        "0"
      )}`;

    /*
     * 해당 월에 존재하는
     * 모든 일정 날짜를 가져옴.
     *
     * 기간 일정의 중간 날짜도 포함.
     */
    const datesInNextMonth =
      Array.from(
        slotsByDate.keys()
      )
        .filter(
          (date) =>
            date.startsWith(
              nextMonthKey
            )
        )
        .sort();

    if (
      datesInNextMonth.length ===
      0
    ) {
      return;
    }

    /*
     * 우선 예약 가능한 날짜 탐색
     */
    const availableDate =
      datesInNextMonth.find(
        (date) => {
          const dateSlots =
            slotsByDate.get(
              date
            ) ?? [];

          return dateSlots.some(
            (slot) =>
              !slot.is_full
          );
        }
      );

    setSelectedDate(
      availableDate ??
        datesInNextMonth[0]
    );
  }

  // ============================================================
  // 날짜 클릭
  // ============================================================

  function handleDateClick(
    dateString: string
  ) {
    if (
      !slotsByDate.has(
        dateString
      )
    ) {
      return;
    }

    setSelectedDate(
      dateString
    );
  }

  // ============================================================
  // 날짜 상태
  // ============================================================

  function getDateStatus(
    dateString: string
  ):
    | "available"
    | "full"
    | "mixed"
    | null {
    const dateSlots =
      slotsByDate.get(
        dateString
      );

    if (
      !dateSlots ||
      dateSlots.length ===
        0
    ) {
      return null;
    }

    const availableCount =
      dateSlots.filter(
        (slot) =>
          !slot.is_full
      ).length;

    const fullCount =
      dateSlots.filter(
        (slot) =>
          slot.is_full
      ).length;

    if (
      availableCount >
        0 &&
      fullCount > 0
    ) {
      return "mixed";
    }

    if (
      availableCount >
      0
    ) {
      return "available";
    }

    return "full";
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="flex flex-col gap-6">
      {/* 캘린더 */}

      <section className="w-full">
        {/* 월 이동 */}

        <div className="flex items-center justify-between px-1 mb-5">
          <button
            type="button"
            onClick={() =>
              moveMonth(
                -1
              )
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
              moveMonth(
                1
              )
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
            (
              weekday,
              index
            ) => (
              <div
                key={
                  weekday
                }
                className={`text-center text-xs font-medium py-2 ${
                  index === 0
                    ? "text-red-400"
                    : index ===
                        6
                      ? "text-blue-400"
                      : "text-warm-gray-400"
                }`}
              >
                {
                  weekday
                }
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
                getDateStatus(
                  date
                );

              const isSelected =
                selectedDate ===
                date;

              const {
                year,
                month,
                day:
                  dateDay,
              } =
                getDateParts(
                  date
                );

              const weekday =
                new Date(
                  year,
                  month -
                    1,
                  dateDay
                ).getDay();

              const isClickable =
                status !==
                null;

              return (
                <button
                  key={
                    date
                  }
                  type="button"
                  onClick={() =>
                    handleDateClick(
                      date
                    )
                  }
                  disabled={
                    !isClickable
                  }
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
                        : weekday ===
                            0
                          ? "text-red-400"
                          : weekday ===
                              6
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
            key={
              selectedDate
            }
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
                  key={
                    slot.id
                  }
                  slot={
                    slot
                  }
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
              다른 달을
              확인해주세요
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
