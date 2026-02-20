# 🏟️ PITCH-Booking 프로젝트 개요

**PITCH-Booking**은 사용자가 스포츠 구장을 예약하고 친구들을 초대하여 함께 경기를 즐길 수 있도록 돕는 **협업형 구장 예약 플랫폼**입니다.

---

## 🛠 1. 기술 스택 (Tech Stack)

* **Framework:** Next.js 15.1 (App Router), React 19
* **Backend:** Supabase (Auth, Database, RLS, Functions)
* **UI/UX:** Tailwind CSS 4, Shadcn UI, Lucide React, Sonner (토스트 메시지)
* **State Management:** TanStack Query (React Query)
* **AI:** Vercel AI SDK (Gemini / OpenAI 연동)
* **Testing:** Playwright (E2E 테스트)

---

## ✨ 2. 핵심 기능 분석

* **구장 관리 및 조회**
    * `pitches` 테이블을 통해 구장 정보(위치, 가격, 편의시설)를 관리합니다.
    * 메인 페이지와 상세 페이지에서 구장 데이터를 직관적으로 시각화합니다.
* **실시간 예약 시스템**
    * `AvailabilityChecker` 컴포넌트를 통해 특정 날짜와 시간의 예약 가능 여부를 즉시 확인합니다.
    * 안전한 서버 액션(Server Actions)을 통해 예약을 생성합니다.
* **🤝 협업 예약 (Phase 2)**
    * 예약 시 이메일을 통해 친구를 경기에 초대할 수 있습니다.
    * `booking_participants` 테이블을 통해 초대된 인원의 수락/거절 상태를 실시간으로 관리합니다.
    * 최근 함께 경기한 사용자 목록을 불러오는 `get_recent_contacts` 기능을 제공합니다.
* **알림 시스템**
    * 초대 발송 및 예약 정보 업데이트 발생 시 관련 사용자들에게 즉각적인 알림을 전송합니다.
* **🤖 AI 챗봇**
    * 사용자의 질문에 답하거나 예약 과정을 돕는 스마트 AI 어시스턴트가 통합되어 있습니다.

---

## 🗄️ 3. 데이터베이스 구조 (Supabase)

| 테이블명 | 역할 및 설명 |
| :--- | :--- |
| `profiles` | 사용자 기본 정보 및 역할(user/admin) 관리 |
| `pitches` | 구장 상세 데이터 저장 |
| `bookings` | 예약 정보 핵심 데이터 (시작/종료 시간, 예약 상태, 총 결제 금액) |
| `booking_participants` | 특정 예약에 참여하는 참가자 목록 및 각자의 역할/상태 관리 |
| `notifications` | 사용자별 알림 내역 및 읽음 상태 관리 |

---

## 🚀 4. 프로젝트의 강점 및 제언

### 💡 강점 (Strengths)
* **보안성 (Security):** Supabase RLS(Row Level Security) 정책을 적용하여 데이터 접근 권한을 엄격하고 안전하게 관리하고 있습니다.
* **확장성 (Scalability):** 동적인 초대 시스템과 알림 기능이 이미 탄탄하게 구현되어 있어, 단순한 예약 앱을 넘어선 **커뮤니티 플랫폼**으로서의 가치를 지닙니다.
* **최신 기술 (Modern Tech):** Next.js 15와 React 19 등 최신 프론트엔드 생태계를 적극적이고 올바르게 활용하고 있습니다.

### 📈 개선 제언 (Future Work)
* **결제 시스템 연동:** 현재 `total_price` 필드가 존재하므로, Toss Payments나 Portone 등 실제 결제 모듈을 연동하면 서비스의 완결성과 수익성을 극대화할 수 있습니다.
* **실시간 동기화 (Realtime):** Supabase Realtime 기능을 도입하여, 다른 사용자가 예약을 확정했을 때 내 화면의 캘린더에도 새로고침 없이 즉시 반영되도록 사용성을 강화할 수 있습니다.
* **관리자 전용 UI (Admin Dashboard):** 구장 소유자(Host)가 예약 현황을 관리하고 매출 통계를 한눈에 볼 수 있는 전용 대시보드를 추가하면 훌륭한 B2B 솔루션으로 확장될 것입니다.