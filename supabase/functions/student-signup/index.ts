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

serve(async (req: Request) => { // req parametresine Request tipi eklendi
  console.log('Edge Function: student-signup received a request.'); // İstek alındığını logla

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, teacherCode, firstName, lastName } = await req.json();

    if (!email || !password || !teacherCode) {
      return new Response(JSON.stringify({ error: 'Email, password, and teacher code are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Yönetici işlemleri için service role key ile Supabase istemcisi oluştur
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. teacherCode kullanarak teacher_id'yi bul
    const { data: teacherProfile, error: teacherError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('teacher_code', teacherCode)
      .single();

    if (teacherError || !teacherProfile) {
      console.error('Teacher not found or error fetching teacher:', teacherError);
      return new Response(JSON.stringify({ error: 'Invalid teacher code.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const teacherId = teacherProfile.id;

    // 2. Öğrenci kullanıcısını kaydet
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Öğrenciler için e-postayı otomatik onayla
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'student', // handle_new_user trigger'ı için rolü açıkça ayarla
      },
    });

    if (userError || !userData.user) {
      console.error('Error creating student user:', userError);
      return new Response(JSON.stringify({ error: userError?.message || 'Failed to create student user.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const studentUserId = userData.user.id;

    // 3. public.students tablosuna ekle
    const { error: studentInsertError } = await supabaseAdmin
      .from('students')
      .insert({
        user_id: studentUserId,
        teacher_id: teacherId,
        name: `${firstName || ''} ${lastName || ''}`.trim(), // Ad ve soyadı birleştir
        grade: null, // Sınıf daha sonra öğretmen tarafından eklenebilir
      });

    if (studentInsertError) {
      console.error('Error inserting student into students table:', studentInsertError);
      // Öğrenci ekleme başarısız olursa kullanıcı oluşturmayı geri al
      await supabaseAdmin.auth.admin.deleteUser(studentUserId);
      return new Response(JSON.stringify({ error: studentInsertError.message || 'Failed to link student to teacher.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Student registered successfully!', studentId: studentUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});