import { createClient } from "@/lib/supabase/server";
import { PitchCard } from "@/components/features/pitch/pitch-card";

export default async function Home() {
  const supabase = await createClient();
  const { data: pitches } = await supabase
    .from("pitches")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-background">
      <div className="py-10">
        <header className="container mx-auto px-4 mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight">구장 예약 시스템</h1>
          <p className="text-muted-foreground mt-2">
            원하는 구장을 선택하고 일정을 확인하세요.
          </p>
        </header>
        
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pitches?.map((pitch) => (
              <PitchCard key={pitch.id} pitch={pitch} />
            ))}
          </div>
          {(!pitches || pitches.length === 0) && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">등록된 구장이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
