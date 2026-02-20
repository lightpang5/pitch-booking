'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper to safely get the sender function
const getSender = (helpers: any) => {
    if (typeof helpers.append === 'function') return helpers.append;
    if (typeof helpers.sendMessage === 'function') return helpers.sendMessage;
    if (typeof helpers.reload === 'function') return async (msg: any) => {
        // Fallback: manually update state and reload
        if (helpers.setMessages) {
            helpers.setMessages((prev: any[]) => [...prev, msg]);
        }
        return helpers.reload();
    };
    return null;
};

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [localInput, setLocalInput] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const supabase = createClient();

    // Use standard import
    const chatHelpers = useChat({
        id: userId ? `chat-${userId}` : 'chat-guest',
        api: '/api/chat',
        onError: (error) => console.error("Chat error:", error),
    }) as any;

    const { messages, setMessages, append, status, error: chatError } = chatHelpers;

    // Handle Auth State Changes to reset chat
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUserId(session?.user?.id || null);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            const newUserId = session?.user?.id || null;
            if (newUserId !== userId) {
                setUserId(newUserId);
                setMessages([]); // Clear messages on user change
            }
        });

        return () => subscription.unsubscribe();
    }, [userId, setMessages]);

    // Debug: Log messages whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            console.log(">>> [DEBUG] Messages updated:", messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.toolInvocations) {
                console.log(">>> [DEBUG] Last message has toolInvocations:", lastMessage.toolInvocations);
            }
        }
    }, [messages]);

    // isLoading proxy based on status
    const isLoading = status === 'streaming' || status === 'submitted';

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFormSubmit = async (e: React.FormEvent, overrideInput?: string) => {
        if (e) e.preventDefault();
        const trimmedInput = (overrideInput || localInput).trim();
        if (!trimmedInput || isLoading) return;

        setLocalInput('');

        try {
            console.log("Attempting to send message:", trimmedInput);
            const sender = getSender(chatHelpers);

            if (sender) {
                await sender({ role: 'user', content: trimmedInput });
                console.log("Message sent via detected sender function.");
            } else {
                console.error("Unknown useChat structure:", Object.keys(chatHelpers));
                // Fallback to reload if setMessages is available
                if (chatHelpers.setMessages && chatHelpers.reload) {
                    chatHelpers.setMessages((prev: any) => [...prev, { id: Date.now().toString(), role: 'user', content: trimmedInput }]);
                    await chatHelpers.reload();
                } else {
                    alert("챗봇 연결 오류: 메시지 전송 기능을 찾을 수 없습니다. 새로고침 해주세요.");
                }
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:scale-105 transition-transform"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    align="end"
                    className="side-chat-window w-80 sm:w-96 p-0 border-none shadow-2xl rounded-2xl overflow-hidden"
                    sideOffset={16}
                >
                    {/* Header */}
                    <div className="bg-primary p-4 text-primary-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="h-6 w-6" />
                            <div>
                                <h3 className="font-bold text-lg leading-none">Pitch Booking AI</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                                    <span className="text-xs opacity-90">{isLoading ? '입력 중...' : '온라인'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="h-[450px] flex flex-col bg-slate-50/50">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground p-8 flex flex-col items-center gap-2">
                                    <Bot className="h-12 w-12 opacity-20" />
                                    <p>안녕하세요! 풋살장 예약을 도와드릴까요?</p>
                                    <div className="grid grid-cols-1 gap-2 mt-4 w-full">
                                        <Button
                                            variant="outline"
                                            className="text-xs justify-start h-auto py-2 px-3 bg-white hover:bg-slate-50 border-blue-100"
                                            onClick={() => handleFormSubmit({ preventDefault: () => { } } as any, '예약 가능한 풋살장 알려줘')}
                                        >
                                            📅 예약 가능한 구장 알려줘
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-xs justify-start h-auto py-2 px-3 bg-white hover:bg-slate-50 border-blue-100"
                                            onClick={() => handleFormSubmit({ preventDefault: () => { } } as any, '내 예약 현황 보여줘')}
                                        >
                                            📋 내 예약 현황 보여줘
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {messages.map((m: any) => (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                                        m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white border text-primary"
                                    )}>
                                        {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                    </div>

                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 shadow-sm text-sm relative group mb-1",
                                        m.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                                    )}>
                                        {/* Tool Invocations Display */}
                                        {(m.toolInvocations || m.parts?.filter((p: any) => p.type?.startsWith('tool-')).map((p: any) => ({
                                            toolCallId: p.toolCallId,
                                            toolName: p.type.replace('tool-', ''),
                                            state: p.state,
                                            result: p.output || p.result
                                        })))?.map((invocation: any) => {
                                            const toolCallId = invocation.toolCallId;
                                            const toolName = invocation.toolName;
                                            const state = invocation.state;
                                            const result = invocation.result;

                                            // Handle loading state
                                            if (state !== 'result' && state !== 'output-available' && state !== 'output') {
                                                return (
                                                    <div key={toolCallId} className="my-2 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500 text-xs">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span>{toolName === 'createBooking' ? '데이터베이스 동기화 중...' : '시스템 데이터 조회 중...'}</span>
                                                    </div>
                                                );
                                            }

                                            if (toolName === 'getAvailableFields') {
                                                if (result?.error) {
                                                    return (
                                                        <div key={toolCallId} className="my-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100">
                                                            ⚠️ {result.error}
                                                        </div>
                                                    );
                                                }
                                                const pitches = result?.availablePitches || result?.pitches || [];
                                                if (pitches.length === 0) return <div key={toolCallId} className="text-xs text-slate-500 italic my-2">표시할 구장 정보가 없습니다.</div>;

                                                return (
                                                    <div key={toolCallId} className="mt-3 space-y-3 w-full">
                                                        <div className="flex items-center justify-between">
                                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                                                {result.time ? `${result.date} ${result.time} 예약 가능` : `${result.date} 구장 목록`}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            {pitches.map((pitch: any) => (
                                                                <div key={pitch.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                                                    {pitch.image && (
                                                                        <div className="h-32 w-full relative bg-slate-100">
                                                                            <img src={pitch.image} alt={pitch.name} className="object-cover w-full h-full" />
                                                                            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                                                ₩{pitch.price.toLocaleString()}/h
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="p-3">
                                                                        <h4 className="font-bold text-slate-900 text-sm mb-1">{pitch.name}</h4>
                                                                        <div className="flex items-center text-xs text-slate-500 mb-3">
                                                                            <span className="truncate">{pitch.location}</span>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                                            onClick={(e) => {
                                                                                const dateStr = result.date || "";
                                                                                const timeStr = result.time || "";
                                                                                const text = `${pitch.name} 예약하고 싶어${dateStr ? ` (${dateStr}${timeStr ? ` ${timeStr}` : ''})` : ''}`;
                                                                                handleFormSubmit(e, text);
                                                                            }}
                                                                        >
                                                                            예약하기
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (toolName === 'getUserBookings') {
                                                if (result?.error) {
                                                    return (
                                                        <div key={toolCallId} className="my-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100">
                                                            ⚠️ 예약 내역을 불러오는데 실패했습니다.
                                                        </div>
                                                    );
                                                }

                                                const bookings = result?.bookings || [];

                                                if (bookings.length === 0) {
                                                    return (
                                                        <div key={toolCallId} className="my-2 p-4 bg-slate-50 text-slate-500 rounded-xl text-center text-xs border border-dashed border-slate-200">
                                                            아직 예약 내역이 없습니다.
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={toolCallId} className="mt-2 space-y-2 w-full">
                                                        <Badge variant="outline" className="mb-2 bg-white">최근 예약 내역 ({bookings.length})</Badge>
                                                        {bookings.map((booking: any) => (
                                                            <div key={booking.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex gap-3 relative overflow-hidden">
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${booking.status === 'confirmed' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                                {booking.image && (
                                                                    <div className="h-16 w-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                                                                        <img src={booking.image} alt={booking.pitch} className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                    <h4 className="font-bold text-slate-800 text-sm truncate">{booking.pitch}</h4>
                                                                    <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                                                                        <span>📅 {booking.date}</span>
                                                                        <span>⏰ {booking.time}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col justify-between items-end">
                                                                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                        {booking.status === 'confirmed' ? '확정됨' : booking.status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            if (toolName === 'createBooking') {
                                                if (result?.success) {
                                                    return (
                                                        <div key={toolCallId} className="mt-2 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-col items-center gap-2 text-center">
                                                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-1">
                                                                <span className="text-xl">🎉</span>
                                                            </div>
                                                            <h4 className="font-bold text-green-800 text-sm">예약이 확정되었습니다!</h4>
                                                            <p className="text-xs text-green-700 leading-relaxed">
                                                                {result.message}<br />
                                                                '내 예약 현황 보여줘'라고 말해서 확인할 수 있습니다.
                                                            </p>
                                                        </div>
                                                    );
                                                } else if (result?.error) {
                                                    return (
                                                        <div key={toolCallId} className="mt-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 flex items-center gap-2">
                                                            <X className="h-4 w-4 flex-shrink-0" />
                                                            <span>{result.error}</span>
                                                        </div>
                                                    );
                                                }
                                            }

                                            // Fallback for checkBooking or other tools
                                            return (
                                                <div key={toolCallId} className="text-xs text-slate-400 mt-1">
                                                    {/* Tool result processed silently */}
                                                </div>
                                            );
                                        })}

                                        {/* Text Content */}
                                        {(() => {
                                            // Get text content from either m.content or parts array
                                            let textContent = m.content || '';

                                            // If content is empty, try to extract from parts
                                            if (!textContent && m.parts) {
                                                const textParts = m.parts.filter((p: any) => p.type === 'text' || (!p.type && typeof p === 'string'));
                                                if (textParts.length > 0) {
                                                    textContent = textParts.map((p: any) => typeof p === 'string' ? p : p.text || p.content || '').join('');
                                                }
                                            }

                                            if (!textContent) return null;

                                            return (
                                                <div className="markdown prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            // Initialize components with proper typing check
                                                            table: ({ node, ...props }) => (
                                                                <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                                                                    <table className="min-w-full divide-y divide-slate-200 text-xs" {...props} />
                                                                </div>
                                                            ),
                                                            th: ({ node, ...props }) => <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700" {...props} />,
                                                            td: ({ node, ...props }) => <td className="px-3 py-2 text-slate-600 border-t border-slate-100" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-1 space-y-0.5" {...props} />,
                                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 my-1 space-y-0.5" {...props} />,
                                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                            a: ({ node, ...props }) => <a className="text-blue-600 hover:underline font-medium" {...props} />,
                                                            p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                                        }}
                                                    >
                                                        {textContent}
                                                    </ReactMarkdown>
                                                </div>
                                            );
                                        })()}

                                        {m.role === 'assistant' && isLoading && messages[messages.length - 1].id === m.id && (
                                            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-slate-400 animate-pulse rounded-sm" />
                                        )}
                                    </div>

                                    {chatError && messages[messages.length - 1].id === m.id && (
                                        <div className="w-full text-center mt-2 p-2 bg-red-50 text-red-500 text-xs rounded-lg border border-red-100">
                                            오류가 발생했습니다. 다시 시도해주세요.
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleFormSubmit} className="p-3 bg-white border-t border-slate-100">
                            <div className="relative flex items-center gap-2">
                                <Input
                                    value={localInput}
                                    onChange={(e) => setLocalInput(e.target.value)}
                                    placeholder="무엇을 도와드릴까요?"
                                    className="pr-12 h-11 rounded-full border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
                                    disabled={isLoading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleFormSubmit(e);
                                        }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className={cn(
                                        "absolute right-1.5 h-8 w-8 rounded-full transition-all duration-200",
                                        localInput.trim() ? "bg-primary hover:bg-primary/90" : "bg-slate-200 text-slate-400 hover:bg-slate-300"
                                    )}
                                    disabled={!localInput.trim() || isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                                AI Agent powered by Gemini • Pitch Booking
                            </div>
                        </form>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
