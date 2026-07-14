"use client";

import { useState, useTransition } from "react";
import { APP_NAME } from "@/lib/constants";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn(formData);
      if (result && !result.success) {
        setError(result.error ?? "오류가 발생했어요.");
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
      <div className="w-full max-w-sm fade-in">
        {/* 로고 영역 */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-warm-gray-800">{APP_NAME}</h1>
          <p className="text-sm text-warm-gray-400 mt-1">관리자 로그인</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-warm-gray-700"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="your@email.com"
              className="input-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-warm-gray-700"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="비밀번호 입력"
              className="input-base"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full mt-2"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                로그인 중…
              </span>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-warm-gray-400 mt-6">
          회원가입은 별도로 안내받은 계정을 사용해주세요
        </p>
      </div>
    </div>
  );
}
