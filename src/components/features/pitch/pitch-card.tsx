'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Database } from "@/types/database"

type Pitch = Database['public']['Tables']['pitches']['Row']

interface PitchCardProps {
    pitch: Pitch
}

export function PitchCard({ pitch }: PitchCardProps) {
    // Use first image or placeholder
    const imageUrl = pitch.images && pitch.images.length > 0
        ? pitch.images[0]
        : "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?q=80&w=2070&auto=format&fit=crop"

    return (
        <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
            <div className="relative h-48 w-full">
                <Image
                    src={imageUrl}
                    alt={pitch.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold line-clamp-1">{pitch.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                        ₩{pitch.price_per_hour.toLocaleString()}/hr
                    </Badge>
                </div>
                <div className="flex items-center text-muted-foreground text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="line-clamp-1">{pitch.location}</span>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2 mt-2">
                    {pitch.amenities?.slice(0, 3).map((amenity) => (
                        <span key={amenity} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{amenity}</span>
                    ))}
                    {(pitch.amenities?.length || 0) > 3 && (
                        <span className="text-xs text-muted-foreground self-center">+{(pitch.amenities?.length || 0) - 3} more</span>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/pitches/${pitch.id}`}>
                        View Details
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
