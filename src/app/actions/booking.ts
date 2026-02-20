'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export async function createBooking(
    pitchId: string,
    date: Date,
    time: string,
    price: number,
    attendeeEmails: string[] = [] // New parameter
) {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "You must be logged in to book a pitch." }
    }

    // 2. Parse Date & Time
    const [hours, minutes] = time.split(':').map(Number)
    const startTime = new Date(date)
    startTime.setHours(hours, minutes, 0, 0)
    const endTime = new Date(startTime)
    endTime.setHours(hours + 1, minutes, 0, 0)

    // 3. Resolve Attendees (Find User IDs by Email)
    let participantIds: string[] = []
    if (attendeeEmails.length > 0) {
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email')
            .in('email', attendeeEmails)

        if (!profileError && profiles) {
            participantIds = profiles.map(p => p.id)
        }
    }

    // 4. Insert Booking
    const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
            user_id: user.id,
            pitch_id: pitchId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            total_price: price,
            status: 'confirmed'
        })
        .select()
        .single()

    if (error || !booking) {
        console.error("Booking Error:", error)
        return { error: "Failed to create booking. Please try again." }
    }

    // 5. Insert Participants
    // Add Organizer
    const participantsData = [
        { booking_id: booking.id, user_id: user.id, role: 'organizer', status: 'accepted' }
    ]
    // Add Attendees
    participantIds.forEach(pId => {
        // Don't add organizer again if they invited themselves by mistake
        if (pId !== user.id) {
            participantsData.push({ booking_id: booking.id, user_id: pId, role: 'attendee', status: 'pending' })
        }
    })

    const { error: partError } = await supabase
        .from('booking_participants')
        .insert(participantsData)

    if (partError) {
        console.error("Participant Error:", partError)
        // Non-fatal? Maybe warn user.
    }

    // 6. Send Notifications to Attendees
    const formattedDate = format(startTime, "PPP p", { locale: ko })
    const notificationsData = participantIds.filter(id => id !== user.id).map(pId => ({
        user_id: pId,
        message: `새로운 경기에 초대되었습니다! 일시: ${formattedDate}`,
        type: 'invite',
        link: `/dashboard` // or specific booking link
    }))

    if (notificationsData.length > 0) {
        await supabase.from('notifications').insert(notificationsData)
    }

    // 7. Revalidate & Return
    revalidatePath(`/pitches/${pitchId}`)
    revalidatePath(`/dashboard`)

    const missingCount = attendeeEmails.length - participantIds.filter(id => id !== user.id).length
    if (missingCount > 0) {
        return {
            success: true,
            warning: `${missingCount}명의 친구를 찾을 수 없었습니다 (가입 여부 확인 필요).`
        }
    }

    return { success: true }
}

