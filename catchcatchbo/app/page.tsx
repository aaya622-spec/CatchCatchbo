import { redirect } from "next/navigation";

// 루트 접속 시 공개 예약 페이지로 이동
export default function RootPage() {
  redirect("/book");
}
