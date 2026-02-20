'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { respondToInvitation } from "@/app/actions/invitation"
import { toast } from "sonner"
import { Check, X, Loader2 } from "lucide-react"

interface InvitationActionsProps {
    bookingId: string
}

export function InvitationActions({ bookingId }: InvitationActionsProps) {
    const [isPending, startTransition] = useTransition()
    const [actionType, setActionType] = useState<'accepted' | 'declined' | null>(null)

    const handleResponse = (status: 'accepted' | 'declined') => {
        setActionType(status)
        startTransition(async () => {
            const result = await respondToInvitation(bookingId, status)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(status === 'accepted' ? "Invitation accepted!" : "Invitation declined.")
            }
            setActionType(null)
        })
    }

    return (
        <div className="flex gap-2">
            <Button
                size="sm"
                onClick={() => handleResponse('accepted')}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
            >
                {isPending && actionType === 'accepted' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                    <Check className="w-4 h-4 mr-1" />
                )}
                Accept
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={() => handleResponse('declined')}
                disabled={isPending}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
                {isPending && actionType === 'declined' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                    <X className="w-4 h-4 mr-1" />
                )}
                Decline
            </Button>
        </div>
    )
}
