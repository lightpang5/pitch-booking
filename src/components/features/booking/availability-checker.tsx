'use client'

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { addDays, format, startOfWeek } from "date-fns"
import { toast } from "sonner"
import { createBooking } from "@/app/actions/booking"
import { RecentContacts } from "@/components/features/booking/recent-contacts"
import BookingScheduler, { type SelectedSlot } from "@/components/BookingScheduler"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
// ✅ 아이콘 추가
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"

type Reservation = Database["public"]["Tables"]["bookings"]["Row"]

export function AvailabilityChecker({ pitchId, pricePerHour }: { pitchId: string, pricePerHour: number }) {
    // ... (기존 state들은 그대로 유지) ...
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [isLoadingReservations, setIsLoadingReservations] = useState(false)
    const [weekRange, setWeekRange] = useState(() => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 })
        const end = addDays(start, 7)
        return { start, end }
    })
    const supabase = useMemo(() => createClient(), [])

    // Attendee State
    const [attendeeEmail, setAttendeeEmail] = useState("")
    const [attendees, setAttendees] = useState<string[]>([])

    // ... (fetchReservations, useEffect 등 기존 로직 그대로 유지) ...
    const fetchReservations = useCallback(async () => {
        if (!pitchId) return
        setIsLoadingReservations(true)
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('pitch_id', pitchId)
            .neq('status', 'cancelled')
            .filter('start_time', 'lt', weekRange.end.toISOString())
            .filter('end_time', 'gt', weekRange.start.toISOString())

        if (error) {
            console.error('Error fetching reservations:', error)
            setReservations([])
        } else {
            setReservations(data || [])
        }
        setIsLoadingReservations(false)
    }, [pitchId, supabase, weekRange.end, weekRange.start])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchReservations()
    }, [fetchReservations])

    const handleAddAttendee = () => {
        if (attendeeEmail && !attendees.includes(attendeeEmail)) {
            setAttendees([...attendees, attendeeEmail])
            setAttendeeEmail("")
        }
    }

    const handleRemoveAttendee = (email: string) => {
        setAttendees(attendees.filter(a => a !== email))
    }

    // ✨✨✨ 여기서부터 수정된 handleBooking ✨✨✨
    const handleBooking = () => {
        if (!date || !selectedTime) return

        startTransition(async () => {
            try {
                const result = await createBooking(pitchId, date, selectedTime, pricePerHour, attendees)

                if (result.error) {
                    // 🔴 에러 (Error)
                    toast.error("예약에 실패했습니다 !", {
                        description: (
                            <span className="text-red-800 font-medium">
                                {result.error}
                            </span>
                        ),
                        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                        style: {
                            backgroundColor: '#fef2f2', // red-50
                            border: '1px solid #fca5a5', // red-300
                            color: '#991b1b', // red-800
                        }
                    })
                } else {
                    if (result.warning) {
                        // 🟠 경고 (Warning)
                        toast.warning("약간의 문제와 함께 예약이 확정되었습니다 !", {
                            description: (
                                <span className="text-orange-800 font-medium">
                                    {result.warning}
                                </span>
                            ),
                            icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
                            style: {
                                backgroundColor: '#fff7ed', // orange-50
                                border: '1px solid #fdba74', // orange-300
                                color: '#9a3412', // orange-800
                            }
                        })
                    } else {
                        // 🟢 성공 (Success)
                        toast.success("예약이 확정되었습니다 !", {
                            description: (
                                <div className="mt-1">
                                    <div className="bg-white/60 p-2 rounded-md border border-green-200 mb-1">
                                        <span className="text-green-900 font-bold block text-center">
                                            {format(date, "PPP")} at {selectedTime}
                                        </span>
                                    </div>
                                    <span className="text-green-800 text-xs">
                                        Invited {attendees.length} people via email.
                                    </span>
                                </div>
                            ),
                            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
                            duration: 4000,
                            style: {
                                backgroundColor: '#f0fdf4', // green-50
                                border: '1px solid #86efac', // green-300
                                color: '#166534', // green-800
                            },
                        })
                    }
                    
                    await fetchReservations()
                    setSelectedTime(null)
                    setAttendees([])
                }
            } catch {
                // 🔴 시스템 에러
                toast.error("System Error", {
                    description: "Something went wrong. Please try again.",
                    style: {
                        backgroundColor: '#fef2f2',
                        color: '#991b1b',
                    }
                })
            }
        })
    }
    // ✨✨✨ 수정 끝 ✨✨✨

    // ... (handleSlotSelect, handleWeekChange, return 구문 등 나머지는 그대로 유지) ...
    const handleSlotSelect = (slot: SelectedSlot) => {
        setDate(slot.date)
        setSelectedTime(slot.time)
    }

// ✅ [수정] useCallback 사용 (필수!)
    const handleWeekChange = useCallback((start: Date, end: Date) => {
        setWeekRange({ start, end })
    }, [])

    return (
        // ... (return JSX 코드는 기존과 동일) ...
        <div className="space-y-6">
            {/* ... 기존 JSX 내용 ... */}
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <BookingScheduler                        
                        reservations={reservations}
                        selectedSlot={date && selectedTime ? { date, time: selectedTime } : null}
                        onSelectSlot={handleSlotSelect}
                        initialDate={date}
                        onWeekChange={handleWeekChange}
                    />
                    {isLoadingReservations && (
                        <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                            예약 정보를 갱신하는 중...
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Booking Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-2">
                                {date && selectedTime ? `${format(date, "PPPP")} · ${selectedTime}` : "주간 스케줄에서 시간을 선택하세요."}
                            </p>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2">Invite Friends (Optional)</h4>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="email"
                                    placeholder="Friend's email"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={attendeeEmail}
                                    onChange={(e) => setAttendeeEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddAttendee()
                                    }}
                                />
                                <Button size="sm" onClick={handleAddAttendee} variant="secondary">Add</Button>
                            </div>
                            {attendees.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {attendees.map(email => (
                                        <span key={email} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                            {email}
                                            <button onClick={() => handleRemoveAttendee(email)} className="ml-1 hover:text-red-500">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <RecentContacts
                                onSelect={(email) => {
                                    if (!attendees.includes(email)) {
                                        setAttendees([...attendees, email])
                                    }
                                }}
                                ignoreEmails={attendees}
                            />
                        </div>

                        {selectedTime && date && (
                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-medium">Total Price</span>
                                    <span className="text-lg font-bold">₩{pricePerHour.toLocaleString()}</span>
                                </div>
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleBooking}
                                    disabled={isPending}
                                >
                                    {isPending ? "Processing..." : "Book Now"}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}