-- bookings 테이블에 대한 INSERT 권한 추가
-- 모든 사용자(로그인 여부와 상관없이)가 예약을 생성할 수 있도록 허용 (개발 및 데모 용도)
CREATE POLICY "Enable insert for all users" ON public.bookings 
FOR INSERT WITH CHECK (true);

-- 수정 권한도 추가 (필요시)
CREATE POLICY "Enable update for all users" ON public.bookings 
FOR UPDATE USING (true);
