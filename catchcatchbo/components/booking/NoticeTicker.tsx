"use client";

export default function NoticeTicker() {
  const notice =
    "📢 8월까지 가능한 날짜 오픈 완료! 매달 초에 다음 달 일정이 새로 열려요.";

  return (
    <section
      aria-label="공지사항"
      className="overflow-hidden rounded-2xl border border-peach-100 bg-peach-50 py-3"
    >
      <div className="notice-track flex w-max items-center">
        <p className="shrink-0 whitespace-nowrap px-6 text-sm font-medium text-peach-500">
          {notice}
        </p>

        <p
          aria-hidden="true"
          className="shrink-0 whitespace-nowrap px-6 text-sm font-medium text-peach-500"
        >
          {notice}
        </p>
      </div>

      <style jsx>{`
        .notice-track {
          animation: notice-scroll 16s linear infinite;
        }

        @keyframes notice-scroll {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .notice-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
