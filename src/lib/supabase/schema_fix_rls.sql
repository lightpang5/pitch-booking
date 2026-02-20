-- 1. 기존 정책 제거 (안전하게 다시 설정하기 위함)
DROP POLICY IF EXISTS "Participants can view bookings." ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings." ON public.bookings;

-- 2. 기본 조회 정책: 본인이 만든 예약이거나 참여자로 등록된 예약이면 조회 가능
CREATE POLICY "Users can view relevant bookings." ON public.bookings 
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.booking_participants 
    WHERE booking_id = public.bookings.id 
    AND user_id = auth.uid()
  )
);

-- 3. 참고: 기존 profiles 및 booking_participants 정책은 이미 존재하므로 
-- bookings 테이블에 대한 접근 권한만 이 쿼리로 확실하게 잡아줍니다.
