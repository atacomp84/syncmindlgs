"use client";

import { Link } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from "react"; // useEffect import edildi

const Index = () => {
  const { isLoading } = useSession();

  useEffect(() => {
    // Supabase'in e-posta onay linkinden gelen hash'i yakalamak için
    const handleAuthHash = async () => {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
        // Supabase'in oturumu işlemesini bekle
        await supabase.auth.getSession();
        
        // Hash'i temizle. Bu, React Router'ın 404'e gitmesini engeller.
        window.history.replaceState(null, '', window.location.pathname);
        
        // SessionContext, SIGNED_IN olayını yakalayıp /dashboard'a yönlendirecektir.
      }
    };
    handleAuthHash();
  }, []);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center mb-6 flex flex-col items-center">
          <img src="/logo.png" alt="SyncMind Logo" className="h-28 w-auto" />
          <p className="text-muted-foreground mt-4 text-lg">
            Hedeflerine Ulaşmanın En Senkronize Yolu.
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          view="sign_in"
          showLinks={false}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(222.2 47.4% 11.2%)',
                  brandAccent: 'hsl(217.2 91.2% 59.8%)',
                },
              },
            },
          }}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'E-posta adresiniz',
                password_label: 'Şifreniz',
                email_input_placeholder: 'E-posta adresinizi girin',
                password_input_placeholder: 'Şifrenizi girin',
                button_label: 'Giriş Yap',
                social_provider_text: 'Şununla giriş yap',
              },
            },
          }}
        />
        <div className="text-center mt-4">
          <Link to="/register" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Hesabınız yok mu? Kaydolun
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;