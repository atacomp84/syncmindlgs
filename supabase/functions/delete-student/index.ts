/// <reference lib="dom" />

// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Declare Deno global for local TypeScript server
declare global {
  namespace Deno {
    namespace env {
      function get(key: string): string | undefined;
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function requires the user to be authenticated.
    // The supabase client on the frontend will automatically send the auth header.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the student user ID from the request body.
    const { studentUserId } = await req.json();

    if (!studentUserId) {
      return new Response(JSON.stringify({ error: 'Öğrenci kullanıcı IDsi gereklidir.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deleting the user from auth.users will cascade and delete related data
    // in public.profiles and public.students due to 'ON DELETE CASCADE' constraints.
    // This will also clean up all assignments related to the student.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentUserId);

    if (deleteError) {
      console.error('Öğrenci kullanıcısı silinirken hata:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message || 'Öğrenci kullanıcısı silinemedi.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Öğrenci ve ilgili tüm verileri başarıyla silindi.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function hatası:', error);
    const message = error instanceof Error ? error.message : 'Dahili sunucu hatası.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});