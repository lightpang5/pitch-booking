export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    role: 'user' | 'admin'
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'user' | 'admin'
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'user' | 'admin'
                    created_at?: string
                }
            }
            pitches: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    location: string
                    price_per_hour: number
                    images: string[] | null
                    amenities: string[] | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    location: string
                    price_per_hour: number
                    images?: string[] | null
                    amenities?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    location?: string
                    price_per_hour?: number
                    images?: string[] | null
                    amenities?: string[] | null
                    created_at?: string
                }
            }
            bookings: {
                Row: {
                    id: string
                    user_id: string
                    pitch_id: string
                    start_time: string
                    end_time: string
                    total_price: number
                    status: 'pending' | 'confirmed' | 'cancelled'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    pitch_id: string
                    start_time: string
                    end_time: string
                    total_price: number
                    status?: 'pending' | 'confirmed' | 'cancelled'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    pitch_id?: string
                    start_time?: string
                    end_time?: string
                    total_price?: number
                    status?: 'pending' | 'confirmed' | 'cancelled'
                    created_at?: string
                }
            }
        }
    }
}
