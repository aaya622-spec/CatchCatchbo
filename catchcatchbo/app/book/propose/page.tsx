import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import ProposalForm from "@/components/booking/ProposalForm";

export const metadata = {
  title: "다른 날짜 제안하기",
};

export default function ProposePage() {
  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm border-b border-cream-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="btn-ghost p-2 -ml-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M19 12H5M12 5l-7 7 7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <h1 className="font-bold text-warm-gray-800">
            다른 날짜 제안하기
          </h1>
        </div>
      </header>

      <main className="px-5 pt-6">
        <div className="mb-7">
          <p className="text-xl font-bold text-warm-gray-800">
            이 날은 어때요? 👀
          </p>

          <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
            열려있는 날 중 마음에 드는
            날짜가 없다면,
            <br />
            만나고 싶은 날을 직접
            제안해주세요.
          </p>
        </div>

        <ProposalForm />
      </main>

      <footer className="text-center py-10 text-xs text-warm-gray-300">
        {APP_NAME}으로 만들었어요
      </footer>
    </div>
  );
}
