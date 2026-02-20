import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AvailabilityChecker } from "@/components/features/booking/availability-checker";
import { MapPin, Info } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface PitchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PitchDetailPage({ params }: PitchDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pitch } = await supabase
    .from("pitches")
    .select("*")
    .eq("id", id)
    .single();

  if (!pitch) {
    notFound();
  }

  const imageUrl = pitch.images && pitch.images.length > 0
    ? pitch.images[0]
    : "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?q=80&w=2070&auto=format&fit=crop";

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative h-[300px] w-full">
        <Image
          src={imageUrl}
          alt={pitch.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-end">
          <div className="container mx-auto px-4 pb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{pitch.name}</h1>
            <div className="flex items-center text-white/90">
              <MapPin className="w-5 h-5 mr-1" />
              <span>{pitch.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Side */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                구장 정보
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">시간당 이용료</p>
                  <p className="text-2xl font-bold text-primary">
                    ₩{pitch.price_per_hour.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">편의 시설</p>
                  <div className="flex flex-wrap gap-2">
                    {pitch.amenities?.map((amenity: string) => (
                      <Badge key={amenity} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
                {pitch.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">상세 설명</p>
                    <p className="text-sm leading-relaxed">{pitch.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scheduler Side */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold">예약 스케줄</h2>
              </div>
              <div className="p-2">
                <AvailabilityChecker pitchId={id} pricePerHour={pitch.price_per_hour} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
