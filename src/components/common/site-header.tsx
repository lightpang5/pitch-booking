import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
// ⭐ FileText 아이콘을 추가로 import 합니다.
import { UserCircle, FileText } from "lucide-react" 

export async function SiteHeader() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center px-4">
                <div className="mr-4 flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2 font-bold text-xl">
                        ⚽ PitchBook
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <nav className="flex items-center space-x-2 sm:space-x-4">
                        
                        {/* ⭐ 여기에 Docs 버튼을 추가했습니다! (항상 보임) */}
                        <Link href="/docs">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                                <FileText className="w-4 h-4" />
                                Docs
                            </Button>
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-2 sm:gap-4">
                                
                                <Link href="/dashboard">
                                    <Button variant="ghost" size="sm">Dashboard</Button>
                                </Link>
                                <form action={async () => {
                                    'use server'
                                    const supabase = await createClient()
                                    await supabase.auth.signOut()
                                }}>
                                    <Button variant="ghost" size="sm">Logout</Button>
                                </form>
                                <span className="hidden sm:flex text-sm text-muted-foreground items-center gap-2">
                                    <UserCircle className="w-4 h-4" />
                                    {user.email}
                                </span>
                            </div>
                        ) : (
                            <Link href="/login">
                                <Button size="sm">Login</Button>
                            </Link>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    )
}