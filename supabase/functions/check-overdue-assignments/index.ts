/// <reference lib="dom" />

// Declare Deno global if not found by local TypeScript setup
declare global {
  namespace Deno {
    namespace env {
      function get(key: string): string | undefined;
    }
  }
}

// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverdueAssignment {
  id: string;
  due_at: string;
  status: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Yönetici işlemleri için service role key ile Supabase istemcisi oluştur
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // Süresi dolmuş aktif görevleri bul
    const { data: overdueAssignments, error: fetchError } = await supabaseAdmin
      .from('assignments')
      .select('id, due_at, status')
      .eq('status', 'active')
      .lt('due_at', now); // due_at şimdi'den küçük olanlar

    if (fetchError) {
      console.error('Süresi dolmuş görevler alınırken hata:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (overdueAssignments && overdueAssignments.length > 0) {
      console.log(`${overdueAssignments.length} adet süresi dolmuş aktif görev bulundu.`);

      const assignmentIdsToUpdate = overdueAssignments.map((a: OverdueAssignment) => a.id);

      // Bu görevleri 'completed' durumuna güncelle ve süre sonuyla reddedildi olarak işaretle
      const { error: updateError } = await supabaseAdmin
        .from('assignments')
        .update({ status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' })
        .in('id', assignmentIdsToUpdate);

      if (updateError) {
        console.error('Süresi dolmuş görevler güncellenirken hata:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: `${overdueAssignments.length} görev başarıyla süre sonuyla reddedildi olarak işaretlendi.`, updatedIds: assignmentIdsToUpdate }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Süresi dolmuş aktif görev bulunamadı.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Edge Function hatası:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Dahili sunucu hatası.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});