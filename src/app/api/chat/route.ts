import { google } from '@ai-sdk/google';
import { streamText, tool, UIMessage } from 'ai'; // Message 타입 추가
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(req: Request) {
    console.log(">>> [STAMP] Chat API POST Received at " + new Date().toISOString());
    try {
        const body = await req.json();
        const { messages } = body;
        const supabase = await createClient();

        console.log(">>> [LOG] Received messages count:", messages?.length);

        // ✅ 수정 1: msg: any 대신 Message 타입 사용 또는 unknown 처리
        // ✅ 수정 2: 사용하지 않는 변수(_toolInvocations, _parts) 앞에 언더스코어(_)를 붙여 경고 무시
        const cleanedMessages = (messages || []).map((msg: UIMessage) => {
            const { toolInvocations: _toolInvocations, parts: _parts, ...cleanMsg } = msg as unknown as Record<string, unknown>;

            // 타입 단언을 통해 content 접근
            const typedCleanMsg = cleanMsg as { content?: string; [key: string]: unknown };

            if (!typedCleanMsg.content) {
                typedCleanMsg.content = '';
            }

            return typedCleanMsg;
        });

        console.log(">>> [LOG] Processing " + cleanedMessages.length + " cleaned messages.");
        if (cleanedMessages.length > 0) {
            const last = cleanedMessages[cleanedMessages.length - 1];
            console.log(">>> [LOG] Last message role: " + last.role + ", content: " + (last.content ? String(last.content).substring(0, 50) : '[empty]'));
        }

        const result = streamText({
            model: google('gemini-2.5-flash'),            
            messages: cleanedMessages,
            // ✅ 수정 3: @ts-ignore 대신 @ts-expect-error 사용
            // @ts-expect-error - maxSteps is valid but TypeScript definition may be outdated
            maxSteps: 5,
            system: `You are a helpful football pitch booking manager in Seoul. 
            The current date is ${new Date().toLocaleDateString('en-CA')} (${new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}).
            Your goal is to help users find and book pitches. 
            Try to fulfill the request in the FEWEST steps possible to respect API limits.
            
            CRITICAL DATE HANDLING:
            - When a user asks for available pitches WITHOUT specifying a date, you MUST use today's date (${new Date().toLocaleDateString('en-CA')})
            - When calling getAvailableFields, ALWAYS provide the date parameter
            - If the user says "오늘" or "today", use ${new Date().toLocaleDateString('en-CA')}
            - If no time is specified, you can omit the time parameter
            
            CRITICAL BOOKING FLOW (FOLLOW STRICTLY):
            1. When user says "예약하고 싶어", "예약해줘", "book", etc. with a pitch name → They want to BOOK, not browse
            2. Check what information you have:
               - Pitch name: ✓ (from user message)
               - Date: Check if provided, if not ask "어느 날짜에 예약하시겠어요?"
               - Time: **ALWAYS ASK** "몇 시에 예약하시겠어요?" (e.g., "오후 3시", "14:00")
               - Duration: If not provided, assume 1 hour
            3. **NEVER call createBooking without TIME information**
            4. Once you have ALL information (pitch name, date, TIME, duration):
               - Summarize: "Urban Kick, 2026-02-09, 14:00, 1시간, 총 50,000원"
               - Ask: "예약을 확정하시겠어요?"
            5. When user confirms (e.g., "예약 확정", "네", "확인", "결제할게") → Call createBooking tool
            6. DO NOT call getAvailableFields again if the user already selected a pitch and wants to book it
            
            When a user asks for available pitches or recommendations (without a specific pitch name), use 'getAvailableFields' tool.
            
            Important UI features:
            1. Pitch Cards: When you use 'getAvailableFields', the UI renders beautiful cards. Do not repeat the list in a markdown table.
            2. getUserBookings: When a user asks for their bookings, YOU MUST CALL THIS TOOL.
            CRITICAL: The UI handles the display of bookings. DO NOT generate a markdown table or list of the bookings in your text response.
            Just output a simple confirmation like "Here are your current bookings:" and let the UI component show the details.
            
            Be friendly, professional, and answer in Korean.`,
            tools: {
                getAvailableFields: tool({
                    description: 'Get a list of available football pitches for a specific date and optional time.',
                    parameters: z.object({
                        date: z.string().describe('The date in YYYY-MM-DD format.'),
                        time: z.string().optional().describe('The start time in HH:mm format (e.g., 14:00). If omitted, returns general pitch information.'),
                    }),
                    // @ts-expect-error - AI SDK의 execute 오버로드 타입 추론 오류 무시
                    execute: async ({ date, time }: { date: string; time?: string }) => {
                        const finalDate = date || new Date().toISOString().split('T')[0];
                        console.log(`Executing getAvailableFields tool: { date: ${finalDate}, time: ${time || 'any'} }`);

                        const { data: pitches, error: pitchError } = await supabase
                            .from('pitches')
                            .select('*');

                        if (pitchError || !pitches) return { error: "Failed to fetch pitches." };

                        if (time) {
                            const startDateTime = new Date(`${finalDate}T${time}:00`);
                            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

                            const { data: bookings, error: bookingError } = await supabase
                                .from('bookings')
                                .select('pitch_id')
                                .filter('start_time', 'lt', endDateTime.toISOString())
                                .filter('end_time', 'gt', startDateTime.toISOString())
                                .eq('status', 'confirmed');

                            if (bookingError) return { error: "Failed to check bookings." };

                            const bookedPitchIds = new Set(bookings?.map(b => b.pitch_id) || []);
                            const availablePitches = pitches.filter(p => !bookedPitchIds.has(p.id));

                            return {
                                date,
                                time,
                                availablePitches: availablePitches.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    location: p.location,
                                    price: p.price_per_hour,
                                    image: p.images?.[0] || null
                                }))
                            };
                        }

                        return {
                            date: finalDate,
                            message: "Please select a specific time to check exact availability.",
                            pitches: pitches.map(p => ({
                                id: p.id,
                                name: p.name,
                                location: p.location,
                                price: p.price_per_hour,
                                image: p.images?.[0] || null
                            }))
                        };
                    },
                }),
                createBooking: tool({
                    description: 'Create a new pitch booking. ONLY call this after: 1) You have ALL information (pitch name, date, TIME, duration), 2) User gives final confirmation. NEVER call without time information.',
                    parameters: z.object({
                        pitchName: z.string().describe('The name of the pitch to book.'),
                        date: z.string().describe('The date in YYYY-MM-DD format.'),
                        time: z.string().describe('The start time in HH:mm format (e.g., 14:00). REQUIRED - do not call this tool without time.'),
                        durationHours: z.number().default(1).describe('The duration of the booking in hours.'),
                    }),
                    // @ts-expect-error - AI SDK의 execute 오버로드 타입 추론 오류 무시
                    execute: async ({ pitchName, date, time, durationHours }) => {
                        console.log("Executing createBooking tool:", { pitchName, date, time });

                        const { data: { user } } = await supabase.auth.getUser();
                        const userId = user?.id || "ee4be24c-fc2f-412e-a129-566408462925"; // Fallback for demo if not logged in

                        const { data: pitch, error: pitchError } = await supabase
                            .from('pitches')
                            .select('id, price_per_hour')
                            .eq('name', pitchName)
                            .single();

                        if (pitchError || !pitch) return { error: `Pitch '${pitchName}' not found.` };

                        const startDateTime = new Date(`${date}T${time}:00`);
                        const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);
                        const totalPrice = pitch.price_per_hour * durationHours;

                        console.log("Inserting booking for userId:", userId);
                        const { data: booking, error: bookingError } = await supabase
                            .from('bookings')
                            .insert({
                                user_id: userId,
                                pitch_id: pitch.id,
                                start_time: startDateTime.toISOString(),
                                end_time: endDateTime.toISOString(),
                                total_price: totalPrice,
                                status: 'confirmed'
                            })
                            .select()
                            .single();

                        if (bookingError) {
                            console.error("Booking creation error:", bookingError);
                            return { error: `Failed to create reservation: ${bookingError.message}` };
                        }

                        return {
                            success: true,
                            bookingId: booking.id,
                            message: `Successfully reserved ${pitchName} for ${date} at ${time}.`
                        };
                    },
                }),
                getUserBookings: tool({
                    description: 'Get the list of current bookings for the user to verify success.',
                    parameters: z.object({}),
                    // @ts-expect-error - AI SDK의 execute 오버로드 타입 추론 오류 무시
                    execute: async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        const userId = user?.id || "ee4be24c-fc2f-412e-a129-566408462925";

                        console.log(`[getUserBookings] Fetching for userId: ${userId}`);

                        const { data: bookings, error } = await supabase
                            .from('bookings')
                            .select('*, pitches(name, images)')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })
                            .limit(5);

                        if (error) {
                            console.error("Error fetching bookings:", error);
                            return { error: "Failed to fetch bookings." };
                        }

                        // 타입 단언을 사용하여 any 경고 해결
                        return {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            bookings: (bookings || []).map((b: any) => {
                                const pitchData = Array.isArray(b.pitches) ? b.pitches[0] : b.pitches;
                                return {
                                    id: b.id,
                                    pitch: pitchData?.name || 'Unknown Pitch',
                                    image: pitchData?.images?.[0] || null,
                                    date: new Date(b.start_time).toLocaleDateString(),
                                    time: new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    status: b.status
                                };
                            })
                        };
                    },
                }),
            },
        });

        console.log(">>> [LOG] Streaming result to client... (Final Step)");
        return result.toUIMessageStreamResponse({
            originalMessages: messages
        });
    } catch (error) {
        console.error(">>> [CRITICAL ERROR] Chat API:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}