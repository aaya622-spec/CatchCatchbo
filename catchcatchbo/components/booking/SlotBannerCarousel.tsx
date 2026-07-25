"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
} from "@/lib/utils";
import type {
  SlotWithCount,
} from "@/lib/types";

interface SlotBannerCarouselProps {
  slots: SlotWithCount[];
}

export default function SlotBannerCarousel({
  slots,
}: SlotBannerCarouselProps) {
  const bannerSlots =
    slots.filter(
      (slot) =>
        slot.image_url &&
        slot.is_active &&
        !slot.is_full
    );

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  // ============================================================
  // 자동 롤링
  // ============================================================

  useEffect(() => {
    if (
      bannerSlots.length <= 1
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setCurrentIndex(
            (current) =>
              (current + 1) %
              bannerSlots.length
          );
        },
        4500
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [bannerSlots.length]);

  // 이미지가 있는 일정이 없으면 숨김
  if (
    bannerSlots.length === 0
  ) {
    return null;
  }

  const currentSlot =
    bannerSlots[
      currentIndex
    ];

  const isLightText =
    currentSlot.image_text_color ===
    "light";

  return (
    <section className="mb-7">
      <Link
        href={`/book/${currentSlot.id}`}
        className="block"
      >
        {/* ================================================== */}
        {/* 배너 */}
        {/* ================================================== */}

        <div className="relative w-full aspect-[4/1] overflow-hidden rounded-2xl bg-cream-200">
          {/* 이미지 */}
          <img
            src={
              currentSlot.image_url!
            }
            alt={
              currentSlot.title ??
              "추천 약속"
            }
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition:
                currentSlot.image_position ??
                "center",
            }}
          />

          {/* ================================================== */}
          {/* 텍스트 */}
          {/* 세로 중앙 정렬 — 화면 크기가 달라도 잘리지 않음 */}
          {/* ================================================== */}

          <div
            className={`absolute left-[28px] top-1/2 -translate-y-1/2 z-10 flex flex-col w-[55%] ${
              isLightText
                ? "text-white"
                : "text-warm-gray-800"
            }`}
          >
            {/* 약속 유형 */}
            <p className="text-[11px] leading-[1] font-medium opacity-60">
              {getMeetingTypeLabel(
                currentSlot.meeting_type
              )}
            </p>

            {/* 약속 제목 */}
            <p className="mt-[8px] text-[17px] leading-[1.2] font-bold tracking-[-0.02em] line-clamp-2">
              {currentSlot.title ??
                "이번엔 이날 만날래요?"}
            </p>

            {/* 날짜 */}
            <p className="mt-[8px] text-[11px] leading-[1] font-medium opacity-60">
              {formatKoreanDate(
                currentSlot.date
              )}
            </p>
          </div>
        </div>
      </Link>

      {/* ================================================== */}
      {/* 페이지 인디케이터 */}
      {/* ================================================== */}

      {bannerSlots.length >
        1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {bannerSlots.map(
            (slot, index) => {
              const isCurrent =
                index ===
                currentIndex;

              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-label={`배너 ${
                    index + 1
                  }`}
                  onClick={() =>
                    setCurrentIndex(
                      index
                    )
                  }
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? "w-4 bg-warm-gray-600"
                      : "w-1.5 bg-warm-gray-300"
                  }`}
                />
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
