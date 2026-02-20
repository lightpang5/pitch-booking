'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

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
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('user_id, pitch_id, start_time, end_time, booking_participants(user_id, role, status)')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error("Fetch Error:", fetchError)
        return { error: "Booking not found." }
    }

    const castedBooking = booking as any;
    const isOrganizer = booking.user_id === user.id;
    const userParticipant = castedBooking.booking_participants?.find((p: any) => p.user_id === user.id);

    if (!isOrganizer && (!userParticipant || (userParticipant.status !== 'accepted' && userParticipant.role !== 'organizer'))) {
        if (booking.user_id !== user.id) {
            return { error: "You do not have permission to edit this booking." }
        }
    }

    // 3. 시간 변경 여부 판단 (완벽한 비교를 위해 Date 객체로 변환 후 밀리초 비교)
    const startTime = new Date(newDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const newStartTimeISO = startTime.toISOString();
    const newEndTimeISO = endTime.toISOString();

    // ⭐ [핵심 수정] DB 문자열을 Date 객체로 바꾼 뒤, 절대적인 숫자(getTime)로 똑같은지 비교합니다!
    const originalStartTime = new Date(booking.start_time);
    const isTimeChanged = originalStartTime.getTime() !== startTime.getTime();

    console.log("🔥 [서버 시간 비교]", {
        originalTime: originalStartTime.toISOString(),
        newTime: startTime.toISOString(),
        isTimeChanged: isTimeChanged // 👈 이제 이게 false로 제대로 찍힐 겁니다!
    });

    // 4. Update Booking Time (시간이 진짜 바뀌었을 때만!)
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

    // 5. Add New Attendees (if any)
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

    // 6. Notify *other* existing participants (시간이 진짜 바뀌었을 때만!)
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

            // Reset status to 'pending' (시간이 바뀌었으니 기존 멤버들도 다시 승인해야 함)
            await supabase
                .from('booking_participants')
                .update({ status: 'pending' })
                .eq('booking_id', bookingId)
                .neq('user_id', user.id)
        }
    }

    // 7. UI 새로고침
    revalidatePath('/dashboard', 'page')
    const pitchId = castedBooking?.pitch_id || (booking as any)?.pitch_id;
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