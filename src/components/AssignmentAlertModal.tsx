"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { BellRing, Clock, Book, Send, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { showSuccess, showError } from '@/utils/toast';

interface Assignment {
  id: string;
  subject: string;
  subtopic: string;
  assignment_type: 'konu_anlatimi' | 'soru_cozumu' | 'okuma';
  question_count?: number;
  page_count?: number;
  due_at: string;
  created_at: string;
  status: 'active' | 'pending_approval' | 'completed'; // Eklendi
}

interface Profile {
  id: string;
  last_assignment_check_at: string | null;
}

interface AssignmentAlertModalProps {
  assignments: Assignment[];
  profile: Profile | null;
  onMarkAsSeen: () => void;
}

const AssignmentAlertModal: React.FC<AssignmentAlertModalProps> = ({ assignments, profile, onMarkAsSeen }) => {
  const { user } = useSession();
  const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const checkNewAssignments = useCallback(() => {
    if (!profile || !profile.last_assignment_check_at) {
      // Eğer hiç kontrol zamanı yoksa, tüm aktif görevleri yeni kabul et
      const activeAssignments = assignments.filter(a => new Date(a.due_at) > new Date() && a.status === 'active');
      setNewAssignments(activeAssignments);
      if (activeAssignments.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    const lastCheckTime = parseISO(profile.last_assignment_check_at);
    
    const newActiveAssignments = assignments.filter(a => {
      const assignmentCreationTime = parseISO(a.created_at);
      const isNew = assignmentCreationTime > lastCheckTime;
      const isActive = new Date(a.due_at) > new Date() && a.status === 'active';
      return isNew && isActive;
    });

    setNewAssignments(newActiveAssignments);
    if (newActiveAssignments.length > 0) {
      setIsOpen(true);
    }
  }, [assignments, profile]);

  useEffect(() => {
    if (profile) {
      checkNewAssignments();
    }
  }, [profile, checkNewAssignments]);

  const handleClose = async () => {
    if (!user) return;

    // 1. Modalı kapat
    setIsOpen(false);

    // 2. last_assignment_check_at'i güncelle
    const { error } = await supabase
      .from('profiles')
      .update({ last_assignment_check_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update last_assignment_check_at:', error);
      showError('Yeni görevler görüldü olarak işaretlenemedi.');
    } else {
      // Başarılı olursa, DashboardPage'deki verileri yenilemek için callback çağır
      onMarkAsSeen();
      showSuccess(`${newAssignments.length} yeni görev görüntülendi.`);
    }
  };

  if (!isOpen || newAssignments.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
            <BellRing className="mr-2 h-6 w-6 animate-pulse" /> {newAssignments.length} Yeni Görev Atandı!
          </DialogTitle>
          <DialogDescription>
            Öğretmeniniz size yeni görevler atadı. Lütfen en kısa sürede kontrol edin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-64 overflow-y-auto py-2">
          {newAssignments.map((assignment) => {
            const TypeIcon = assignment.assignment_type === 'konu_anlatimi' ? Book : assignment.assignment_type === 'okuma' ? Book : Send;
            const typeText = assignment.assignment_type === 'konu_anlatimi' ? 'Konu Anlatımı' : assignment.assignment_type === 'okuma' ? `Okuma (${assignment.page_count} Sayfa)` : `${assignment.question_count} Soru Çözümü`;
            
            return (
              <div key={assignment.id} className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40">
                <p className="font-semibold text-blue-800 dark:text-blue-200">{assignment.subject} - {assignment.subtopic}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <TypeIcon className="h-4 w-4" /> {typeText}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Teslim: {format(parseISO(assignment.due_at), 'dd MMM HH:mm', { locale: tr })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full bg-red-600 hover:bg-red-700">
            Görevleri Gördüm <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentAlertModal;