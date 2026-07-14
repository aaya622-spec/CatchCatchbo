# 캐치캐치보 설정 가이드

## 1. 패키지 설치

```bash
cd catchcatchbo
npm install
```

---

## 2. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 → 새 프로젝트 생성
2. **Settings → API** 에서 아래 두 값 복사
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. 환경변수 설정

`.env.local.example`을 복사해서 `.env.local` 만들기:

```bash
cp .env.local.example .env.local
```

`.env.local` 수정:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
NEXT_PUBLIC_ADMIN_EMAIL=your@email.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 4. 데이터베이스 스키마 적용

Supabase 대시보드 → **SQL Editor** → `supabase/schema.sql` 전체 복사 붙여넣기 → Run

---

## 5. 관리자 계정 생성

Supabase 대시보드 → **Authentication → Users → Add user**

- Email: 본인 이메일
- Password: 비밀번호 설정
- **"Auto confirm user" 체크** (이메일 인증 생략)

---

## 6. 로컬 실행

```bash
npm run dev
```

- 공개 예약 페이지: http://localhost:3000/book
- 관리자 로그인: http://localhost:3000/login
- 관리자 대시보드: http://localhost:3000/admin

---

## 7. Vercel 배포

```bash
# Vercel CLI 설치 (이미 있으면 생략)
npm i -g vercel

# 배포
vercel
```

또는 GitHub에 push 후 vercel.com에서 import.

**Vercel 환경변수 설정** (Project Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` → 배포된 실제 URL (예: https://catchcatchbo.vercel.app)

**배포 후 `.env.local`의 `NEXT_PUBLIC_SITE_URL`도 실제 URL로 업데이트하세요.**

---

## 8. 서비스 이름 변경

`lib/constants.ts`에서 `APP_NAME` 값만 바꾸면 전체 적용됩니다.

```ts
export const APP_NAME = "새로운 이름";
```

---

## 폴더 구조

```
catchcatchbo/
├── app/
│   ├── admin/              # 관리자 페이지 (인증 필요)
│   │   ├── page.tsx        # 대시보드
│   │   └── slots/
│   │       ├── new/page.tsx
│   │       └── [id]/edit/page.tsx
│   ├── book/               # 공개 예약 페이지
│   │   ├── page.tsx        # 슬롯 목록
│   │   └── [slotId]/page.tsx  # 예약 폼
│   ├── login/page.tsx      # 로그인
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── admin/              # 관리자용 컴포넌트
│   └── booking/            # 예약자용 컴포넌트
├── lib/
│   ├── actions/            # Server Actions
│   ├── supabase/           # Supabase 클라이언트
│   ├── constants.ts        # 텍스트 상수 (이름, 문구)
│   ├── types.ts            # TypeScript 타입
│   └── utils.ts            # 날짜/시간 유틸
├── middleware.ts            # 관리자 인증 보호
└── supabase/
    └── schema.sql           # DB 스키마 + RLS 정책
```
