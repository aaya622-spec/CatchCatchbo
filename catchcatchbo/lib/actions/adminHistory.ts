"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type {
  ActionResult,
} from "@/lib/types";

// ============================================================
// 관리자 인증 확인
// ============================================================

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}

// ============================================================
// 거절된 날짜 제안 선택 삭제
// ============================================================

export async function deleteRejectedProposals(
  proposalIds: string[]
): Promise<ActionResult> {
  const user =
    await requireAdmin();

  if (!user) {
    return {
      success: false,
      error:
        "로그인이 필요해요.",
    };
  }

  const ids =
    Array.from(
      new Set(
        proposalIds.filter(
          Boolean
        )
      )
    );

  if (
    ids.length === 0
  ) {
    return {
      success: false,
      error:
        "삭제할 제안을 선택해주세요.",
    };
  }

  const adminSupabase =
    createAdminClient();

  /*
   * rejected 상태만 삭제합니다.
   *
   * accepted / pending 제안이
   * 실수로 전달되어도 삭제되지 않습니다.
   */
  const {
    error,
  } = await adminSupabase
    .from(
      "date_proposals"
    )
    .delete()
    .in(
      "id",
      ids
    )
    .eq(
      "status",
      "rejected"
    );

  if (error) {
    console.error(
      "deleteRejectedProposals error:",
      error
    );

    return {
      success: false,
      error:
        "거절된 제안을 삭제하지 못했어요.",
    };
  }

  revalidatePath(
    "/admin"
  );

  return {
    success: true,
  };
}

// ============================================================
// 취소된 예약 선택 삭제
// ============================================================

export async function deleteCanceledBookings(
  bookingIds: string[]
): Promise<ActionResult> {
  const user =
    await requireAdmin();

  if (!user) {
    return {
      success: false,
      error:
        "로그인이 필요해요.",
    };
  }

  const ids =
    Array.from(
      new Set(
        bookingIds.filter(
          Boolean
        )
      )
    );

  if (
    ids.length === 0
  ) {
    return {
      success: false,
      error:
        "삭제할 예약을 선택해주세요.",
    };
  }

  const adminSupabase =
    createAdminClient();

  /*
   * canceled 상태만 삭제합니다.
   *
   * pending / confirmed 예약은
   * 실수로 선택되어도 삭제되지 않습니다.
   */
  const {
    error,
  } = await adminSupabase
    .from(
      "bookings"
    )
    .delete()
    .in(
      "id",
      ids
    )
    .eq(
      "status",
      "canceled"
    );

  if (error) {
    console.error(
      "deleteCanceledBookings error:",
      error
    );

    return {
      success: false,
      error:
        "취소된 예약을 삭제하지 못했어요.",
    };
  }

  revalidatePath(
    "/admin"
  );

  return {
    success: true,
  };
}
