'use client'

import React, { useState, useTransition, useEffect, useCallback, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateBooking } from "@/app/actions/update-booking"
import { Edit2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react"
import { RecentContacts } from "@/components/features/booking/recent-contacts"
// ✅ 수정 1: BookingScheduler import 확인 (SelectedSlot 타입 가져오기)
import BookingScheduler, { type SelectedSlot } from "@/components/BookingScheduler"
import { Database } from "@/types/database"
import { format, parseISO, startOfWeek, addDays } from "date-fns"
import { useRouter } from 'next/navigation';
// ✅ 수정 2: Supabase 클라이언트 import 추가
import { createClient } from "@/lib/supabase/client"

type Reservation = Database["public"]["Tables"]["bookings"]["Row"]

interface BookingEditDialogProps {
    bookingId: string
    currentDate: string
    currentPrice: number
    pitchId: string
    // reservations prop은 이제 내부에서 직접 조회하므로 선택사항(?.)으로 변경해도 됩니다.
    reservations?: Reservation[]
    onSuccess?: () => void
}

export function BookingEditDialog({
    bookingId,
    currentDate,
    currentPrice,
    pitchId,
    onSuccess
}: BookingEditDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter();

    // ✅ 수정 3: Supabase 클라이언트 생성
    const supabase = useMemo(() => createClient(), [])

    // ✅ 수정 4: 예약 데이터와 주간 범위 상태 추가
    const [fetchedReservations, setFetchedReservations] = useState<Reservation[]>([])
    const [weekRange, setWeekRange] = useState(() => {
        const d = parseISO(currentDate);
        const start = startOfWeek(d, { weekStartsOn: 1 })
        return { start, end: addDays(start, 7) }
    })

    const initialUtcDate = parseISO(currentDate);
    const initialLocalTimeDate = new Date(initialUtcDate);

    const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(() => {
        const initialTime = format(initialLocalTimeDate, "HH:mm");
        return {
            date: initialLocalTimeDate,
            time: initialTime
        };
    });

    const [attendeeEmail, setAttendeeEmail] = useState("")
    const [newAttendees, setNewAttendees] = useState<string[]>([])
    // ⭐ [추가 1] 기존 멤버 이메일을 저장할 상태
    const [existingEmails, setExistingEmails] = useState<string[]>([])

    // ✅ 수정 5: 데이터 조회 함수 추가 (주간 범위가 바뀌거나 모달이 열릴 때 실행)
    const fetchReservations = useCallback(async () => {
        console.log("🟡 [1] 데이터 조회 함수 시작", { pitchId, open });

        if (!pitchId || !open)
            // 🔥 2. 여기서 막히는지 확인
            console.log("🟡 [2] Supabase에 데이터 요청 날림! (대기 중...)");
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('pitch_id', pitchId)
                .neq('status', 'cancelled')
                .filter('start_time', 'lt', weekRange.end.toISOString())
                .filter('end_time', 'gt', weekRange.start.toISOString());

            console.log("🟢 [3] Supabase 응답 도착!", { data, error });
            if (error) {
                console.error('🔴 [에러] 예약 조회 실패:', error);
            } else {
                setFetchedReservations(data || []);
            }
        } catch (err) {
            console.error("💥 [치명적 에러] 코드 실행 중 문제 발생:", err);
        }

        return;

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('pitch_id', pitchId)
            .neq('status', 'cancelled')
        // 🚨 임시로 주간 날짜 필터링을 주석 처리해 보세요!
        // .filter('start_time', 'lt', weekRange.end.toISOString())
        // .filter('end_time', 'gt', weekRange.start.toISOString())

        if (error) {
            console.error('예약 조회 실패:', error)
        } else {
            console.log("✅ [4단계] 데이터 가져오기 성공:", data);
            setFetchedReservations(data || [])
        }
    }, [pitchId, open, supabase, weekRange])

    // 주간 범위 변경 시 데이터 다시 조회
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchReservations()
    }, [fetchReservations])

// 👇 다이얼로그 열릴 때 초기화 
    useEffect(() => {
        if (open) {
            const d = parseISO(currentDate);
            const localD = new Date(d);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedSlot({
                date: localD,
                time: format(localD, "HH:mm")
            });
            setNewAttendees([]);
            
            // ⭐ [추가됨] 기존 멤버들의 이메일을 가져와서 RecentContacts에서 숨기기 위한 로직
            const fetchExistingMembers = async () => {
                const { data } = await supabase
                    .from('booking_participants')
                    .select('profiles(email)')
                    .eq('booking_id', bookingId);
                
                if (data) {
                    const emails = data
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((p: any) => {
                            const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                            return profile?.email;
                        })
                        .filter(Boolean) as string[]; // null이나 undefined 값은 걸러냅니다.
                    setExistingEmails(emails);
                }
            };
            
            fetchExistingMembers();
        }
    }, [open, currentDate, bookingId, supabase]); // 👈 배열에 bookingId, supabase를 추가해 줍니다.

    // ✅ [수정] useCallback으로 감싸서 함수가 계속 새로 만들어지는 것을 방지
    const handleWeekChange = useCallback((start: Date, end: Date) => {
        setWeekRange({ start, end });
    }, []);

    const handleAddAttendee = () => {
        if (attendeeEmail && !newAttendees.includes(attendeeEmail)) {
            setNewAttendees([...newAttendees, attendeeEmail])
            setAttendeeEmail("")
        }
    }

    const handleUpdate = () => {
        if (!selectedSlot) {
            toast.warning("시간을 선택해주세요.", {
                description: <span className="text-orange-800 font-medium">변경할 예약 시간을 스케줄러에서 선택해야 합니다.</span>,
                icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
                style: { backgroundColor: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412' },
            })
            return
        }

        // ⭐ 1. 기존 시간을 무조건 "YYYY-MM-DD HH:mm" 형태의 텍스트로 만듭니다.
        const originalDateObj = parseISO(currentDate);
        const originalText = format(originalDateObj, "yyyy-MM-dd HH:mm");

        // ⭐ 2. 현재 선택된 시간도 똑같은 텍스트 형태로 만듭니다.
        const selectedText = `${format(selectedSlot.date, "yyyy-MM-dd")} ${selectedSlot.time}`;

        // ⭐ 3. 두 텍스트가 1글자라도 다르면 변경된 것으로 간주합니다.
        const isTimeChanged = originalText !== selectedText;
        const isAttendeesAdded = newAttendees.length > 0;

        // 🔥 [원인 파악용 로그] F12 콘솔창에서 이 부분을 반드시 확인해 주세요!!!
        console.log("🔥 [저장 버튼 클릭됨] 컴퓨터의 생각은 이렇습니다:", {
            "1_기존시간": originalText,
            "2_선택시간": selectedText,
            "3_시간이다른가?": isTimeChanged,
            "4_친구추가됨?": isAttendeesAdded
        });

        if (!isTimeChanged && !isAttendeesAdded) {
            toast.info("변경된 내용이 없습니다.", {
                description: "시간을 변경하거나 새로운 친구를 추가해주세요.",
                style: { backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155' }
            });
            return; // 🛑 여기서 함수를 강제 종료시킵니다!
        }

        console.log("🚀 [업데이트 실행] 변경점이 있어서 서버로 저장 요청을 보냅니다!");

        startTransition(async () => {
            try {
                const result = await updateBooking(bookingId, selectedSlot.date, currentPrice, newAttendees)

                if (result.error) {
                    toast.error("예약 변경 실패", {
                        description: <span className="text-red-800 font-medium">{result.error}</span>,
                        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                        style: { backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' }
                    })
                } else {
                    // ⭐ [이 부분이 핵심!] 시간이 안 바뀌었으면 "초대장이 발송되었습니다!" 로 제목을 바꿉니다.
                    const successTitle = isTimeChanged ? "예약이 변경되었습니다!" : "초대장이 발송되었습니다!";
                    const successDesc = isTimeChanged 
                        ? "새로운 시간으로 변경하고 초대장을 보냈습니다." 
                        : "예약 시간은 그대로 유지하고 새로운 친구를 초대했습니다.";

                    toast.success(successTitle, {
                        description: (
                            <div className="mt-1">
                                <span className="text-green-800 block mb-1">
                                    {successDesc} {/* 👈 상황에 맞는 설명 텍스트가 들어갑니다 */}
                                </span>
                                <div className="bg-white/60 p-2 rounded-md border border-green-200">
                                    <span className="text-green-900 font-bold text-base block text-center">
                                        📅 {format(selectedSlot.date, "MM월 dd일 HH:mm")}
                                    </span>
                                </div>
                            </div>
                        ),
                        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
                        duration: 4000,
                        style: { backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534' },
                    })
                    
                    setOpen(false)
                    
                    startTransition(() => {
                        router.refresh();
                        if (onSuccess) onSuccess();
                    });
                }
            } catch (e) {
                console.error("예약 변경 실패:", e)
                toast.error("시스템 오류")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Edit2 className="w-3 h-3" />
                    시간 변경 / 초대
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>예약 변경</DialogTitle>
                    <DialogDescription>원하는 빈 시간을 선택하여 예약을 변경하세요.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="border rounded-md p-2 bg-slate-50">
                        {/* ✅ 수정 7: 내부에서 조회한 데이터(fetchedReservations)와 핸들러 연결 */}
                        <BookingScheduler                            
                            reservations={fetchedReservations} // 👈 방금 DB에서 성공적으로 가져온(Array(2)) 데이터를 줍니다!
                            // reservations={fetchedReservations}
                            selectedSlot={selectedSlot}
                            onSelectSlot={setSelectedSlot}
                            initialDate={selectedSlot?.date}
                            onWeekChange={handleWeekChange} // 이제 주간 변경 시 데이터가 갱신됩니다!
                            excludeBookingId={bookingId}
                        />
                    </div>

                    <div className="border-t pt-4">
                        <Label className="mb-2 block font-bold">친구 추가 초대</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="이메일 입력"
                                value={attendeeEmail}
                                onChange={(e) => setAttendeeEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddAttendee()}
                            />
                            <Button type="button" onClick={handleAddAttendee} variant="secondary">추가</Button>
                        </div>
                        {newAttendees.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {newAttendees.map(email => (
                                    <span key={email} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{email}</span>
                                ))}
                            </div>
                        )}
                        <RecentContacts
                            onSelect={(email) => {
                                if (!newAttendees.includes(email)) setNewAttendees([...newAttendees, email])
                            }}
                            // 👇 기존 멤버와 새로 추가한 멤버 모두 목록에서 숨깁니다!
                            ignoreEmails={[...newAttendees, ...existingEmails]}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                    <Button type="submit" onClick={handleUpdate} disabled={isPending}>
                        {isPending ? "변경 중..." : "변경 사항 저장"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}