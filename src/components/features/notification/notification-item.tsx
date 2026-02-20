'use client'

import { useTransition } from "react"
import { markNotificationRead } from "@/app/actions/notification"
import { format } from "date-fns"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationItemProps {
    notification: {
        id: string
        message: string
        created_at: string
        type?: string
    }
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const [isPending, startTransition] = useTransition()

    const handleDismiss = () => {
        startTransition(async () => {
            await markNotificationRead(notification.id)
        })
    }

    return (
        <div
            className={cn(
                "p-4 rounded-lg border flex justify-between items-start gap-4 transition-opacity",
                notification.type === 'invite' ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100",
                isPending && "opacity-50 pointer-events-none"
            )}
        >
            <div className="flex-grow">
                <p className="text-sm font-medium text-slate-900">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.created_at), 'MMM d, p')}
                </p>
            </div>
            <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-slate-900 transition-colors pt-1"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
