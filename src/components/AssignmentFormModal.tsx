"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Send } from 'lucide-react';
import { format, addHours, addDays, setHours, setMinutes, setSeconds } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { lgsCurriculum } from '@/data/lgsCurriculum';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import MultiStepDialog from './MultiStepDialog';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // RadioGroup import edildi

interface Student {
  id: string;
  name: string;
  grade: string;
  user_id: string;
}

interface AssignmentFormModalProps {
  students: Student[];
  teacherId: string;
  onAssignmentSent: () => void;
}

const timeOptions = [
  { value: '6h', label: '6 Saat' },
  { value: '12h', label: '12 Saat' },
  { value: '24h', label: '1 Gün' },
  { value: '48h', label: '2 Gün' },
  { value: '7d', label: '1 Hafta' },
];

const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({ students, teacherId, onAssignmentSent }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'konu_anlatimi' | 'soru_cozumu' | 'okuma'>('soru_cozumu');
  const [questionCount, setQuestionCount] = useState<number | undefined>(undefined);
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const [teacherNote, setTeacherNote] = useState<string>('');
  const [resourceLink, setResourceLink] = useState<string>('');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  
  // Teslim Süresi Yönetimi
  const [dueDateMode, setDueDateMode] = useState<'preset' | 'custom'>('preset');
  const [selectedTimeOption, setSelectedTimeOption] = useState<string>('7d'); // Preset
  const [customDueDate, setCustomDueDate] = useState<Date | undefined>(new Date()); // Custom Date: Varsayılan olarak bugünü seç
  const [customDueTime, setCustomDueTime] = useState<string>(format(new Date(), 'HH:mm')); // Custom Time (HH:mm formatında)

  const calculatePresetDueDate = useCallback((option: string): Date => {
    const now = new Date();
    if (option.endsWith('h')) {
      const hours = parseInt(option.replace('h', ''), 10);
      return addHours(now, hours);
    }
    if (option.endsWith('d')) {
      const days = parseInt(option.replace('d', ''), 10);
      return addDays(now, days);
    }
    return addDays(now, 7); // Varsayılan 1 hafta
  }, []);

  const finalDueDate = useMemo(() => {
    if (dueDateMode === 'preset') {
      return calculatePresetDueDate(selectedTimeOption);
    }
    
    if (customDueDate && customDueTime) {
      const [hours, minutes] = customDueTime.split(':').map(Number);
      let date = customDueDate;
      date = setHours(date, hours);
      date = setMinutes(date, minutes);
      date = setSeconds(date, 0);
      return date;
    }
    return undefined;
  }, [dueDateMode, selectedTimeOption, customDueDate, customDueTime, calculatePresetDueDate]);

  const subtopics = useMemo(() => {
    const subject = lgsCurriculum.find(s => s.name === selectedSubject);
    return subject ? subject.subtopics.flatMap(st => st.name) : [];
  }, [selectedSubject]);

  const resetForm = useCallback(() => {
    setSelectedSubject('');
    setSelectedSubtopic('');
    setAssignmentType('soru_cozumu');
    setQuestionCount(undefined);
    setPageCount(undefined);
    setTeacherNote('');
    setResourceLink('');
    setTargetStudentIds([]);
    
    // Teslim süresi sıfırlama
    setDueDateMode('preset');
    setSelectedTimeOption('7d');
    setCustomDueDate(new Date()); // Sıfırlarken de bugünü seç
    setCustomDueTime(format(new Date(), 'HH:mm'));
  }, []);

  useEffect(() => {
    if (!isDialogOpen) {
      resetForm(); // Modal kapandığında formu sıfırla
    }
  }, [isDialogOpen, resetForm]);

  // Görev tipi değiştiğinde subject ve subtopic'i sıfırla/ayarla
  const handleAssignmentTypeChange = (value: 'konu_anlatimi' | 'soru_cozumu' | 'okuma') => {
    setAssignmentType(value);
    setSelectedSubtopic('');
    setQuestionCount(undefined);
    setPageCount(undefined);
    
    if (value === 'okuma') {
      setSelectedSubject('Okuma');
    } else {
      setSelectedSubject('');
    }
  };

  const isStep1Valid = targetStudentIds.length > 0;
  const isStep2Valid = !!assignmentType;
  const isStep3Valid = useMemo(() => {
    if (assignmentType === 'soru_cozumu') {
      return !!selectedSubject && !!selectedSubtopic && !!questionCount && questionCount > 0;
    }
    if (assignmentType === 'konu_anlatimi') {
      return !!selectedSubject && !!selectedSubtopic;
    }
    if (assignmentType === 'okuma') {
      // Okuma görevinde subject otomatik 'Okuma' olduğu için sadece pageCount kontrol edilir.
      return !!pageCount && pageCount > 0;
    }
    return false;
  }, [selectedSubject, selectedSubtopic, assignmentType, questionCount, pageCount]);
  
  const isStep4Valid = !!finalDueDate;

  const handleSubmit = async () => {
    if (!finalDueDate) {
      showError('Lütfen geçerli bir teslim süresi belirleyin.');
      return;
    }

    const assignmentsToInsert = targetStudentIds.map(studentId => ({
      teacher_id: teacherId,
      student_id: studentId,
      subject: assignmentType === 'okuma' ? 'Okuma' : selectedSubject, // Okuma ise subject 'Okuma'
      subtopic: assignmentType === 'okuma' ? 'Kitap Okuma' : selectedSubtopic, // Okuma ise subtopic 'Kitap Okuma'
      assignment_type: assignmentType,
      question_count: assignmentType === 'soru_cozumu' ? questionCount : null,
      page_count: assignmentType === 'okuma' ? pageCount : null,
      due_at: finalDueDate.toISOString(),
      teacher_note: teacherNote || null,
      resource_link: resourceLink || null,
      status: 'active',
    }));

    const toastId = showLoading('Görevler atanıyor...');

    const { error } = await supabase.from('assignments').insert(assignmentsToInsert);

    dismissToast(toastId);

    if (error) {
      showError('Görev atama başarısız oldu: ' + error.message);
    } else {
      showSuccess(`${targetStudentIds.length} öğrenciye görev başarıyla atandı!`);
      onAssignmentSent();
      setIsDialogOpen(false); // Başarılı kayıttan sonra modalı kapat
    }
  };

  const renderDueDateSelection = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Teslim Süresi Modu <span className="text-red-500">*</span></Label>
        <RadioGroup 
          onValueChange={(value: 'preset' | 'custom') => setDueDateMode(value)} 
          value={dueDateMode}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="preset" id="preset" />
            <Label htmlFor="preset">Hazır Süreler</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom">Özel Tarih/Saat</Label>
          </div>
        </RadioGroup>
      </div>

      {dueDateMode === 'preset' ? (
        <div className="space-y-2">
          <Label htmlFor="dueDate">Son Teslim Süresi <span className="text-red-500">*</span></Label>
          <Select onValueChange={setSelectedTimeOption} value={selectedTimeOption}>
            <SelectTrigger id="dueDate">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Teslim süresi seçin" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label} (Bitiş: {format(calculatePresetDueDate(option.value), "dd MMM HH:mm", { locale: tr })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Özel Tarih <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDueDate ? format(customDueDate, "PPP", { locale: tr }) : <span>Bir tarih seçin</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customDueDate}
                  onSelect={setCustomDueDate}
                  initialFocus
                  locale={tr}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueTime">Özel Saat (HH:MM) <span className="text-red-500">*</span></Label>
            <Input
              id="dueTime"
              type="time"
              value={customDueTime}
              onChange={(e) => setCustomDueTime(e.target.value)}
              required
            />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="resourceLink">Kaynak Linki (Opsiyonel)</Label>
        <Input 
          id="resourceLink" 
          type="url" 
          placeholder="Örn: https://youtube.com/ders-videosu" 
          value={resourceLink} 
          onChange={(e) => setResourceLink(e.target.value)} 
          className="mt-1"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacherNote">Öğretmen Notu (Opsiyonel)</Label>
        <Textarea 
          id="teacherNote" 
          placeholder="Örn: Bu konuya özellikle dikkat et." 
          value={teacherNote} 
          onChange={(e) => setTeacherNote(e.target.value)} 
        />
      </div>
    </div>
  );

  const renderSubjectDetails = () => {
    if (assignmentType === 'okuma') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pageCount">Okunacak Sayfa Sayısı <span className="text-red-500">*</span></Label>
            <Input 
              id="pageCount" 
              type="number" 
              placeholder="Örn: 20" 
              value={pageCount === undefined ? '' : pageCount} 
              onChange={(e) => setPageCount(e.target.value ? parseInt(e.target.value) : undefined)} 
              min="1"
            />
          </div>
        </div>
      );
    }

    // Soru Çözümü veya Konu Anlatımı
    return (
      <div className="space-y-4">
        {/* Ders Seçimi */}
        <div className="space-y-2">
          <Label htmlFor="subject">Ders <span className="text-red-500">*</span></Label>
          <Select onValueChange={(value) => { setSelectedSubject(value); setSelectedSubtopic(''); }} value={selectedSubject}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="Ders Seçin" />
            </SelectTrigger>
            <SelectContent>
              {lgsCurriculum
                .filter(subject => subject.name !== 'Okuma') // 'Okuma' dersini filtrele
                .map(subject => (
                <SelectItem key={subject.name} value={subject.name}>
                  <div className="flex items-center gap-2">
                    <subject.icon className={cn("h-5 w-5 text-transparent bg-clip-text bg-gradient-to-r", subject.gradient)} />
                    {subject.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Alt Konu Seçimi */}
        {selectedSubject && (
          <div className="space-y-2">
            <Label htmlFor="subtopic">Konu/Alt Başlık <span className="text-red-500">*</span></Label>
            <Select onValueChange={setSelectedSubtopic} value={selectedSubtopic}>
              <SelectTrigger id="subtopic">
                <SelectValue placeholder="Konu Seçin" />
              </SelectTrigger>
              <SelectContent>
                {subtopics.map(subtopic => (
                  <SelectItem key={subtopic} value={subtopic}>{subtopic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Soru Sayısı (Soru Çözümü) */}
        {assignmentType === 'soru_cozumu' && (
          <div className="space-y-2">
            <Label htmlFor="questionCount">Soru Sayısı <span className="text-red-500">*</span></Label>
            <Input 
              id="questionCount" 
              type="number" 
              placeholder="Örn: 100" 
              value={questionCount === undefined ? '' : questionCount} 
              onChange={(e) => setQuestionCount(e.target.value ? parseInt(e.target.value) : undefined)} 
              min="1"
            />
          </div>
        )}
      </div>
    );
  };

  const steps = [
    {
      id: 'student-selection',
      title: 'Öğrenci Seçimi',
      component: (
        <div className="space-y-4">
          <Label htmlFor="targetStudents">Hedef Öğrenci(ler) <span className="text-red-500">*</span></Label>
          <Select
            onValueChange={(value) => {
              if (value === 'all') {
                setTargetStudentIds(students.map(s => s.id));
              } else if (targetStudentIds.includes(value)) {
                setTargetStudentIds(targetStudentIds.filter(id => id !== value));
              } else {
                setTargetStudentIds([...targetStudentIds, value]);
              }
            }}
            value={targetStudentIds.length === students.length ? 'all' : ''}
          >
            <SelectTrigger id="targetStudents" className={cn(targetStudentIds.length === 0 && "text-muted-foreground")}>
              <SelectValue placeholder={targetStudentIds.length > 0 ? `${targetStudentIds.length} öğrenci seçildi` : "Öğrenci(ler) seçin"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-blue-600">Tüm Öğrenciler ({students.length})</SelectItem>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id} className={cn(targetStudentIds.includes(student.id) && "bg-accent font-semibold")}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {targetStudentIds.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2 p-2 border rounded-md">
              Seçilenler: {targetStudentIds.map(id => students.find(s => s.id === id)?.name).join(', ')}
            </div>
          )}
        </div>
      ),
      isValid: isStep1Valid,
    },
    {
      id: 'assignment-type',
      title: 'Görev Tipi Seçimi',
      component: (
        <div className="space-y-4">
          <Label>Görev Tipi <span className="text-red-500">*</span></Label>
          <Select onValueChange={handleAssignmentTypeChange} value={assignmentType}>
            <SelectTrigger>
              <SelectValue placeholder="Görev Tipi Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soru_cozumu">Soru Çözümü</SelectItem>
              <SelectItem value="konu_anlatimi">Konu Anlatımı/Tekrarı</SelectItem>
              <SelectItem value="okuma">Okuma</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
      isValid: isStep2Valid,
    },
    {
      id: 'subject-details',
      title: assignmentType === 'okuma' ? 'Sayfa Sayısı' : 'Ders ve Detaylar',
      component: renderSubjectDetails(),
      isValid: isStep3Valid,
    },
    {
      id: 'due-date-note',
      title: 'Teslim Süresi ve Not',
      component: renderDueDateSelection(),
      isValid: isStep4Valid,
    },
  ];

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-lg h-12 shadow-lg transition-all duration-300" 
          title="Öğrencilerinize yeni görevler atayın"
        >
          <Send className="mr-2 h-5 w-5" /> Görev Gönder
        </Button>
      </DialogTrigger>
      <MultiStepDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Yeni Görev Atama"
        description="Öğrencilerinize konu anlatımı, soru çözümü veya okuma görevi atayın."
        steps={steps}
        onFinish={handleSubmit}
        themeColor="orange-red" // Görev Gönder teması
      />
    </Dialog>
  );
};

export default AssignmentFormModal;