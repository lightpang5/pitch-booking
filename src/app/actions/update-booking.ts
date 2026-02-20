'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

// ✅ 수정 1: DB에서 가져오는 Participant 구조 정의
interface Participant {
    user_id: string;
    role: string;
    status: string;
}

// ✅ 수정 2: DB에서 가져오는 Booking 구조 정의
interface BookingData {
    user_id: string;
    pitch_id: string;
    start_time: string;
    end_time: string;
    booking_participants: Participant[] | null;
}

export async function updateBooking(
    bookingId: string,
    newDate: Date,
    newPrice: number,
    newAttendeeEmails: string[] = []
) {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "You must be logged in." }
    }

    // 2. Fetch Existing Booking (Permission & Time Check)
    const { data: bookingRaw, error: fetchError } = await supabase
        .from('bookings')
        .select('user_id, pitch_id, start_time, end_time, booking_participants(user_id, role, status)')
        .eq('id', bookingId)
        .single()

    if (fetchError || !bookingRaw) {
        console.error("Fetch Error:", fetchError)
        return { error: "Booking not found." }
    }

    // ✅ 수정 3: any 대신 정의한 인터페이스(BookingData)로 타입 단언
    const booking = bookingRaw as unknown as BookingData;
    const isOrganizer = booking.user_id === user.id;
    const userParticipant = booking.booking_participants?.find((p) => p.user_id === user.id);

    if (!isOrganizer && (!userParticipant || (userParticipant.status !== 'accepted' && userParticipant.role !== 'organizer'))) {
        if (booking.user_id !== user.id) {
            return { error: "You do not have permission to edit this booking." }
        }
    }

    // 3. 시간 변경 여부 판단
    const startTime = new Date(newDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const newStartTimeISO = startTime.toISOString();
    const newEndTimeISO = endTime.toISOString();

    const originalStartTime = new Date(booking.start_time);
    const isTimeChanged = originalStartTime.getTime() !== startTime.getTime();

    console.log("🔥 [서버 시간 비교]", {
        originalTime: originalStartTime.toISOString(),
        newTime: startTime.toISOString(),
        isTimeChanged: isTimeChanged
    });

    // 4. Update Booking Time
    if (isTimeChanged) {
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                start_time: newStartTimeISO,
                end_time: newEndTimeISO,
                total_price: newPrice
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error("Update Error:", updateError)
            return { error: "Failed to update booking time." }
        }
    }

    // 5. Add New Attendees
    let newParticipantIds: string[] = []
    if (newAttendeeEmails.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('email', newAttendeeEmails)

        newParticipantIds = profiles?.map(p => p.id) || []

        const { data: existing } = await supabase
            .from('booking_participants')
            .select('user_id')
            .eq('booking_id', bookingId)

        const existingIds = existing?.map(e => e.user_id) || []
        const toAdd = newParticipantIds.filter(id => !existingIds.includes(id))

        if (toAdd.length > 0) {
            const participantsData = toAdd.map(pId => ({
                booking_id: bookingId,
                user_id: pId,
                role: 'attendee',
                status: 'pending'
            }))

            await supabase.from('booking_participants').insert(participantsData)

            const formattedDate = format(startTime, "PPP p", { locale: ko })
            const notificationsData = toAdd.map(pId => ({
                user_id: pId,
                message: `경기에 초대되었습니다! 일시: ${formattedDate}`,
                type: 'invite',
                link: `/dashboard`
            }))
            await supabase.from('notifications').insert(notificationsData)
        }
    }

    // 6. Notify *other* existing participants
    if (isTimeChanged) {
        const { data: allParticipants } = await supabase
            .from('booking_participants')
            .select('user_id')
            .eq('booking_id', bookingId)

        const othersToNotify = allParticipants?.filter(p => p.user_id !== user.id) || []

        if (othersToNotify.length > 0) {
            const formattedDate = format(startTime, "PPP p", { locale: ko })
            const updateNotes = othersToNotify.map(p => ({
                user_id: p.user_id,
                message: `경기 시간이 변경되었습니다: ${formattedDate}`,
                type: 'invite',
                link: `/dashboard`,
                is_read: false
            }))

            await supabase.from('notifications').insert(updateNotes)

            await supabase
                .from('booking_participants')
                .update({ status: 'pending' })
                .eq('booking_id', bookingId)
                .neq('user_id', user.id)
        }
    }

    // 7. UI 새로고침
    revalidatePath('/dashboard', 'page')
    // ✅ 수정 4: any 제거하고 안전하게 pitch_id 접근
    const pitchId = booking.pitch_id;
    if (pitchId) {
        revalidatePath(`/pitches/${pitchId}`, 'page')
    }

    const missingCount = newAttendeeEmails.length - (newParticipantIds?.length || 0)
    if (missingCount > 0) {
        return {
            success: true,
            warning: `${missingCount}명의 친구를 찾을 수 없었습니다 (가입 여부 확인 필요).`
        }
    }

    return { success: true }
}