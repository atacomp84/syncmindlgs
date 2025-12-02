"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { lgsCurriculum } from '@/data/lgsCurriculum';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
import MultiStepDialog from './MultiStepDialog';

interface Student {
  id: string;
  name: string;
}

interface TrialExamFormProps {
  students: Student[];
  onSuccess: () => void;
  teacherId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExamData = {
  correct: string;
  incorrect: string;
  blank: string;
};

const TrialExamForm = ({ students, onSuccess, teacherId, isOpen, onOpenChange }: TrialExamFormProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [examDate, setExamDate] = useState<Date | undefined>(new Date());
  const [examData, setExamData] = useState<Record<string, ExamData>>(
    lgsCurriculum
      .filter(s => s.name !== 'Okuma') // Okuma dersi deneme sınavı sonuçlarına dahil edilmiyor
      .reduce((acc, subject) => {
        acc[subject.name] = { correct: '0', incorrect: '0', blank: '0' };
        return acc;
      }, {} as Record<string, ExamData>)
  );

  useEffect(() => {
    if (!isOpen) {
      // Modal kapandığında formu sıfırla
      setSelectedStudentId('');
      setExamDate(new Date());
      setExamData(
        lgsCurriculum
          .filter(s => s.name !== 'Okuma')
          .reduce((acc, subject) => {
            acc[subject.name] = { correct: '0', incorrect: '0', blank: '0' };
            return acc;
          }, {} as Record<string, ExamData>)
      );
    }
  }, [isOpen]);

  const handleInputChange = (subject: string, field: keyof ExamData, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setExamData(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: numericValue,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!teacherId) {
      showError('Öğretmen ID bilgisi eksik. Lütfen tekrar giriş yapın.');
      return;
    }

    const toastId = showLoading('Deneme sınavı sonuçları kaydediliyor...');

    const recordsToInsert = Object.entries(examData)
      .filter(([, data]) => 
        parseInt(data.correct || '0', 10) > 0 || 
        parseInt(data.incorrect || '0', 10) > 0 || 
        parseInt(data.blank || '0', 10) > 0
      )
      .map(([subject, data]) => {
        const correct = parseInt(data.correct || '0', 10);
        const incorrect = parseInt(data.incorrect || '0', 10);
        const blank = parseInt(data.blank || '0', 10);
        const netScore = correct - incorrect / 3;

        return {
          student_id: selectedStudentId,
          teacher_id: teacherId,
          exam_date: examDate!.toISOString(),
          subject,
          correct_count: correct,
          incorrect_count: incorrect,
          blank_count: blank,
          net_score: netScore,
        };
      });

    if (recordsToInsert.length === 0) {
      dismissToast(toastId);
      showError('Kaydedilecek veri bulunamadı. Lütfen en az bir ders için sıfırdan farklı bir değer girin.');
      return;
    }

    const { error } = await supabase.from('trial_exams').insert(recordsToInsert);

    dismissToast(toastId);
    if (error) {
      showError(`Sonuçlar kaydedilemedi: ${error.message}`);
    } else {
      showSuccess('Deneme sınavı sonuçları başarıyla kaydedildi!');
      onSuccess();
    }
  };

  const examSubjects = lgsCurriculum.filter(s => s.name !== 'Okuma');

  const isStep1Valid = !!selectedStudentId && !!examDate;
  const isStep2Valid = useMemo(() => {
    // En az bir ders için doğru, yanlış veya boş sayısı girilmiş olmalı
    return Object.values(examData).some(data => 
      parseInt(data.correct || '0', 10) > 0 || 
      parseInt(data.incorrect || '0', 10) > 0 || 
      parseInt(data.blank || '0', 10) > 0
    );
  }, [examData]);

  const steps = [
    {
      id: 'student-date-selection',
      title: 'Öğrenci ve Tarih Seçimi',
      component: (
        <div className="space-y-4">
          <div>
            <Label>Öğrenci <span className="text-red-500">*</span></Label>
            <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Bir öğrenci seçin..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sınav Tarihi <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !examDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "PPP") : <span>Bir tarih seçin</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={setExamDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ),
      isValid: isStep1Valid,
    },
    {
      id: 'exam-results-entry',
      title: 'Sınav Sonuçları Girişi',
      component: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
          {examSubjects.map(subject => (
            <div key={subject.name} className="p-3 border rounded-md">
              <h3 className={cn("font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r", subject.gradient)}>{subject.name}</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor={`${subject.name}-correct`}>Doğru</Label>
                  <Input
                    id={`${subject.name}-correct`}
                    type="number"
                    value={examData[subject.name].correct}
                    onChange={e => handleInputChange(subject.name, 'correct', e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="D"
                  />
                </div>
                <div>
                  <Label htmlFor={`${subject.name}-incorrect`}>Yanlış</Label>
                  <Input
                    id={`${subject.name}-incorrect`}
                    type="number"
                    value={examData[subject.name].incorrect}
                    onChange={e => handleInputChange(subject.name, 'incorrect', e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="Y"
                  />
                </div>
                <div>
                  <Label htmlFor={`${subject.name}-blank`}>Boş</Label>
                  <Input
                    id={`${subject.name}-blank`}
                    type="number"
                    value={examData[subject.name].blank}
                    onChange={e => handleInputChange(subject.name, 'blank', e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="B"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
      isValid: isStep2Valid,
    },
  ];

  return (
    <MultiStepDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Deneme Sınavı Sonucu Gir"
      description="Öğrencilerinizin deneme sınavı sonuçlarını ders bazında girin."
      steps={steps}
      onFinish={handleSubmit}
      themeColor="blue-purple" // Deneme Girişi teması
    />
  );
};

export default TrialExamForm;