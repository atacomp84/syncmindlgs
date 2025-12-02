"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const StudentRegistrationForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      showError('Şifreler eşleşmiyor. Lütfen kontrol edin.');
      setIsLoading(false);
      return;
    }

    try {
      // Edge Fonksiyonunu çağır
      const response = await fetch('https://hlniqpycezakwhbdxlcg.supabase.co/functions/v1/student-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName, teacherCode }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('Öğrenci kaydı başarıyla tamamlandı! Lütfen giriş yapın.');
        navigate('/'); // Giriş sayfasına yönlendir
      } else {
        showError(data.error || 'Öğrenci kaydı sırasında bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Student signup error:', error);
      showError('Ağ hatası veya sunucuya ulaşılamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleStudentSignup} className="space-y-4">
      <div>
        <Label htmlFor="student-firstName">Adınız</Label>
        <Input
          id="student-firstName"
          type="text"
          value={firstName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
          placeholder="Adınızı girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="student-lastName">Soyadınız</Label>
        <Input
          id="student-lastName"
          type="text"
          value={lastName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
          placeholder="Soyadınızı girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="student-email">E-posta Adresiniz</Label>
        <Input
          id="student-email"
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="E-posta adresinizi girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="student-password">Şifreniz</Label>
        <Input
          id="student-password"
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Şifrenizi girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="student-confirm-password">Şifre Tekrarı</Label>
        <Input
          id="student-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          placeholder="Şifrenizi tekrar girin"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="teacherCode">Öğretmen Kodunuz</Label>
        <Input
          id="teacherCode"
          type="text"
          value={teacherCode}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherCode(e.target.value)}
          placeholder="Öğretmen kodunuzu girin"
          required
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Öğretmen kodunuzu, koçunuzun panosundaki "Öğretmen Kodunu Göster" bağlantısından alabilirsiniz.
        </p>
      </div>
      <Button type="submit" className="w-full py-2" disabled={isLoading}>
        {isLoading ? 'Kaydolunuyor...' : 'Kaydol'}
      </Button>
    </form>
  );
};

export default StudentRegistrationForm;