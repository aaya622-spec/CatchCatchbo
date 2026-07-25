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

          {/* 텍스트 */}
          <div
            <div
  className={`absolute left-10 top-6 z-10 flex flex-col max-w-[62%] ${
    isLightText
      ? "text-white"
      : "text-warm-gray-800"
  }`}
>
  <p className="text-[12px] font-medium opacity-70 leading-none">
    {getMeetingTypeLabel(
      currentSlot.meeting_type
    )}
  </p>

  <p className="text-[18px] font-bold leading-[1.25] mt-3">
    {currentSlot.title ??
      "이번엔 이날 만날래요?"}
  </p>

  <p className="text-[12px] opacity-70 leading-none mt-3">
    {formatKoreanDate(
      currentSlot.date
    )}
  </p>
</div>
            <p className="text-[11px] font-medium opacity-70 mb-1">
              {getMeetingTypeLabel(
                currentSlot.meeting_type
              )}
            </p>

            <p className="text-base font-bold leading-snug">
              {currentSlot.title ??
                "이번엔 이날 만날래요?"}
            </p>

            <p className="text-[11px] opacity-70 mt-1.5">
              {formatKoreanDate(
                currentSlot.date
              )}
            </p>
          </div>
        </div>
      </Link>

      {/* 페이지 인디케이터 */}
      {bannerSlots.length >
        1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {bannerSlots.map(
            (slot, index) => (
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
                  index ===
                  currentIndex
                    ? "w-4 bg-warm-gray-600"
                    : "w-1.5 bg-warm-gray-300"
                }`}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}
