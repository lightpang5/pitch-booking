'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface Contact {
    user_id: string
    full_name: string
    email: string
}

interface RecentContactsProps {
    onSelect: (email: string) => void
    ignoreEmails?: string[]
}

export function RecentContacts({ onSelect, ignoreEmails = [] }: RecentContactsProps) {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchContacts() {
            const supabase = createClient()
            const { data, error } = await supabase.rpc('get_recent_contacts')

            if (!error && data) {
                setContacts(data)
            }
            setLoading(false)
        }
        fetchContacts()
    }, [])

    if (loading) return <div className="text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading contacts...</div>

    if (contacts.length === 0) return null

    const filteredContacts = contacts.filter(c => !ignoreEmails.includes(c.email))

    if (filteredContacts.length === 0) return null

    return (
        <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Recent Friends:</p>
            <div className="flex flex-wrap gap-2">
                {filteredContacts.map(contact => (
                    <Button
                        key={contact.user_id}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => onSelect(contact.email)}
                        type="button"
                    >
                        {contact.full_name || contact.email.split('@')[0]}
                    </Button>
                ))}
            </div>
        </div>
    )
}
