'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export function LoginForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        setError(null)
        setMessage(null)
        const supabase = createClient()

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
            })
            if (error) {
                setError(error.message)
            } else {
                setMessage("Account created! You can now log in.")
                setIsSignUp(false)
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (error) {
                setError(error.message)
            } else {
                router.push('/')
                router.refresh()
            }
        }
        setLoading(false)
    }

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>{isSignUp ? "Create Account" : "Login"}</CardTitle>
                <CardDescription>
                    {isSignUp ? "Enter details to create a new account" : "Enter your credential to access"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="m@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {error && <div className="text-red-500 text-sm">{error}</div>}
                        {message && <div className="text-green-500 text-sm">{message}</div>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Login")}
                        </Button>

                        <div className="text-center text-sm mt-2">
                            <span className="text-muted-foreground">
                                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                            </span>
                            <button
                                type="button"
                                onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                                className="underline hover:text-primary"
                            >
                                {isSignUp ? "Login" : "Sign Up"}
                            </button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
