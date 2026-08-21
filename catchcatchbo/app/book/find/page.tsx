import Link from "next/link";

export const metadata = {
  title: "내 예약 찾기",
};

export default function FindBookingPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* 상단 */}
      <header className="px-5 pt-8 pb-5">
        <Link
          href="/book"
          className="inline-flex items-center gap-2 text-sm text-warm-gray-500"
        >
          <span>←</span>
          <span>예약 페이지로 돌아가기</span>
        </Link>
      </header>

      <main className="px-5">
        <div className="mb-7">
          <div className="text-4xl mb-4">
            🔎
          </div>

          <h1 className="text-2xl font-bold text-warm-gray-800">
            내 예약 찾기
          </h1>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            예약할 때 입력한 이름과 연락처로
            <br />
            신청한 약속을 찾아볼 수 있어요.
          </p>
        </div>

        <form
          action="/book/find/result"
          method="GET"
          className="card p-5 flex flex-col gap-5"
        >
          {/* 이름 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-warm-gray-700"
            >
              이름
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={20}
              autoComplete="name"
              placeholder="홍길동"
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />
          </div>

          {/* 연락처 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contact"
              className="text-sm font-medium text-warm-gray-700"
            >
              연락처
            </label>

            <input
              id="contact"
              name="contact"
              type="tel"
              required
              maxLength={13}
              autoComplete="tel"
              inputMode="numeric"
              placeholder="01012345678"
              className="w-full rounded-2xl border border-warm-gray-200 bg-white px-4 py-3.5 text-sm text-warm-gray-700 outline-none transition-colors focus:border-peach-300"
            />

            <p className="text-xs text-warm-gray-400">
              예약할 때 입력한 연락처를 입력해주세요.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
          >
            내 예약 찾기
          </button>
        </form>

        <div className="mt-5 rounded-2xl bg-cream-100 px-4 py-4">
          <p className="text-xs text-warm-gray-400 leading-relaxed">
            예약 정보 확인을 위해 이름과 연락처가
            모두 일치하는 예약만 보여드려요.
          </p>
        </div>
      </main>
    </div>
  );
}
