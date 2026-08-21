import Link from "next/link";

interface ManageBookingPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ManageBookingPage({
  params,
}: ManageBookingPageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen px-5 py-10">
      <div className="card p-6">
        <p className="text-3xl mb-4">
          🗓️
        </p>

        <h1 className="text-xl font-bold text-warm-gray-800">
          내 예약 관리
        </h1>

        <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
          예약 정보를 불러오는 기능을
          준비하고 있어요.
        </p>

        <p className="text-xs text-warm-gray-300 mt-4 break-all">
          관리 토큰: {token}
        </p>

        <Link
          href="/book"
          className="btn-secondary w-full text-center mt-6"
        >
          예약 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
}
