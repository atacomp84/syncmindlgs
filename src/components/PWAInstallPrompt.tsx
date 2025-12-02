"use client";

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Download, Share, X } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

// DeferredPromptEvent, beforeinstallprompt olayının tipini temsil eder
interface DeferredPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false); // Genel prompt görünürlüğü (Oturum bazlı kapatma)
  // hasDismissed state'ini kaldırdık, artık sadece showPrompt'u kullanacağız.

  useEffect(() => {
    // Cihaz ve kurulum durumunu kontrol et
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIPhone = /iphone/.test(userAgent);
    const isIPad = /ipad/.test(userAgent);
    const isIPod = /ipod/.test(userAgent);
    const currentIsIOS = isIPhone || isIPad || isIPod;
    setIsIOS(currentIsIOS);

    const currentIsInstalled = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsInstalled(currentIsInstalled);

    if (currentIsInstalled) {
      return; // Zaten yüklüyse hiçbir şey yapma
    }

    // Android/Desktop için beforeinstallprompt olayını dinle
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as DeferredPromptEvent);
      // Android/Desktop için prompt'u göstermeye hazırız
      setShowPrompt(true); 
      console.log('beforeinstallprompt event captured.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS için doğrudan talimat prompt'unu göster (eğer uygunsa)
    if (currentIsIOS && !currentIsInstalled) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      console.log('PWA installation prompt manually triggered.');

      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);

      if (outcome === 'accepted') {
        showSuccess('Uygulama ana ekranınıza ekleniyor...');
        setIsInstalled(true);
      } else {
        showError('Uygulama yükleme isteği reddedildi.');
      }
      setShowPrompt(false); // Prompt kapatıldıktan sonra banner'ı gizle
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    // Artık localStorage kullanmıyoruz, sadece bu oturum için gizliyoruz.
    setShowPrompt(false);
    showSuccess('Kurulum istemi bu oturum için kapatıldı.');
  }, []);

  if (isInstalled || !showPrompt) {
    return null; // Zaten yüklüyse veya bu oturumda kapatıldıysa hiçbir şey render etme
  }

  // iOS için özel talimatlar diyaloğu
  if (isIOS) {
    return (
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-600 dark:text-blue-400">
              <Download className="mr-2 h-5 w-5" /> Uygulamayı Ana Ekrana Ekle
            </DialogTitle>
            <DialogDescription>
              Bu uygulamayı ana ekranınıza eklemek için Safari'de alttaki <span className="font-bold">Paylaş</span> (<Share className="inline-block h-4 w-4 -translate-y-[3px]" />) butonuna tıklayın ve ardından <span className="font-bold">'Ana Ekrana Ekle'</span> seçeneğini seçin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDismiss} className="w-full">
              <X className="mr-2 h-4 w-4" /> Anladım / Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Android/Desktop için, eğer deferredPrompt varsa (yani tarayıcı yüklemeye izin veriyorsa) bir banner göster
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-primary text-primary-foreground shadow-2xl flex items-center justify-between sm:justify-center gap-4">
        <div className="flex items-center gap-2">
          <Download className="h-6 w-6" />
          <p className="font-semibold text-sm sm:text-base">SyncMind'ı cihazınıza yükleyin!</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleInstallClick} 
            className="bg-green-500 hover:bg-green-600 text-white font-bold"
            size="sm"
          >
            Yükle
          </Button>
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="text-primary-foreground hover:bg-primary/80"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;