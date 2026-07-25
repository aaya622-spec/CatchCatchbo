"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  resend,
  ADMIN_NOTIFICATION_EMAIL,
  RESEND_FROM_EMAIL,
} from "@/lib/mail/resend";
import {
  formatKoreanDate,
  getMeetingTypeLabel,
} from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export async function createProposal(
  formData: FormData
): Promise<ActionResult> {
  const guestName =
    (
      formData.get("guest_name") as string
    )?.trim();

  const guestContact =
    (
      formData.get("guest_contact") as string
    )?.trim() || null;

  const bookingTitle =
    (
      formData.get("booking_title") as string
    )?.trim();

  const proposedDate =
    (
      formData.get("proposed_date") as string
    )?.trim();

  const proposedTime =
    (
      formData.get("proposed_time") as string
    )?.trim() || null;

  const guestCount = Number(
    formData.get("guest_count") ?? 1
  );

  const meetingType =
    (
      formData.get("meeting_type") as string
    )?.trim();

  const note =
    (
      formData.get("note") as string
    )?.trim() || null;

  // 입력값 확인
  if (!guestName) {
    return {
      success: false,
      error: "이름을 입력해주세요.",
    };
  }

  if (guestName.length > 20) {
    return {
      success: false,
      error: "이름은 20자 이내로 입력해주세요.",
    };
  }

  if (!bookingTitle) {
    return {
      success: false,
      error: "약속 이름을 입력해주세요.",
    };
  }

  if (bookingTitle.length > 40) {
    return {
      success: false,
      error: "약속 이름은 40자 이내로 입력해주세요.",
    };
  }

  if (!proposedDate) {
    return {
      success: false,
      error: "희망 날짜를 선택해주세요.",
    };
  }

  const todayKST =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  if (proposedDate < todayKST) {
    return {
      success: false,
      error: "지난 날짜는 제안할 수 없어요.",
    };
  }

  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 4
  ) {
    return {
      success: false,
      error: "인원은 1명에서 4명까지 선택해주세요.",
    };
  }

  if (!meetingType) {
    return {
      success: false,
      error: "약속 유형을 선택해주세요.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("date_proposals")
    .insert({
      id: randomUUID(),
      guest_name: guestName,
      guest_contact: guestContact,
      proposed_date: proposedDate,
      proposed_time: proposedTime,
      booking_title: bookingTitle,
      guest_count: guestCount,
      meeting_type: meetingType,
      note,
      status: "pending",
    });

  if (error) {
    console.error(
      "createProposal error:",
      error
    );

    return {
      success: false,
      error:
        "날짜 제안 중 오류가 발생했어요. 다시 시도해주세요.",
    };
  }

  // 관리자에게 이메일 알림
  if (
    resend &&
    ADMIN_NOTIFICATION_EMAIL
  ) {
    const adminUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://catch-catchbo.vercel.app"
    }/admin`;

    const timeLabel =
      proposedTime || "시간 협의";

    const contactLabel =
      guestContact || "입력하지 않음";

    const noteLabel =
      note || "입력하지 않음";

    const subject =
      `[캐치캐치보] ${guestName}님의 날짜 제안`;

    const text = `새로운 날짜 제안이 들어왔어요.

신청자: ${guestName}
약속 이름: ${bookingTitle}
인원: ${guestCount}명
희망 날짜: ${formatKoreanDate(proposedDate)}
희망 시간: ${timeLabel}
약속 유형: ${getMeetingTypeLabel(meetingType)}
연락처: ${contactLabel}
메모: ${noteLabel}

관리자 페이지:
${adminUrl}`;

    const { error: mailError } =
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject,
        text,
      });

    if (mailError) {
      // 메일 실패 때문에 날짜 제안까지 실패시키지는 않음
      console.error(
        "Proposal email error:",
        mailError
      );
    }
  }

  revalidatePath("/admin");

  return {
    success: true,
  };
}
