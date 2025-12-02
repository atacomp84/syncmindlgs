"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const TeacherRegistrationForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTeacherSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      showError('Şifreler eşleşmiyor. Lütfen kontrol edin.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'teacher', // Rolü açıkça 'teacher' olarak ayarla
          },
          emailRedirectTo: window.location.origin + '/', // Onaydan sonra ana sayfaya yönlendir
        },
      });

      if (error) {
        showError(error.message);
      } else if (data.user) {
        showSuccess('Öğretmen kaydınız başarıyla tamamlandı! Lütfen e-postanızı onaylayın ve giriş yapın.');
        // Kullanıcı e-postasını onayladıktan sonra emailRedirectTo sayesinde otomatik olarak ana sayfaya yönlendirilecek.
        // Bu yüzden burada manuel bir navigate yapmaya gerek yok.
      }
    } catch (error: any) {
      console.error('Teacher signup error:', error);
      showError(error.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleTeacherSignup} className="space-y-4">
      <div>
        <Label htmlFor="teacher-firstName">Adınız</Label>
        <Input
          id="teacher-firstName"
          type="text"
          value={firstName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
          placeholder="Adınızı girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="teacher-lastName">Soyadınız</Label>
        <Input
          id="teacher-lastName"
          type="text"
          value={lastName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
          placeholder="Soyadınızı girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="teacher-email">E-posta Adresiniz</Label>
        <Input
          id="teacher-email"
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="E-posta adresinizi girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="teacher-password">Şifreniz</Label>
        <Input
          id="teacher-password"
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Şifrenizi girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="teacher-confirm-password">Şifre Tekrarı</Label>
        <Input
          id="teacher-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          placeholder="Şifrenizi tekrar girin"
          required
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full py-2" disabled={isLoading}>
        {isLoading ? 'Kaydolunuyor...' : 'Kaydol'}
      </Button>
    </form>
  );
};

export default TeacherRegistrationForm;