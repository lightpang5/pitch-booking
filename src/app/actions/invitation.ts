'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function respondToInvitation(bookingId: string, status: 'accepted' | 'declined') {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "You must be logged in to respond to an invitation." }
    }

    // 2. Update status in booking_participants
    const { error } = await supabase
        .from('booking_participants')
        .update({ status })
        .eq('booking_id', bookingId)
        .eq('user_id', user.id)

    if (error) {
        console.error("Error responding to invitation:", error)
        return { error: "Failed to update invitation status." }
    }

    // 3. Optional: Notify the organizer about the response
    // First find the organizer
    const { data: organizer } = await supabase
        .from('booking_participants')
        .select('user_id')
        .eq('booking_id', bookingId)
        .eq('role', 'organizer')
        .single()

    if (organizer) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

        const name = profile?.full_name || profile?.email || "Someone"
        
        await supabase.from('notifications').insert({
            user_id: organizer.user_id,
            message: `${name} has ${status} your match invitation.`,
            type: 'update',
            link: `/dashboard`
        })
    }

    revalidatePath('/dashboard')
    return { success: true }
}
