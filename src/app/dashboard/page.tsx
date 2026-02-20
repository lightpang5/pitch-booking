import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { MapPin, CalendarClock, Users, Bell, Mail } from "lucide-react"
import { BookingEditDialog } from "@/components/features/booking/booking-edit-dialog"
import { InvitationActions } from "@/components/features/booking/invitation-actions"
import { NotificationItem } from "@/components/features/notification/notification-item"

// ✅ 수정 1: 타입 에러를 잡기 위한 인터페이스 정의
interface ProfileData {
    email?: string;
    full_name?: string;
}

interface ParticipantData {
    role: string;
    status: string;
    profiles?: ProfileData | ProfileData[] | null;
}

interface PitchData {
    id: string;
    name: string;
    location: string;
}

interface DashboardBooking {
    id: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    pitch: PitchData | null;
    participants: ParticipantData[];
    myRole: string;
    myStatus: string;
}

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch Notifications
    const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

    // Fetch Bookings via Participation
    const { data: participations, error } = await supabase
        .from('booking_participants')
        .select(`
      booking_id,
      role,
      status,
      bookings (
        id,
        start_time,
        end_time,
        total_price,
        status,
        pitches (
            id,
            name,
            location,
            images
        ),
        booking_participants (
            role,
            status,
            profiles (
                email,
                full_name
            )
        )
      )
    `)
        .eq('user_id', user.id)
        .neq('status', 'declined')

    if (error) {
        console.error("Error fetching bookings:", error)
    }

   // Transform and split data for UI
    const allBookings = (participations || []).map((p): DashboardBooking | null => {
        const b = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings
        if (!b) return null

        const pitchRaw = Array.isArray(b.pitches) ? b.pitches[0] : b.pitches
        const allParticipants = b.booking_participants || []

        return {
            id: b.id,
            start_time: b.start_time,
            end_time: b.end_time,
            total_price: b.total_price,
            status: b.status,
            // 👇 null일 가능성을 명확하게 처리했습니다!
            pitch: pitchRaw ? (pitchRaw as unknown as PitchData) : null,
            participants: allParticipants as unknown as ParticipantData[],
            myRole: p.role,
            myStatus: p.status
        }
    }).filter((b): b is DashboardBooking => b !== null)

    const now = new Date();

    const invitations = allBookings.filter(b => b.myStatus === 'pending');
    
    const acceptedBookings = allBookings.filter(b => b.myStatus === 'accepted');

    const upcomingBookings = acceptedBookings
        .filter(b => new Date(b.end_time).getTime() > now.getTime())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const completedBookings = acceptedBookings
        .filter(b => new Date(b.end_time).getTime() <= now.getTime())
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // 완료된 것은 최신순으로 정렬

    return (
        <div className="container mx-auto py-10 px-4 max-w-6xl">
            <h1 className="text-3xl font-bold tracking-tight mb-8">My Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left/Main Column: Bookings */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Invitations Section */}
                    {invitations.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Mail className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-semibold">New Invitations</h2>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                    {invitations.length} Action Required
                                </Badge>
                            </div>
                            <div className="grid gap-4">
                                {invitations.map((booking) => (
                                    <Card key={booking.id} className="border-blue-200 bg-blue-50/30 overflow-hidden">
                                        <div className="p-4 sm:p-6 sm:flex justify-between items-center gap-4">
                                            <div className="space-y-1 mb-4 sm:mb-0">
                                                <h3 className="font-bold text-lg">{booking.pitch?.name}</h3>
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <CalendarClock className="w-4 h-4 mr-1" />
                                                    {format(new Date(booking.start_time), "PPPP p")}
                                                </div>
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <MapPin className="w-4 h-4 mr-1" />
                                                    {booking.pitch?.location}
                                                </div>
                                            </div>
                                            <InvitationActions bookingId={booking.id} />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming Matches Section */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            Upcoming Matches
                            <Badge variant="outline">{upcomingBookings.length}</Badge>
                        </h2>

                        {upcomingBookings.length === 0 ? (
                            <div className="text-center py-12 border rounded-lg bg-slate-50 border-dashed">
                                <p className="text-muted-foreground mb-4">You have no upcoming matches.</p>
                                <Link href="/" className="text-primary hover:underline font-medium">
                                    Browse available pitches
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {upcomingBookings.map((booking) => (
                                    <Card key={booking.id} className="overflow-hidden flex flex-col">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg line-clamp-1">{booking.pitch?.name || "Unknown Pitch"}</CardTitle>
                                                <Badge variant={booking.status === 'confirmed' ? "default" : "secondary"}>
                                                    {booking.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4 mr-1" />
                                                {booking.pitch?.location}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <div className="flex items-center gap-2 text-sm font-medium mb-4">
                                                <CalendarClock className="w-4 h-4" />
                                                <span>
                                                    {format(new Date(booking.start_time), "PPP p")}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                                    <Users className="w-3 h-3" />
                                                    <span>Attendees ({booking.participants.length})</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {/* ✅ 수정 3: any 대신 ParticipantData 타입 사용 및 profiles 배열 처리 */}
                                                    {booking.participants.map((p: ParticipantData, idx: number) => {
                                                        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                                                        return (
                                                            <span key={idx} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                                                                {profile?.email?.split('@')[0] || "Unknown"}
                                                                {p.role === 'organizer' && ' (Host)'}
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                {booking.myRole === 'organizer' && (
                                                    <div className="pt-2 mt-2 border-t flex justify-end">
                                                        <BookingEditDialog
                                                            bookingId={booking.id}
                                                            currentDate={booking.start_time}
                                                            currentPrice={booking.total_price}
                                                            pitchId={booking.pitch?.id || ""}
                                                            reservations={[]}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Completed Matches Section */}
                    {completedBookings.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                Completed Matches
                                <Badge variant="secondary" className="opacity-70">{completedBookings.length}</Badge>
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {completedBookings.map((booking) => (
                                    <Card key={booking.id} className="overflow-hidden flex flex-col opacity-70 grayscale-[0.5] hover:grayscale-0 transition-all">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg line-clamp-1">{booking.pitch?.name || "Unknown Pitch"}</CardTitle>
                                                <Badge variant="secondary">Completed</Badge>
                                            </div>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4 mr-1" />
                                                {booking.pitch?.location}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <div className="flex items-center gap-2 text-sm font-medium mb-4">
                                                <CalendarClock className="w-4 h-4" />
                                                <span>
                                                    {format(new Date(booking.start_time), "PPP p")}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column: Notifications */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">Notifications</h2>
                        </div>
                        {notifications && notifications.length > 0 && (
                            <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                                {notifications.length}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-3">
                        {notifications && notifications.length > 0 ? (
                            notifications.map((note) => (
                                <NotificationItem key={note.id} notification={note} />
                            ))
                        ) : (
                            <div className="text-center py-10 border rounded-lg bg-slate-50/50 text-muted-foreground text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>No new notifications</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}