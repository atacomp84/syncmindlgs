"use client";

import React, { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile'; // Mobil kontrolü için hook'u kullanacağız

interface Step {
  id: string;
  title: string;
  component: ReactNode;
  isValid?: boolean; // Her adımın geçerliliğini kontrol etmek için
}

interface MultiStepDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: Step[];
  onFinish: () => void;
  initialStep?: number;
  // Yeni: Tema renklerini belirlemek için
  themeColor: 'blue-purple' | 'purple-blue' | 'orange-red';
}

const themeMap = {
  'blue-purple': {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    progressBg: 'bg-blue-600',
    progressTrack: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'purple-blue': {
    primary: 'text-purple-600 dark:text-purple-400',
    secondary: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-purple-600',
    hover: 'hover:bg-purple-700',
    progressBg: 'bg-purple-600',
    progressTrack: 'bg-purple-100 dark:bg-purple-900/30',
  },
  'orange-red': {
    primary: 'text-orange-600 dark:text-orange-400',
    secondary: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    progressBg: 'bg-red-600',
    progressTrack: 'bg-red-100 dark:bg-red-900/30',
  },
};

const MultiStepDialog: React.FC<MultiStepDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  steps,
  onFinish,
  initialStep = 0,
  themeColor,
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const theme = themeMap[themeColor];
  const isMobile = useIsMobile(); // Mobil cihaz kontrolü

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onFinish();
      onOpenChange(false); // Modalı kapat
      setCurrentStep(initialStep); // Adımı sıfırla
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isCurrentStepValid = currentStepData.isValid !== false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setCurrentStep(initialStep);
      }
    }}>
      <DialogContent className="max-w-4xl p-0 max-h-[95vh] overflow-hidden flex flex-col sm:flex-row">
        
        {/* Sol Navigasyon Çubuğu (Sidebar) - Mobil'de gizlenir, sadece başlık ve ilerleme kalır */}
        <div className={cn(
          "w-full sm:w-64 p-6 flex flex-col justify-between border-b sm:border-r sm:border-b-0 flex-shrink-0",
          theme.progressTrack,
          isMobile ? 'p-4' : 'p-6' // Mobil'de daha az padding
        )}>
          <div>
            <h2 className={cn("text-xl font-bold mb-2", theme.primary)}>{title}</h2>
            {!isMobile && <p className="text-sm text-muted-foreground mb-6">{description}</p>}
            
            {/* Adım Listesi - Mobil'de gizlenir */}
            {!isMobile && (
              <nav className="space-y-4">
                {steps.map((step, index) => (
                  <div 
                    key={step.id} 
                    className={cn(
                      "flex items-center cursor-pointer transition-colors",
                      index === currentStep ? theme.primary : "text-muted-foreground hover:text-foreground",
                      index < currentStep && "opacity-70"
                    )}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full border-2 font-bold mr-3 transition-all duration-300",
                      index === currentStep 
                        ? `border-current ${theme.primary} bg-white dark:bg-background`
                        : index < currentStep 
                          ? `border-green-500 text-green-500 bg-green-50 dark:bg-green-900/20`
                          : "border-muted-foreground/50 text-muted-foreground"
                    )}>
                      {index < currentStep ? <CheckCircle className="h-4 w-4 fill-green-500 text-white" /> : index + 1}
                    </div>
                    <span className={cn("text-sm font-medium", index === currentStep && "font-extrabold")}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </nav>
            )}
          </div>
          
          {/* İlerleme Çubuğu - Her zaman gösterilir */}
          <div className={cn(isMobile ? 'mt-0' : 'mt-8')}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Adım {currentStep + 1} / {steps.length}: {currentStepData.title}
            </div>
            <div className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.progressTrack }}>
              <div 
                className="h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ 
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  backgroundColor: theme.progressBg,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sağ İçerik Alanı - Kaydırılabilir Alan */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className={cn("text-2xl font-bold", theme.secondary)}>
              {currentStepData.title}
            </DialogTitle>
          </DialogHeader>
          
          {/* Form içeriği burada yer alır ve kaydırılabilir */}
          <div className="flex-1 min-h-[300px]">
            {currentStepData.component}
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-2 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Geri
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isCurrentStepValid}
              className={cn("w-full sm:w-auto", theme.bg, theme.hover)}
            >
              {isLastStep ? 'Kaydet ve Bitir' : 'İleri'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiStepDialog;