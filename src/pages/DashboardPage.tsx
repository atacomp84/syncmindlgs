"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { LogOut, Code, Book, Clock, CheckCircle, Hourglass, ThumbsUp, ThumbsDown, HelpCircle, Send, Trash2, BarChart2, Settings, ZoomIn, Users, XCircle, FileText, ArrowUp, ArrowDown, ArrowRight, Copy, ArrowLeft, Target, ScrollText, ClipboardCheck, Link, BellRing } from 'lucide-react';
import { lgsCurriculum } from '@/data/lgsCurriculum';
import Fireworks from '@/components/Fireworks';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, LineChart, Line } from 'recharts';
import TrialExamForm from '@/components/TrialExamForm';
import BadgeDisplay from '@/components/BadgeDisplay';
import BadgeAnimation from '@/components/BadgeAnimation';
import AssignmentFormModal from '@/components/AssignmentFormModal';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import CountdownTimer from '@/components/CountdownTimer';
import AssignmentAlertModal from '@/components/AssignmentAlertModal'; // Yeni import
import { parseISO } from 'date-fns'; // parseISO import edildi

interface Student { 
  id: string;
  name: string; 
  grade: string; 
  teacher_id: string; 
  user_id: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    role: 'teacher' | 'student';
    teacher_code?: string;
    last_assignment_check_at: string | null; // Öğrenci profilinden çekilen son kontrol zamanı
  };
}
interface Profile { 
  id: string; 
  first_name: string; 
  last_name: string; 
  role: 'teacher' | 'student'; 
  teacher_code?: string; 
  last_assignment_check_at: string | null; // last_assignment_check_at artık kesinlikle string | null
}
interface Assignment { 
  id: string; 
  student_id: string; 
  subject: string;
  subtopic: string;
  assignment_type: 'konu_anlatimi' | 'soru_cozumu' | 'okuma';
  question_count?: number; 
  page_count?: number;
  due_at: string; 
  status: 'active' | 'pending_approval' | 'completed'; 
  is_rejected_by_deadline: boolean; 
  rejection_reason: 'teacher' | 'deadline' | null; 
  correct_count?: number; 
  incorrect_count?: number; 
  blank_count?: number; 
  created_at: string; 
  teacher_id: string; 
  teacher_note?: string;
  resource_link?: string;
}
interface TrialExam {
  id: string;
  student_id: string;
  exam_date: string;
  subject: string;
  correct_count: number;
  incorrect_count: number;
  blank_count: number;
  net_score: number;
  teacher_id: string;
}
interface Badge {
  id: string;
  user_id: string;
  teacher_id: string;
  badge_type: 'SÜPER' | 'MEGA' | 'UZMAN';
}
interface AnalysisData { correct: number; incorrect: number; blank: number; }
type AnalysisItem = { name: string; Doğru: number; Yanlış: number; Boş: number; Net: number; totalQuestions: number; };
interface TrialExamSession {
  name: string;
  fullName: string;
  timestamp: string;
  [key: string]: any;
}

async function retryOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  retries = 3,
  delay = 1000,
  errorMessage: string = 'Operation failed after multiple attempts.'
): Promise<{ data: T | null; error: any }> {
  for (let i = 0; i < retries; i++) {
    const result = await operation();
    if (!result.error) {
      return result;
    }
    console.warn(`Attempt ${i + 1} failed: ${result.error.message}. Retrying in ${delay}ms...`);
    if (i < retries - 1) {
      await new Promise(res => setTimeout(res, delay));
    }
  }
  return { data: null, error: new Error(errorMessage) };
}

const DashboardPage = () => {
  const { user, session, isLoading } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentData, setStudentData] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [trialExams, setTrialExams] = useState<TrialExam[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [animatedBadge, setAnimatedBadge] = useState<'SÜPER' | 'MEGA' | 'UZMAN' | null>(null);
  const [assignmentToSubmit, setAssignmentToSubmit] = useState<Assignment | null>(null);
  const [assignmentToReview, setAssignmentToReview] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [assignmentForAnalysis, setAssignmentForAnalysis] = useState<Assignment | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData>({ correct: 0, incorrect: 0, blank: 0 });
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTeacherTab, setActiveTeacherTab] = useState('management');
  const [isTrialExamDialogOpen, setIsTrialExamDialogOpen] = useState(false);
  const [examSessionToDelete, setExamSessionToDelete] = useState<TrialExamSession | null>(null);
  const [isStudentManagementOpen, setIsStudentManagementOpen] = useState(false); 
  const [isSelfAnalysisModalOpen, setIsSelfAnalysisModalOpen] = useState(false); 
  
  const [openStudentAccordions, setOpenStudentAccordions] = useState<string[]>([]);
  const [openStudentSubjectAccordions, setOpenStudentSubjectAccordions] = useState<Record<string, string[]>>({});

  const [studentModalDetailSubject, setStudentModalDetailSubject] = useState<string | null>(null);
  const [studentModalDetailSubtopic, setStudentModalDetailSubtopic] = useState<string | null>(null);
  const [studentModalOpenAccordions, setStudentModalOpenAccordions] = useState<string[]>([]);

  const [teacherAnalysisSubject, setTeacherAnalysisSubject] = useState<string | null>(null);
  const [teacherAnalysisSubtopic, setTeacherAnalysisSubtopic] = useState<string | null>(null);
  const [teacherAnalysisOpenAccordions, setTeacherAnalysisOpenAccordions] = useState<string[]>([]);


  const handleTeacherTabChange = (value: string) => { setActiveTeacherTab(value); };

  // Görev listelerini hesaplarken süresi dolanları kontrol et
  const now = useMemo(() => new Date(), []);

  const activeAssignments = useMemo(() => assignments.filter(a => 
    a.status === 'active' && new Date(a.due_at) > now
  ), [assignments, now]);

  const pendingAssignments = useMemo(() => assignments.filter(a => a.status === 'pending_approval'), [assignments]);
  
  const completedAssignments = useMemo(() => assignments.filter(a => 
    a.status === 'completed' || (a.status === 'active' && new Date(a.due_at) <= now)
  ).map(a => {
    // Eğer aktifken süresi dolmuşsa, durumu manuel olarak güncelle
    if (a.status === 'active' && new Date(a.due_at) <= now) {
      return { ...a, status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' } as Assignment;
    }
    return a;
  }), [assignments, now]);


  useEffect(() => {
    if (user && !profile) {
      const getProfile = async () => {
        const { data, error } = await retryOperation(
          async () => {
            // last_assignment_check_at alanını da çekiyoruz
            const { data, error } = await supabase.from('profiles').select('*, last_assignment_check_at').eq('id', user.id).single();
            return { data, error };
          },
          3, 1000, 'Profil bilgileri alınamadı.'
        );
        if (error) {
          showError(error.message);
        } else {
          // last_assignment_check_at null veya string olmalı
          const profileData = data as Profile | null;
          if (profileData && profileData.last_assignment_check_at === undefined) {
             // Eğer undefined gelirse (ki gelmemeli, çünkü SQL'de default NOW() yaptık), null olarak kabul et
             profileData.last_assignment_check_at = null;
          }
          setProfile(profileData);
        }
      };
      getProfile();
    }
  }, [user, profile]);

  const fetchStudents = useCallback(async () => {
    if (!user || profile?.role !== 'teacher') return [];
    const { data: studentsData, error: studentsError } = await retryOperation(
      async () => {
        // Öğrenci verilerini çekerken profile bilgisini de çekiyoruz
        const { data, error } = await supabase.from('students').select('*, profile:profiles(id, first_name, last_name, role, last_assignment_check_at)').eq('teacher_id', user.id);
        return { data, error };
      },
      3, 1000, 'Öğrenciler alınamadı.'
    );
    if (studentsError) {
      showError(studentsError.message);
      return [];
    }
    setStudents(studentsData as Student[] || []);
    return studentsData as Student[] || [];
  }, [user, profile?.role]);

  const fetchStudentData = useCallback(async () => {
    if (!user || profile?.role !== 'student') return null;
    const { data: fetchedStudentData, error: studentError } = await retryOperation(
      async () => {
        const { data, error } = await supabase.from('students').select('id').eq('user_id', user.id).single();
        return { data, error };
      },
      3, 1000, "Öğrenci verileri alınamadı."
    );
    if (studentError) {
      console.error("Student data not found in 'students' table for user:", user.id, studentError);
      return null;
    }
    return fetchedStudentData as { id: string } | null;
  }, [user, profile?.role]);

  const fetchAssignments = useCallback(async (currentStudentData: { id: string } | null) => {
    if (!user || !profile) return;

    let studentIdForQuery: string | null = null;
    if (profile.role === 'student') {
      if (!currentStudentData) return;
      studentIdForQuery = currentStudentData.id;
    }

    let assignmentQuery = supabase.from('assignments').select('*, teacher_note, resource_link, subject, subtopic').order('created_at', { ascending: false });
    if (profile.role === 'student' && studentIdForQuery) {
      assignmentQuery = assignmentQuery.eq('student_id', studentIdForQuery);
    } else if (profile.role === 'teacher') {
      assignmentQuery = assignmentQuery.eq('teacher_id', user.id);
    }
    
    const { data: assignmentsData, error: assignmentsError } = await retryOperation(
      async () => {
        const { data, error } = await assignmentQuery;
        return { data, error };
      },
      3, 1000, 'Görevler alınamadı.'
    );
    
    if (assignmentsError) {
      showError(assignmentsError.message);
    } else {
      const typedData = assignmentsData as Assignment[] || [];
      if (profile.role === 'student') {
        setAssignments(typedData);
      } else if (profile.role === 'teacher') {
        setTeacherAssignments(typedData);
      }
    }
  }, [user, profile]);


  const fetchOtherData = useCallback(async (currentStudents: Student[], currentStudentData: { id: string } | null) => {
    if (!user || !profile) return;
    
    let studentIdForQuery: string | null = null;
    if (profile.role === 'student') {
      if (!currentStudentData) return;
      studentIdForQuery = currentStudentData.id;
    }

    let trialExamsQuery = supabase.from('trial_exams').select('id, student_id, teacher_id, exam_date, subject, correct_count, incorrect_count, blank_count, net_score').order('exam_date', { ascending: true });
    
    if (profile.role === 'student' && studentIdForQuery) {
      trialExamsQuery = trialExamsQuery.eq('student_id', studentIdForQuery);
    } else if (profile.role === 'teacher') {
      trialExamsQuery = trialExamsQuery.eq('teacher_id', user.id);
    }
    
    const { data: trialExamsData, error: trialExamsError } = await retryOperation(
      async () => {
        const { data, error } = await trialExamsQuery;
        return { data, error };
      },
      3, 1000, 'Deneme sınavı verileri alınamadı.'
    );
    
    if (trialExamsError) {
      console.error('Deneme sınavı verileri alınırken hata:', trialExamsError);
      showError(trialExamsError.message);
    } else {
      setTrialExams(trialExamsData as TrialExam[] || []);
    }

    let badgesQuery = supabase.from('badges').select('*');
    if (profile.role === 'student') badgesQuery = badgesQuery.eq('user_id', user.id);
    else if (profile.role === 'teacher' && currentStudents.length > 0) badgesQuery = badgesQuery.in('user_id', currentStudents.map(s => s.user_id));
    
    const { data: badgesData, error: badgesError } = await retryOperation(
      async () => {
        const { data, error } = await badgesQuery;
        return { data, error };
      },
      3, 1000, 'Rozetler alınamadı.'
    );

    if (badgesError) {
      showError(badgesError.message);
    } else {
      setBadges(badgesData as Badge[] || []);
    }

  }, [user, profile]);

  const fetchAllData = useCallback(async () => {
    if (!user || !profile) return;

    let currentStudents: Student[] = students;
    let currentStudentData: { id: string } | null = studentData;

    if (profile.role === 'teacher') {
      currentStudents = await fetchStudents();
    } else if (profile.role === 'student') {
      const fetchedData = await fetchStudentData();
      currentStudentData = fetchedData;
      setStudentData(fetchedData);
      if (!fetchedData) return; 
    }

    await fetchAssignments(currentStudentData);
    await fetchOtherData(currentStudents, currentStudentData);
    
    // Profil verisini de yenile (last_assignment_check_at için)
    const { data: updatedProfile, error: profileError } = await supabase.from('profiles').select('*, last_assignment_check_at').eq('id', user.id).single();
    if (!profileError) {
      const profileData = updatedProfile as Profile;
      if (profileData.last_assignment_check_at === undefined) {
        profileData.last_assignment_check_at = null;
      }
      setProfile(profileData);
    }

  }, [user, profile, students, studentData, fetchStudents, fetchStudentData, fetchAssignments, fetchOtherData]);


  useEffect(() => {
    if (profile) {
      fetchAllData();
    }
  }, [profile, fetchAllData]);

  useEffect(() => {
    if (!user || !profile) return;

    const handleDataChange = (payload: any) => {
      console.log(`Real-time: Data change detected in ${payload.table} (${payload.eventType}). Triggering full data refresh.`);
      fetchAllData();
    };

    const assignmentsChannel = supabase.channel('public:assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, handleDataChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Real-time: Assignments channel subscribed successfully for role: ${profile.role}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time: Assignments channel error.');
        }
      });

    const genericChangeChannel = supabase.channel('generic_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trial_exams' }, handleDataChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, handleDataChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'badges' }, handleDataChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, handleDataChange) // Profile değişikliklerini de dinle
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(genericChangeChannel);
    };
  }, [user, profile, fetchAllData]);


  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
  };

  const handleSubmitForApproval = async () => { 
    if (!assignmentToSubmit) return; 
    const toastId = showLoading('Görev onaya gönderiliyor...'); 
    const { error } = await supabase.from('assignments').update({ status: 'pending_approval' }).eq('id', assignmentToSubmit.id); 
    dismissToast(toastId); 
    if (error) { 
      showError('Görev onaya gönderilemedi.'); 
    } else { 
      showSuccess('Görev onaya gönderildi!'); 
      setAssignmentToSubmit(null); 
      fetchAllData(); // Verileri yeniden çek
    } 
  };
  
  const handleTeacherReviewAssignment = async (assignmentId: string, completed: boolean) => {
    if (!user || !profile || profile.role !== 'teacher') {
      showError('Bu işlemi yapmaya yetkiniz yok.');
      return;
    }

    const assignment = teacherAssignments.find(a => a.id === assignmentId);
    if (!assignment) {
      showError('Görev bulunamadı.');
      return;
    }

    if (completed && assignment.assignment_type === 'soru_cozumu') {
      setAssignmentToReview(null);
      setAssignmentForAnalysis(assignment);
      return;
    }

    const toastId = showLoading('Görev güncelleniyor...');
    
    const updatePayload = {
      status: 'completed',
      rejection_reason: completed ? null : 'teacher'
    };

    const { error: updateError } = await supabase
      .from('assignments')
      .update(updatePayload)
      .eq('id', assignmentId);

    if (updateError) {
      dismissToast(toastId);
      showError(`Görev güncellenemedi: ${updateError.message}`);
      return;
    }

    if (completed) {
      const student = students.find(s => s.id === assignment.student_id);
      if (student) {
        const studentUserId = student.user_id;
        const teacherId = user.id;

        const { data: currentBadges, error: fetchBadgesError } = await supabase
          .from('badges')
          .select('id, badge_type')
          .eq('user_id', studentUserId);

        if (fetchBadgesError) {
          console.error('Error fetching badges:', fetchBadgesError);
          showError('Rozetler alınırken hata oluştu.');
          dismissToast(toastId);
          return;
        }

        let superCount = currentBadges?.filter(b => b.badge_type === 'SÜPER').length || 0;
        let megaCount = currentBadges?.filter(b => b.badge_type === 'MEGA').length || 0;
        let uzmanCount = currentBadges?.filter(b => b.badge_type === 'UZMAN').length || 0;

        const badgesToDelete: string[] = [];
        const badgesToInsert: { user_id: string; teacher_id: string; badge_type: 'SÜPER' | 'MEGA' | 'UZMAN'; }[] = [];
        let newBadgeAwarded: 'SÜPER' | 'MEGA' | 'UZMAN' | null = null;

        badgesToInsert.push({ user_id: studentUserId, teacher_id: teacherId, badge_type: 'SÜPER' });
        superCount++;

        if (superCount >= 10) {
          const megaAwards = Math.floor(superCount / 10);
          const superBadgesToRemove = megaAwards * 10;
          
          const superBadgeIds = currentBadges?.filter(b => b.badge_type === 'SÜPER').map(b => b.id).slice(0, superBadgesToRemove) || [];
          badgesToDelete.push(...superBadgeIds);

          for (let i = 0; i < megaAwards; i++) {
            badgesToInsert.push({ user_id: studentUserId, teacher_id: teacherId, badge_type: 'MEGA' });
            newBadgeAwarded = 'MEGA';
          }
          superCount %= 10;
          megaCount += megaAwards;
        }

        if (megaCount >= 10) {
          const uzmanAwards = Math.floor(megaCount / 10);
          const megaBadgesToRemove = uzmanAwards * 10;

          const megaBadgeIds = currentBadges?.filter(b => b.badge_type === 'MEGA').map(b => b.id).slice(0, megaBadgesToRemove) || [];
          badgesToDelete.push(...megaBadgeIds);

          for (let i = 0; i < uzmanAwards; i++) {
            badgesToInsert.push({ user_id: studentUserId, teacher_id: teacherId, badge_type: 'UZMAN' });
            newBadgeAwarded = 'UZMAN';
          }
          megaCount %= 10;
          uzmanCount += uzmanAwards;
        }

        if (badgesToDelete.length > 0) {
          const { error: deleteBadgesError } = await supabase
            .from('badges')
            .delete()
            .in('id', badgesToDelete);
          if (deleteBadgesError) {
            console.error('Error deleting badges:', deleteBadgesError);
            showError('Rozetler silinirken hata oluştu.');
            dismissToast(toastId);
            return;
          }
        }

        if (badgesToInsert.length > 0) {
          const { error: insertBadgesError } = await supabase
            .from('badges')
            .insert(badgesToInsert);
          if (insertBadgesError) {
            console.error('Error inserting badges:', insertBadgesError);
            showError('Rozetler eklenirken hata oluştu.');
            dismissToast(toastId);
            return;
          }
        }

        if (newBadgeAwarded) {
          setAnimatedBadge(newBadgeAwarded);
        }
      }
    }

    dismissToast(toastId);
    showSuccess(completed ? 'Görev bitti olarak işaretlendi.' : 'Görev bitmedi olarak işaretlendi.');
    setAssignmentToReview(null);
    fetchAllData(); // Verileri yeniden çek
  };

  const handleSaveAnalysisData = async () => { 
    if (!assignmentForAnalysis) return; 
    const toastId = showLoading('Analiz verileri kaydediliyor...'); 
    const { error } = await supabase.from('assignments').update({ status: 'completed', rejection_reason: null, correct_count: analysisData.correct, incorrect_count: analysisData.incorrect, blank_count: analysisData.blank }).eq('id', assignmentForAnalysis.id); 
    dismissToast(toastId); 
    if (error) { 
      showError('Veriler kaydedilemedi.'); 
    } else { 
      showSuccess('Görev bitti olarak işaretlendi ve veriler kaydedildi.'); 
      if (analysisData.correct === assignmentForAnalysis.question_count) { 
        setShowFireworks(true); 
        setTimeout(() => setShowFireworks(false), 3000); 
      } 
      if (user && profile && profile.role === 'teacher') {
        const assignment = teacherAssignments.find(a => a.id === assignmentForAnalysis.id);
        if (assignment) {
          const student = students.find(s => s.id === assignment.student_id);
          if (student) {
            const studentUserId = student.user_id;
            const teacherId = user.id;

            const { data: currentBadges, error: fetchBadgesError } = await supabase
              .from('badges')
              .select('id, badge_type')
              .eq('user_id', studentUserId);

            if (fetchBadgesError) {
              console.error('Error fetching badges:', fetchBadgesError);
              showError('Rozetler alınırken hata oluştu.');
              return;
            }

            let superCount = currentBadges?.filter(b => b.badge_type === 'SÜPER').length || 0;
            let megaCount = currentBadges?.filter(b => b.badge_type === 'MEGA').length || 0;
            let uzmanCount = currentBadges?.filter(b => b.badge_type === 'UZMAN').length || 0;

            const badgesToDelete: string[] = [];
            const badgesToInsert: { user_id: string; teacher_id: string; badge_type: 'SÜPER' | 'MEGA' | 'UZMAN'; }[] = [];
            let newBadgeAwarded: 'SÜPER' | 'MEGA' | 'UZMAN' | null = null;

            badgesToInsert.push({ user_id: studentUserId, teacher_id: teacherId, badge_type: 'SÜPER' });
            superCount++;

            if (superCount >= 10) {
              const megaAwards = Math.floor(superCount / 10);
              const superBadgesToRemove = megaAwards * 10;
              
              const superBadgeIds = currentBadges?.filter(b => b.badge_type === 'SÜPER').map(b => b.id).slice(0, superBadgesToRemove) || [];
              badgesToDelete.push(...superBadgeIds);

              for (let i = 0; i < megaAwards; i++) {
                badgesToInsert.push({ user_id: studentUserId, teacher_id: teacherId, badge_type: 'MEGA' });
                newBadgeAwarded = 'MEGA';
              }
              superCount %= 10;
              megaCount += megaAwards;
            }

            if (megaCount >= 10) {
              const uzmanAwards = Math.floor(megaCount / 10);
              const megaBadgesToRemove = uzmanAwards * 10;

              const megaBadgeIds = currentBadges?.filter(b => b.badge_type === 'MEGA').map(b => b.id).slice(0, megaBadgesToRemove) || [];
              badgesToDelete.push(...megaBadgeIds);

              for (let i = 0; i < uzmanAwards; i++) {
                badgesToInsert.push({ user_id: studentUserId, teacher_id: teacherId, badge_type: 'UZMAN' });
                newBadgeAwarded = 'UZMAN';
              }
              megaCount %= 10;
              uzmanCount += uzmanAwards;
            }

            if (badgesToDelete.length > 0) {
              await supabase.from('badges').delete().in('id', badgesToDelete);
            }
            if (badgesToInsert.length > 0) {
              await supabase.from('badges').insert(badgesToInsert);
            }

            if (newBadgeAwarded) {
              setAnimatedBadge(newBadgeAwarded);
            }
          }
        }
      }
    } 
    setAssignmentForAnalysis(null); 
    setAnalysisData({ correct: 0, incorrect: 0, blank: 0 }); 
    fetchAllData(); // Verileri yeniden çek
  };
  const handleDeleteSingleAssignment = async () => { 
    if (!assignmentToDelete || !user) return; 

    const toastId = showLoading('Görev siliniyor...'); 

    try {
      // Eğer silinen görev tamamlanmış bir soru çözümü VEYA konu anlatımı görevi ise ve reddedilmemişse,
      // öğrenciye verilen bir SÜPER rozetini de kaldır.
      const isBadgeEarningAssignment = assignmentToDelete.assignment_type === 'soru_cozumu' || assignmentToDelete.assignment_type === 'konu_anlatimi';

      if (assignmentToDelete.status === 'completed' && !assignmentToDelete.rejection_reason && isBadgeEarningAssignment) {
        const student = students.find(s => s.id === assignmentToDelete.student_id);
        if (student) {
          const studentUserId = student.user_id;
          const teacherId = user.id;

          // Öğrencinin SÜPER rozetlerinden birini bul ve sil
          const { data: existingSuperBadge, error: fetchBadgeError } = await supabase
            .from('badges')
            .select('id')
            .eq('user_id', studentUserId)
            .eq('teacher_id', teacherId)
            .eq('badge_type', 'SÜPER')
            .limit(1)
            .single();

          if (fetchBadgeError && fetchBadgeError.code !== 'PGRST116') { // PGRST116: No rows found
            console.error('Rozet alınırken hata:', fetchBadgeError);
            showError('Rozet kaldırılırken bir hata oluştu.');
            dismissToast(toastId);
            return;
          }

          if (existingSuperBadge) {
            const { error: deleteBadgeError } = await supabase
              .from('badges')
              .delete()
              .eq('id', existingSuperBadge.id);

            if (deleteBadgeError) {
              console.error('Rozet silinirken hata:', deleteBadgeError);
              showError('Rozet kaldırılırken bir hata oluştu.');
              dismissToast(toastId);
              return;
            }
            console.log('Bir SÜPER rozeti başarıyla kaldırıldı.');
          } else {
            console.log('Silinecek SÜPER rozeti bulunamadı (muhtemelen MEGA/UZMAN rozetine dönüştü).');
          }
        }
      }

      // Görevi sil
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentToDelete.id); 
      if (error) { 
        throw new Error(error.message); 
      } 
      showSuccess('Görev başarıyla silindi.'); 
      fetchAllData(); // Verileri yeniden çek
    } catch (error: any) {
      showError(error.message || 'Görev silinemedi.'); 
    } finally {
      dismissToast(toastId); 
      setAssignmentToDelete(null); 
    }
  };
  
  const handleClearAllStudentData = async () => {
    if (!user || !user.email) return;
    const toastId = showLoading('Doğrulanıyor ve tüm veriler siliniyor...');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwordInput });
      if (signInError) { throw new Error('Geçersiz şifre.'); }
  
      const { error: deleteAssignmentsError } = await supabase.from('assignments').delete().eq('teacher_id', user.id);
      if (deleteAssignmentsError) { throw new Error(deleteAssignmentsError.message); }
  
      const studentUserIds = students.map(s => s.user_id);
      if (studentUserIds.length > 0) {
          const { error: deleteExamsError } = await supabase.from('trial_exams').delete().in('student_id', students.map(s => s.id));
          if (deleteExamsError) { throw new Error(deleteExamsError.message); }

          const { error: deleteBadgesError } = await supabase.from('badges').delete().in('user_id', studentUserIds);
          if (deleteBadgesError) { throw new Error(deleteBadgesError.message); }
      }
      showSuccess('Tüm görevler, deneme sınavları ve rozetler başarıyla silindi.');
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Bir hata oluştu.');
    } finally {
      dismissToast(toastId);
      setIsClearAllDialogOpen(false);
      setPasswordInput('');
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || !user || !user.email || !passwordInput) return;
    const toastId = showLoading('Öğrenci siliniyor...');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwordInput });
      if (signInError) throw new Error('Geçersiz şifre. Lütfen tekrar deneyin.');
      
      const { error: functionError } = await supabase.functions.invoke('delete-student', { body: { studentUserId: studentToDelete.user_id } });
      
      if (functionError) throw new Error(functionError.message);
      
      showSuccess(`"${studentToDelete.name}" adlı öğrenci ve ilgili tüm verileri başarıyla silindi.`);
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Öğrenci silinirken bir hata oluştu.');
    } finally {
      dismissToast(toastId);
      setStudentToDelete(null);
      setPasswordInput('');
    }
  };

  const handleDeleteTrialExam = async () => {
    if (!examSessionToDelete || !user || !user.email || !passwordInput) return;
    
    const targetStudentId = profile?.role === 'teacher' ? selectedStudentId : studentData?.id;
    if (!targetStudentId) {
      showError("Öğrenci seçimi yapılamadı.");
      return;
    }

    const toastId = showLoading('Deneme sınavı verileri siliniyor...');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwordInput });
      if (signInError) throw new Error('Geçersiz şifre. Lütfen tekrar deneyin.');

      const { error: deleteError } = await supabase
        .from('trial_exams')
        .delete()
        .eq('student_id', targetStudentId)
        .eq('exam_date', examSessionToDelete.timestamp);

      if (deleteError) throw new Error(deleteError.message);
      showSuccess(`"${examSessionToDelete.fullName}" başarıyla silindi.`);
      fetchAllData();
    } catch (error: any) {
      showError(error.message || 'Deneme silinirken bir hata oluştu.');
    } finally {
      dismissToast(toastId);
      setExamSessionToDelete(null);
      setPasswordInput('');
    }
  };
  
  const getAssignmentTypeBaseStyles = (type: Assignment['assignment_type'], status: Assignment['status'], rejection_reason?: Assignment['rejection_reason']) => {
    if (status === 'completed' && !!rejection_reason) {
      return 'bg-red-100 dark:bg-red-900/20';
    }
    if (type === 'soru_cozumu') return 'bg-blue-100 dark:bg-blue-900/20';
    if (type === 'konu_anlatimi') return 'bg-green-100 dark:bg-green-900/20';
    if (type === 'okuma') return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  const getStatusBorderStyles = (status: Assignment['status'], rejection_reason?: Assignment['rejection_reason']) => {
    if (status === 'completed') {
      if (!!rejection_reason) {
        return 'border-red-400 dark:border-red-600';
      }
      return 'border-green-400 dark:border-green-600';
    }
    if (status === 'pending_approval') return 'border-yellow-400 dark:border-yellow-600';
    if (status === 'active') return 'border-blue-400 dark:border-blue-600';
    return 'border-gray-300 dark:border-gray-700';
  };

  const getSubjectIcon = (subjectName: string) => { 
    const subject = lgsCurriculum.find(s => s.name === subjectName); 
    if (subject) {
      return { 
        Icon: subject.icon, 
        iconClass: `h-6 w-6 text-white`, // İkonu beyaz yap
        textClass: `font-bold text-white`, // Metni beyaz ve kalın yap
        chartHexColor: subject.hexColor, 
        gradientClass: subject.gradient 
      }; 
    }
    return { 
      Icon: Book, 
      iconClass: 'h-6 w-6 text-white', 
      textClass: 'font-bold text-white',
      chartHexColor: '#a1a1aa', 
      gradientClass: 'from-gray-500 to-gray-600' 
    }; 
  };
  
  const aggregateAssignmentsData = (assignmentsToAggregate: Assignment[]) => {
    const grouped: Record<string, Record<string, { correct: number; incorrect: number; blank: number; totalQuestions: number; }>> = {};
    assignmentsToAggregate.forEach(assignment => {
      if (assignment.assignment_type === 'soru_cozumu' && assignment.correct_count != null) {
        const subject = assignment.subject;
        const subtopic = assignment.subtopic;
        if (!grouped[subject]) grouped[subject] = {};
        if (!grouped[subject][subtopic]) {
          grouped[subject][subtopic] = { correct: 0, incorrect: 0, blank: 0, totalQuestions: 0 };
        }
        grouped[subject][subtopic].correct += assignment.correct_count || 0;
        grouped[subject][subtopic].incorrect += assignment.incorrect_count || 0;
        grouped[subject][subtopic].blank += assignment.blank_count || 0;
        grouped[subject][subtopic].totalQuestions += assignment.question_count || 0;
      }
    });
    const result: Record<string, AnalysisItem[]> = {};
    for (const subject in grouped) {
      result[subject] = [];
      for (const subtopic in grouped[subject]) {
        const data = grouped[subject][subtopic];
        const net = data.correct - data.incorrect / 3;
        result[subject].push({ name: subtopic, Doğru: data.correct, Yanlış: data.incorrect, Boş: data.blank, Net: net, totalQuestions: data.totalQuestions });
      }
      result[subject].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  };

  const studentAnalysisData = useMemo(() => selectedStudentId ? aggregateAssignmentsData(teacherAssignments.filter(a => a.student_id === selectedStudentId && a.status === 'completed')) : null, [selectedStudentId, teacherAssignments]);
  const studentSelfAnalysisBySubject = useMemo(() => profile?.role === 'student' ? aggregateAssignmentsData(assignments.filter(a => a.status === 'completed')) : null, [assignments, profile]);
  
  const totalSelfAnalysisSummary = useMemo(() => {
    if (!studentSelfAnalysisBySubject) {
      return { acil: 0, gelistir: 0, iyi: 0, mukemmel: 0 };
    }
    let totalAcil = 0;
    let totalGelistir = 0;
    let totalIyi = 0;
    let totalMukemmel = 0;
    Object.values(studentSelfAnalysisBySubject).forEach(topics => {
      topics.forEach(t => {
        if (t.totalQuestions > 0) {
          const p = (t.Doğru / t.totalQuestions) * 100;
          if (p < 50) totalAcil++;
          else if (p < 70) totalGelistir++;
          else if (p < 90) totalIyi++;
          else totalMukemmel++;
        }
      });
    });
    return { acil: totalAcil, gelistir: totalGelistir, iyi: totalIyi, mukemmel: totalMukemmel };
  }, [studentSelfAnalysisBySubject]);

  const studentSelfTopicAnalysisChartData = useMemo(() => {
    const sourceData = studentSelfAnalysisBySubject;
    return studentModalDetailSubject && sourceData?.[studentModalDetailSubject] 
        ? (studentModalDetailSubtopic 
            ? sourceData[studentModalDetailSubject].filter(item => item.name === studentModalDetailSubtopic) 
            : sourceData[studentModalDetailSubject]) 
        : [];
  }, [studentModalDetailSubject, studentModalDetailSubtopic, studentSelfAnalysisBySubject]);

  const teacherAnalysisTopicChartData = useMemo(() => {
    const sourceData = studentAnalysisData;
    return teacherAnalysisSubject && sourceData?.[teacherAnalysisSubject] 
        ? (teacherAnalysisSubtopic 
            ? sourceData[teacherAnalysisSubject].filter(item => item.name === teacherAnalysisSubtopic) 
            : sourceData[teacherAnalysisSubject]) 
        : [];
  }, [teacherAnalysisSubject, teacherAnalysisSubtopic, studentAnalysisData]);


  const bookReadingData = useMemo(() => {
    const targetStudentId = profile?.role === 'teacher' ? selectedStudentId : studentData?.id;
    if (!targetStudentId) return [];

    const assignmentsList = profile?.role === 'student' ? assignments : teacherAssignments.filter(a => a.student_id === targetStudentId);

    return assignmentsList
      .filter(a => a.assignment_type === 'okuma' && a.page_count != null && a.status === 'completed')
      .map(a => ({ 
        name: new Date(a.created_at).toLocaleDateString('tr-TR'), 
        'Okunan Sayfa': a.page_count || 0,
        isRejected: !!a.rejection_reason
      }))
      .sort((a, b) => new Date(b.name).getTime() - new Date(a.name).getTime());
  }, [assignments, teacherAssignments, profile, selectedStudentId, studentData]);

  const trialExamData = useMemo(() => {
    const targetStudentId = profile?.role === 'teacher' ? selectedStudentId : studentData?.id;
    if (!targetStudentId) return [];

    const filteredExams = trialExams.filter(e => e.student_id === targetStudentId);
    
    const groupedByTimestamp = filteredExams.reduce((acc, exam) => {
      const timestamp = exam.exam_date;
      if (!acc[timestamp]) {
        acc[timestamp] = [];
      }
      acc[timestamp].push(exam);
      return acc;
    }, {} as Record<string, TrialExam[]>);

    const sortedExamSessions = Object.entries(groupedByTimestamp).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    return sortedExamSessions.map(([timestamp, examsInSession], index) => {
      const examDate = new Date(timestamp);
      const formattedDate = examDate.toLocaleDateString('tr-TR');
      
      const sessionData: TrialExamSession = {
        name: `${index + 1}. Deneme`,
        fullName: `${index + 1}. Deneme (${formattedDate})`,
        timestamp: timestamp,
      };

      examsInSession.forEach(exam => {
        // 'Okuma' dersini deneme sınavı verilerinden hariç tut
        if (exam.subject === 'Okuma') {
          return; 
        }

        const totalQuestions = exam.correct_count + exam.incorrect_count + exam.blank_count;
        const netScore = exam.correct_count - (exam.incorrect_count / 3);

        if (totalQuestions > 0) {
          const netPercentage = (Math.max(0, netScore) / totalQuestions) * 100;
          sessionData[exam.subject] = parseFloat(netPercentage.toFixed(2));
          sessionData[`${exam.subject}_net`] = parseFloat(netScore.toFixed(2));
        }
      });
      return sessionData;
    });
  }, [trialExams, selectedStudentId, profile, studentData]);

  const subjectChartColors: { [key: string]: string } = useMemo(() => {
    return lgsCurriculum
      .filter(s => s.name !== 'Okuma') // 'Okuma' dersini grafik renklerinden hariç tut
      .reduce((acc, subject) => {
        acc[subject.name] = subject.hexColor;
        return acc;
      }, {} as Record<string, string>);
  }, []);

  const handleStudentChangeForAnalysis = (studentId: string | null) => {
    setSelectedStudentId(studentId);
    setTeacherAnalysisSubject(null);
    setTeacherAnalysisSubtopic(null);
    setTeacherAnalysisOpenAccordions([]);
  };

  const totalQuestionsForAnalysis = assignmentForAnalysis?.question_count || 0;
  const currentAnalysisSum = analysisData.correct + analysisData.incorrect + analysisData.blank;
  const isAnalysisDataValid = isNaN(currentAnalysisSum) || currentAnalysisSum === totalQuestionsForAnalysis;

  const handleTitleClick = () => {
    window.location.reload();
  };

  // Yeni görev sayısını hesaplayan memo
  const newAssignmentCount = useMemo(() => {
    if (profile?.role !== 'student' || !assignments.length) return 0;
    
    const lastCheckTime = profile.last_assignment_check_at ? parseISO(profile.last_assignment_check_at) : new Date(0);
    
    return assignments.filter(a => {
      const assignmentCreationTime = parseISO(a.created_at);
      const isNew = assignmentCreationTime > lastCheckTime;
      const isActive = new Date(a.due_at) > new Date() && a.status === 'active';
      return isNew && isActive;
    }).length;
  }, [assignments, profile]);


  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p>Yükleniyor...</p></div>;
  if (!session) return null;

  const renderAssignmentsGroupedBySubject = (targetId: string, assignmentsToShow: Assignment[], totalAssignmentsForStudent: Assignment[], showSummaryCounts: boolean) => {
    if (assignmentsToShow.length === 0) return <p className="text-center text-gray-500 mt-4">Burada gösterilecek görev yok.</p>;
    
    const groupedBySubject = assignmentsToShow.reduce((acc: Record<string, Assignment[]>, assignment) => { 
        (acc[assignment.subject] = acc[assignment.subject] || []).push(assignment); 
        return acc; 
    }, {});
    
    const totalGroupedBySubject = totalAssignmentsForStudent.reduce((acc: Record<string, Assignment[]>, assignment) => {
        (acc[assignment.subject] = acc[assignment.subject] || []).push(assignment);
        return acc;
    }, {});

    const sortedSubjects = Object.keys(groupedBySubject).sort((a, b) => a.localeCompare(b));
    const currentOpenSubjects = openStudentSubjectAccordions[targetId] || [];
    
    return (
      <Accordion type="multiple" className="w-full" value={currentOpenSubjects} onValueChange={(values) => setOpenStudentSubjectAccordions(prev => ({ ...prev, [targetId]: values }))}>
        {sortedSubjects.map(subjectName => {
          const subjectAssignmentsToShow = groupedBySubject[subjectName];
          const totalSubjectAssignments = totalGroupedBySubject[subjectName] || [];
          const { Icon, iconClass, textClass, gradientClass } = getSubjectIcon(subjectName); // gradientClass'i aldık
          
          const approvedCount = totalSubjectAssignments.filter(a => a.status === 'completed' && !a.rejection_reason).length;
          const rejectedCount = totalSubjectAssignments.filter(a => a.status === 'completed' && !!a.rejection_reason).length;
          const incompleteCount = totalSubjectAssignments.filter(a => ['active', 'pending_approval'].includes(a.status)).length;
          
          return (
            <AccordionItem value={subjectName} key={subjectName}>
              <AccordionTrigger className={cn(
                `bg-gradient-to-r ${gradientClass} text-white font-bold`, // Arka planı dinamik gradient yapıldı
                "hover:brightness-90 data-[state=open]:shadow-md", // Hover ve açık durum efektleri
                "rounded-lg px-3 transition-all duration-300"
              )}>
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    <Icon className={iconClass} />
                    <span className={textClass}>{subjectName}</span>
                  </div>
                  {showSummaryCounts && (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {approvedCount > 0 && (
                        <span className="flex items-center gap-1 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                          <CheckCircle className="h-4 w-4" />
                          {approvedCount}
                        </span>
                      )}
                      {incompleteCount > 0 && (
                        <span className="flex items-center gap-1 text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
                          <Clock className="h-4 w-4" />
                          {incompleteCount}
                        </span>
                      )}
                      {rejectedCount > 0 && (
                        <span className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-900/20 dark:border-red-800/40 px-2 py-1 rounded-full">
                          <ThumbsDown className="h-4 w-4" />
                          {rejectedCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 mt-2">
                  {subjectAssignmentsToShow.map(a => {
                    const TypeIcon = a.assignment_type === 'konu_anlatimi' ? Book : a.assignment_type === 'okuma' ? Book : HelpCircle;
                    const typeText = a.assignment_type === 'konu_anlatimi' ? 'Konu Anlatımı' : a.assignment_type === 'okuma' ? `Okuma (${a.page_count} Sayfa)` : `${a.question_count} Soru Çözümü`;
                    const typeColor = a.assignment_type === 'konu_anlatimi' ? 'text-blue-500' : a.assignment_type === 'okuma' ? 'text-orange-500' : 'text-green-500';
                    return (
                      <li key={a.id} onClick={() => { if (profile?.role === 'student' && a.status === 'active' && new Date(a.due_at) > now) setAssignmentToSubmit(a); else if (profile?.role === 'teacher' && a.status === 'pending_approval') setAssignmentToReview(a); }} 
                          className={cn(
                            'flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 rounded-lg border',
                            getAssignmentTypeBaseStyles(a.assignment_type, a.status, a.rejection_reason),
                            getStatusBorderStyles(a.status, a.rejection_reason),
                            ((profile?.role === 'student' && a.status === 'active' && new Date(a.due_at) > now) || (profile?.role === 'teacher' && a.status === 'pending_approval'))
                              ? 'cursor-pointer hover:shadow-md transition-shadow'
                              : ''
                          )}>
                        <div className="flex items-center gap-3">
                          <TypeIcon className={cn("h-6 w-6", typeColor)} />
                          <div>
                            <p className="font-semibold">{a.subtopic}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <TypeIcon className={cn("h-5 w-5", typeColor)} /> {typeText}
                            </p>
                            {a.teacher_note && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                                Not: {a.teacher_note}
                              </p>
                            )}
                            {a.resource_link && (
                              <a 
                                href={a.resource_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-blue-500 hover:underline flex items-center mt-1"
                                onClick={(e) => e.stopPropagation()} // Tıklama olayının üst öğeye yayılmasını engelle
                              >
                                <Link className="h-4 w-4 mr-1" /> Kaynak Linki
                              </a>
                            )}
                            {/* Geri Sayım Sayacı */}
                            {a.status === 'active' && new Date(a.due_at) > now && (
                              <div className="mt-1">
                                <CountdownTimer dueDate={a.due_at} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 self-end sm:self-center flex items-center gap-2">
                          {a.status === 'completed' && !a.rejection_reason && <span className="text-green-600 dark:text-green-400 font-semibold flex items-center"><CheckCircle className="mr-2 h-5 w-5"/> Bitti</span>}
                          {a.status === 'completed' && a.rejection_reason === 'deadline' && <span className="text-red-600 dark:text-red-400 font-semibold flex items-center"><ThumbsDown className="mr-2 h-5 w-5"/> Bitmedi</span>}
                          {a.status === 'completed' && a.rejection_reason === 'teacher' && <span className="text-red-600 dark:text-red-400 font-semibold flex items-center"><ThumbsDown className="mr-2 h-5 w-5"/> Koç Tarafından Reddedildi</span>}
                          {a.status === 'pending_approval' && <span className="text-yellow-600 dark:text-yellow-400 font-semibold flex items-center"><Hourglass className="mr-2 h-5 w-5"/> Onay Bekliyor</span>}
                          {profile?.role === 'teacher' && (<Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); setAssignmentToDelete(a); }} title="Görevi sil"><Trash2 className="h-5 w-5" /></Button>)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  const renderCoreAnalysisContent = (
    analysisData: Record<string, AnalysisItem[]> | null, 
    openItems: string[], 
    setOpenItems: (items: string[]) => void, 
    detailSubject: string | null,
    setDetailSubject: (subject: string | null) => void,
    setDetailSubtopic: (subtopic: string | null) => void,
    topicChartData: AnalysisItem[]
  ) => {
      
    const getSubjectSummary = (topics: AnalysisItem[]) => { 
      let acil = 0, gelistir = 0, iyi = 0, mukemmel = 0; 
      topics.forEach(t => { 
        if (t.totalQuestions > 0) { 
          const p = (t.Doğru / t.totalQuestions) * 100; 
          if (p < 50) acil++; 
          else if (p < 70) gelistir++; 
          else if (p < 90) iyi++; 
          else mukemmel++;
        } 
      }); 
      return { acil, gelistir, iyi, mukemmel }; 
    };
      
    return (
      <div className="max-h-[70vh] overflow-y-auto py-4">
        {analysisData && Object.keys(analysisData).length > 0 ? (
          detailSubject ? (
            <div className="space-y-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Doğru" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Boş" stackId="a" fill="#a1a1aa" />
                    <LabelList dataKey="Net" position="top" formatter={(value: number) => `${value.toFixed(2)}`} className="fill-white font-bold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center"><ZoomIn className="mr-2 h-6 w-6"/> Detaylar</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Konu</TableHead>
                        <TableHead className="text-center">Doğru</TableHead>
                        <TableHead className="text-center">Yanlış</TableHead>
                        <TableHead className="text-center">Boş</TableHead>
                        <TableHead className="text-right font-bold min-w-[50px]">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicChartData.map(item => (
                        <TableRow key={item.name}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.Doğru}</TableCell>
                          <TableCell className="text-center">{item.Yanlış}</TableCell>
                          <TableCell className="text-center">{item.Boş}</TableCell>
                          <TableCell className="text-right font-bold">{item.Net.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full" value={openItems} onValueChange={setOpenItems}>
              {Object.entries(analysisData).map(([subject, topics]) => { 
                const { Icon, iconClass, textClass, gradientClass } = getSubjectIcon(subject); 
                const topicsWithStatus = topics.filter(t => t.totalQuestions > 0); 
                if (topicsWithStatus.length === 0) return null; 
                const summary = getSubjectSummary(topicsWithStatus); 
                return (
                  <AccordionItem value={subject} key={subject}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r ${gradientClass} text-white font-bold`, // Arka planı dinamik gradient yapıldı
                      "hover:brightness-90 data-[state=open]:shadow-md", // Hover ve açık durum efektleri
                      "rounded-lg px-3 transition-all duration-300"
                    )}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={iconClass} />
                          <span className={textClass}>{subject}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                          {summary.acil > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-6 w-6" title="Acil Bakılması Gereken Konular">{summary.acil}</span>}
                          {summary.gelistir > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full h-6 w-6" title="Geliştirilmesi Gereken Konular">{summary.gelistir}</span>}
                          {summary.iyi > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full h-6 w-6" title="İyi Seviyedeki Konular">{summary.iyi}</span>}
                          {summary.mukemmel > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-green-500 rounded-full h-6 w-6" title="Mükemmel Seviyedeki Konular">{summary.mukemmel}</span>}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-white hover:bg-white/20" // Buton metni beyaz, hover efekti
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSubject(subject);
                              setDetailSubtopic(null);
                            }}
                            title="Dersin detaylı analizini görüntüle"
                          >
                            Detaylı Analiz <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {topicsWithStatus.map(topic => { 
                          const p = Math.min(100, (topic.Doğru / topic.totalQuestions) * 100); 
                          let statusText = 'MÜKEMMEL', statusColor = 'bg-green-500'; 
                          if (p < 50) { statusText = 'ACİL'; statusColor = 'bg-red-500'; } 
                          else if (p < 70) { statusText = 'GELİŞTİR'; statusColor = 'bg-yellow-500'; } 
                          else if (p < 90) { statusText = 'İYİ'; statusColor = 'bg-blue-500'; } 
                          else { statusText = 'MÜKEMMEL'; statusColor = 'bg-green-500'; }
                          return (
                            <div 
                              key={topic.name} 
                              className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setDetailSubject(subject);
                                setDetailSubtopic(topic.name);
                              }}
                              title={`${topic.name} konusunun detaylarını gör`}
                            >
                              <span className="font-medium">{topic.name}</span>
                              <span className={cn("px-2 py-1 rounded-full text-xs font-bold text-white", statusColor)}>{statusText} ({p.toFixed(0)}%)</span>
                            </div>
                          ); 
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ); 
              })}
            </Accordion>
          )
        ) : (
          <p className="text-center text-muted-foreground">Analiz edilecek tamamlanmış soru çözüm görevi bulunmamaktadır.</p>
        )}
      </div>
    );
  };

  const renderMyStudentsList = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-900/30 dark:to-orange-900/30">
      <Card className="mt-0">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            <Users className="mr-2 h-6 w-6 text-current"/> 
            <span>ÖĞRENCİLERİM ({students.length})</span>
          </CardTitle>
          <CardDescription className="text-center">Öğrencilerinizin görev durumlarını ve ilerlemelerini buradan takip edebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz öğrenciniz yok.</p>
          ) : (
            <Accordion type="multiple" className="w-full" value={openStudentAccordions} onValueChange={setOpenStudentAccordions}>
              {students.map(student => {
                const studentAssignments = teacherAssignments.filter(a => a.student_id === student.id);
                const studentBadges = badges.filter(b => b.user_id === student.user_id);
                
                // Öğrencinin son kontrol zamanı
                const lastCheckTime = student.profile.last_assignment_check_at ? parseISO(student.profile.last_assignment_check_at) : new Date(0);
                
                // Öğrenciye atanan en son aktif görev
                const latestActiveAssignment = studentAssignments
                  .filter(a => a.status === 'active')
                  .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                // Yeni görev var mı ve görülmedi mi?
                const hasUnseenNewAssignment = latestActiveAssignment && parseISO(latestActiveAssignment.created_at) > lastCheckTime;

                // Öğretmen görünümünde de anlık filtreleme yap
                const now = new Date();
                const activeCount = studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now).length;
                const pendingCount = studentAssignments.filter(a => a.status === 'pending_approval').length;
                
                const completedStudentAssignments = studentAssignments.filter(a => 
                  a.status === 'completed' || (a.status === 'active' && new Date(a.due_at) <= now)
                ).map(a => {
                  if (a.status === 'active' && new Date(a.due_at) <= now) {
                    return { ...a, status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' } as Assignment;
                  }
                  return a;
                });

                const approvedCount = completedStudentAssignments.filter(a => !a.rejection_reason).length;
                const rejectedCount = completedStudentAssignments.filter(a => !!a.rejection_reason).length;

                return (
                  <AccordionItem value={student.id} key={student.id}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold hover:brightness-90 data-[state=open]:shadow-md rounded-lg px-3 transition-all duration-300`
                    )}>
                      <div className="flex justify-between w-full pr-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold uppercase">{student.name}</span>
                          {hasUnseenNewAssignment && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse" title="Yeni görev atandı, öğrenci henüz görmedi.">
                              GÖRÜLMEDİ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          {activeCount > 0 && (<span className="flex items-center font-semibold text-blue-800 dark:text-blue-200"><Clock className="mr-1.5 h-5 w-5" /> {activeCount} Aktif</span>)}
                          {pendingCount > 0 && (<span className="flex items-center font-semibold text-red-800 dark:text-red-200"><Hourglass className="mr-1.5 h-5 w-5" /> {pendingCount} Onayda</span>)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-2 border-t">
                        <BadgeDisplay badges={studentBadges} />
                        <Tabs defaultValue="active">
                          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
                            <TabsTrigger 
                              value="active" 
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Aktif ({activeCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="pending_approval"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Onay ({pendingCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="completed"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <span>Biten</span>
                                {(approvedCount > 0 || rejectedCount > 0) && (<div className="flex items-center text-xs font-semibold ml-1">(<span className="text-blue-600">{approvedCount}</span>/<span className="text-red-600">{rejectedCount}</span>)</div>)}
                              </div>
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="active">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now), studentAssignments, false)}</TabsContent>
                          <TabsContent value="pending_approval" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'pending_approval'), studentAssignments, false)}</TabsContent>
                          <TabsContent value="completed" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, completedStudentAssignments, studentAssignments, true)}</TabsContent>
                        </Tabs>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCoreAnalysisContent = (
    analysisData: Record<string, AnalysisItem[]> | null, 
    openItems: string[], 
    setOpenItems: (items: string[]) => void, 
    detailSubject: string | null,
    setDetailSubject: (subject: string | null) => void,
    setDetailSubtopic: (subtopic: string | null) => void,
    topicChartData: AnalysisItem[]
  ) => {
      
    const getSubjectSummary = (topics: AnalysisItem[]) => { 
      let acil = 0, gelistir = 0, iyi = 0, mukemmel = 0; 
      topics.forEach(t => { 
        if (t.totalQuestions > 0) { 
          const p = (t.Doğru / t.totalQuestions) * 100; 
          if (p < 50) acil++; 
          else if (p < 70) gelistir++; 
          else if (p < 90) iyi++; 
          else mukemmel++;
        } 
      }); 
      return { acil, gelistir, iyi, mukemmel }; 
    };
      
    return (
      <div className="max-h-[70vh] overflow-y-auto py-4">
        {analysisData && Object.keys(analysisData).length > 0 ? (
          detailSubject ? (
            <div className="space-y-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Doğru" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Boş" stackId="a" fill="#a1a1aa" />
                    <LabelList dataKey="Net" position="top" formatter={(value: number) => `${value.toFixed(2)}`} className="fill-white font-bold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center"><ZoomIn className="mr-2 h-6 w-6"/> Detaylar</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Konu</TableHead>
                        <TableHead className="text-center">Doğru</TableHead>
                        <TableHead className="text-center">Yanlış</TableHead>
                        <TableHead className="text-center">Boş</TableHead>
                        <TableHead className="text-right font-bold min-w-[50px]">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicChartData.map(item => (
                        <TableRow key={item.name}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.Doğru}</TableCell>
                          <TableCell className="text-center">{item.Yanlış}</TableCell>
                          <TableCell className="text-center">{item.Boş}</TableCell>
                          <TableCell className="text-right font-bold">{item.Net.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full" value={openItems} onValueChange={setOpenItems}>
              {Object.entries(analysisData).map(([subject, topics]) => { 
                const { Icon, iconClass, textClass, gradientClass } = getSubjectIcon(subject); 
                const topicsWithStatus = topics.filter(t => t.totalQuestions > 0); 
                if (topicsWithStatus.length === 0) return null; 
                const summary = getSubjectSummary(topicsWithStatus); 
                return (
                  <AccordionItem value={subject} key={subject}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r ${gradientClass} text-white font-bold`, // Arka planı dinamik gradient yapıldı
                      "hover:brightness-90 data-[state=open]:shadow-md", // Hover ve açık durum efektleri
                      "rounded-lg px-3 transition-all duration-300"
                    )}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={iconClass} />
                          <span className={textClass}>{subject}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                          {summary.acil > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-6 w-6" title="Acil Bakılması Gereken Konular">{summary.acil}</span>}
                          {summary.gelistir > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full h-6 w-6" title="Geliştirilmesi Gereken Konular">{summary.gelistir}</span>}
                          {summary.iyi > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full h-6 w-6" title="İyi Seviyedeki Konular">{summary.iyi}</span>}
                          {summary.mukemmel > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-green-500 rounded-full h-6 w-6" title="Mükemmel Seviyedeki Konular">{summary.mukemmel}</span>}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-white hover:bg-white/20" // Buton metni beyaz, hover efekti
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSubject(subject);
                              setDetailSubtopic(null);
                            }}
                            title="Dersin detaylı analizini görüntüle"
                          >
                            Detaylı Analiz <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {topicsWithStatus.map(topic => { 
                          const p = Math.min(100, (topic.Doğru / topic.totalQuestions) * 100); 
                          let statusText = 'MÜKEMMEL', statusColor = 'bg-green-500'; 
                          if (p < 50) { statusText = 'ACİL'; statusColor = 'bg-red-500'; } 
                          else if (p < 70) { statusText = 'GELİŞTİR'; statusColor = 'bg-yellow-500'; } 
                          else if (p < 90) { statusText = 'İYİ'; statusColor = 'bg-blue-500'; } 
                          else { statusText = 'MÜKEMMEL'; statusColor = 'bg-green-500'; }
                          return (
                            <div 
                              key={topic.name} 
                              className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setDetailSubject(subject);
                                setDetailSubtopic(topic.name);
                              }}
                              title={`${topic.name} konusunun detaylarını gör`}
                            >
                              <span className="font-medium">{topic.name}</span>
                              <span className={cn("px-2 py-1 rounded-full text-xs font-bold text-white", statusColor)}>{statusText} ({p.toFixed(0)}%)</span>
                            </div>
                          ); 
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ); 
              })}
            </Accordion>
          )
        ) : (
          <p className="text-center text-muted-foreground">Analiz edilecek tamamlanmış soru çözüm görevi bulunmamaktadır.</p>
        )}
      </div>
    );
  };

  const renderMyStudentsList = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-900/30 dark:to-orange-900/30">
      <Card className="mt-0">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            <Users className="mr-2 h-6 w-6 text-current"/> 
            <span>ÖĞRENCİLERİM ({students.length})</span>
          </CardTitle>
          <CardDescription className="text-center">Öğrencilerinizin görev durumlarını ve ilerlemelerini buradan takip edebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz öğrenciniz yok.</p>
          ) : (
            <Accordion type="multiple" className="w-full" value={openStudentAccordions} onValueChange={setOpenStudentAccordions}>
              {students.map(student => {
                const studentAssignments = teacherAssignments.filter(a => a.student_id === student.id);
                const studentBadges = badges.filter(b => b.user_id === student.user_id);
                
                // Öğrencinin son kontrol zamanı
                const lastCheckTime = student.profile.last_assignment_check_at ? parseISO(student.profile.last_assignment_check_at) : new Date(0);
                
                // Öğrenciye atanan en son aktif görev
                const latestActiveAssignment = studentAssignments
                  .filter(a => a.status === 'active')
                  .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                // Yeni görev var mı ve görülmedi mi?
                const hasUnseenNewAssignment = latestActiveAssignment && parseISO(latestActiveAssignment.created_at) > lastCheckTime;

                // Öğretmen görünümünde de anlık filtreleme yap
                const now = new Date();
                const activeCount = studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now).length;
                const pendingCount = studentAssignments.filter(a => a.status === 'pending_approval').length;
                
                const completedStudentAssignments = studentAssignments.filter(a => 
                  a.status === 'completed' || (a.status === 'active' && new Date(a.due_at) <= now)
                ).map(a => {
                  if (a.status === 'active' && new Date(a.due_at) <= now) {
                    return { ...a, status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' } as Assignment;
                  }
                  return a;
                });

                const approvedCount = completedStudentAssignments.filter(a => !a.rejection_reason).length;
                const rejectedCount = completedStudentAssignments.filter(a => !!a.rejection_reason).length;

                return (
                  <AccordionItem value={student.id} key={student.id}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold hover:brightness-90 data-[state=open]:shadow-md rounded-lg px-3 transition-all duration-300`
                    )}>
                      <div className="flex justify-between w-full pr-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold uppercase">{student.name}</span>
                          {hasUnseenNewAssignment && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse" title="Yeni görev atandı, öğrenci henüz görmedi.">
                              GÖRÜLMEDİ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          {activeCount > 0 && (<span className="flex items-center font-semibold text-blue-800 dark:text-blue-200"><Clock className="mr-1.5 h-5 w-5" /> {activeCount} Aktif</span>)}
                          {pendingCount > 0 && (<span className="flex items-center font-semibold text-red-800 dark:text-red-200"><Hourglass className="mr-1.5 h-5 w-5" /> {pendingCount} Onayda</span>)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-2 border-t">
                        <BadgeDisplay badges={studentBadges} />
                        <Tabs defaultValue="active">
                          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
                            <TabsTrigger 
                              value="active" 
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Aktif ({activeCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="pending_approval"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Onay ({pendingCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="completed"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <span>Biten</span>
                                {(approvedCount > 0 || rejectedCount > 0) && (<div className="flex items-center text-xs font-semibold ml-1">(<span className="text-blue-600">{approvedCount}</span>/<span className="text-red-600">{rejectedCount}</span>)</div>)}
                              </div>
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="active">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now), studentAssignments, false)}</TabsContent>
                          <TabsContent value="pending_approval" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'pending_approval'), studentAssignments, false)}</TabsContent>
                          <TabsContent value="completed" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, completedStudentAssignments, studentAssignments, true)}</TabsContent>
                        </Tabs>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCoreAnalysisContent = (
    analysisData: Record<string, AnalysisItem[]> | null, 
    openItems: string[], 
    setOpenItems: (items: string[]) => void, 
    detailSubject: string | null,
    setDetailSubject: (subject: string | null) => void,
    setDetailSubtopic: (subtopic: string | null) => void,
    topicChartData: AnalysisItem[]
  ) => {
      
    const getSubjectSummary = (topics: AnalysisItem[]) => { 
      let acil = 0, gelistir = 0, iyi = 0, mukemmel = 0; 
      topics.forEach(t => { 
        if (t.totalQuestions > 0) { 
          const p = (t.Doğru / t.totalQuestions) * 100; 
          if (p < 50) acil++; 
          else if (p < 70) gelistir++; 
          else if (p < 90) iyi++; 
          else mukemmel++;
        } 
      }); 
      return { acil, gelistir, iyi, mukemmel }; 
    };
      
    return (
      <div className="max-h-[70vh] overflow-y-auto py-4">
        {analysisData && Object.keys(analysisData).length > 0 ? (
          detailSubject ? (
            <div className="space-y-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Doğru" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Boş" stackId="a" fill="#a1a1aa" />
                    <LabelList dataKey="Net" position="top" formatter={(value: number) => `${value.toFixed(2)}`} className="fill-white font-bold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center"><ZoomIn className="mr-2 h-6 w-6"/> Detaylar</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Konu</TableHead>
                        <TableHead className="text-center">Doğru</TableHead>
                        <TableHead className="text-center">Yanlış</TableHead>
                        <TableHead className="text-center">Boş</TableHead>
                        <TableHead className="text-right font-bold min-w-[50px]">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicChartData.map(item => (
                        <TableRow key={item.name}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.Doğru}</TableCell>
                          <TableCell className="text-center">{item.Yanlış}</TableCell>
                          <TableCell className="text-center">{item.Boş}</TableCell>
                          <TableCell className="text-right font-bold">{item.Net.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full" value={openItems} onValueChange={setOpenItems}>
              {Object.entries(analysisData).map(([subject, topics]) => { 
                const { Icon, iconClass, textClass, gradientClass } = getSubjectIcon(subject); 
                const topicsWithStatus = topics.filter(t => t.totalQuestions > 0); 
                if (topicsWithStatus.length === 0) return null; 
                const summary = getSubjectSummary(topicsWithStatus); 
                return (
                  <AccordionItem value={subject} key={subject}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r ${gradientClass} text-white font-bold`, // Arka planı dinamik gradient yapıldı
                      "hover:brightness-90 data-[state=open]:shadow-md", // Hover ve açık durum efektleri
                      "rounded-lg px-3 transition-all duration-300"
                    )}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={iconClass} />
                          <span className={textClass}>{subject}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                          {summary.acil > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-6 w-6" title="Acil Bakılması Gereken Konular">{summary.acil}</span>}
                          {summary.gelistir > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full h-6 w-6" title="Geliştirilmesi Gereken Konular">{summary.gelistir}</span>}
                          {summary.iyi > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full h-6 w-6" title="İyi Seviyedeki Konular">{summary.iyi}</span>}
                          {summary.mukemmel > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-green-500 rounded-full h-6 w-6" title="Mükemmel Seviyedeki Konular">{summary.mukemmel}</span>}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-white hover:bg-white/20" // Buton metni beyaz, hover efekti
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSubject(subject);
                              setDetailSubtopic(null);
                            }}
                            title="Dersin detaylı analizini görüntüle"
                          >
                            Detaylı Analiz <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {topicsWithStatus.map(topic => { 
                          const p = Math.min(100, (topic.Doğru / topic.totalQuestions) * 100); 
                          let statusText = 'MÜKEMMEL', statusColor = 'bg-green-500'; 
                          if (p < 50) { statusText = 'ACİL'; statusColor = 'bg-red-500'; } 
                          else if (p < 70) { statusText = 'GELİŞTİR'; statusColor = 'bg-yellow-500'; } 
                          else if (p < 90) { statusText = 'İYİ'; statusColor = 'bg-blue-500'; } 
                          else { statusText = 'MÜKEMMEL'; statusColor = 'bg-green-500'; }
                          return (
                            <div 
                              key={topic.name} 
                              className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setDetailSubject(subject);
                                setDetailSubtopic(topic.name);
                              }}
                              title={`${topic.name} konusunun detaylarını gör`}
                            >
                              <span className="font-medium">{topic.name}</span>
                              <span className={cn("px-2 py-1 rounded-full text-xs font-bold text-white", statusColor)}>{statusText} ({p.toFixed(0)}%)</span>
                            </div>
                          ); 
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ); 
              })}
            </Accordion>
          )
        ) : (
          <p className="text-center text-muted-foreground">Analiz edilecek tamamlanmış soru çözüm görevi bulunmamaktadır.</p>
        )}
      </div>
    );
  };

  const renderMyStudentsList = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-900/30 dark:to-orange-900/30">
      <Card className="mt-0">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            <Users className="mr-2 h-6 w-6 text-current"/> 
            <span>ÖĞRENCİLERİM ({students.length})</span>
          </CardTitle>
          <CardDescription className="text-center">Öğrencilerinizin görev durumlarını ve ilerlemelerini buradan takip edebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz öğrenciniz yok.</p>
          ) : (
            <Accordion type="multiple" className="w-full" value={openStudentAccordions} onValueChange={setOpenStudentAccordions}>
              {students.map(student => {
                const studentAssignments = teacherAssignments.filter(a => a.student_id === student.id);
                const studentBadges = badges.filter(b => b.user_id === student.user_id);
                
                // Öğrencinin son kontrol zamanı
                const lastCheckTime = student.profile.last_assignment_check_at ? parseISO(student.profile.last_assignment_check_at) : new Date(0);
                
                // Öğrenciye atanan en son aktif görev
                const latestActiveAssignment = studentAssignments
                  .filter(a => a.status === 'active')
                  .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                // Yeni görev var mı ve görülmedi mi?
                const hasUnseenNewAssignment = latestActiveAssignment && parseISO(latestActiveAssignment.created_at) > lastCheckTime;

                // Öğretmen görünümünde de anlık filtreleme yap
                const now = new Date();
                const activeCount = studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now).length;
                const pendingCount = studentAssignments.filter(a => a.status === 'pending_approval').length;
                
                const completedStudentAssignments = studentAssignments.filter(a => 
                  a.status === 'completed' || (a.status === 'active' && new Date(a.due_at) <= now)
                ).map(a => {
                  if (a.status === 'active' && new Date(a.due_at) <= now) {
                    return { ...a, status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' } as Assignment;
                  }
                  return a;
                });

                const approvedCount = completedStudentAssignments.filter(a => !a.rejection_reason).length;
                const rejectedCount = completedStudentAssignments.filter(a => !!a.rejection_reason).length;

                return (
                  <AccordionItem value={student.id} key={student.id}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold hover:brightness-90 data-[state=open]:shadow-md rounded-lg px-3 transition-all duration-300`
                    )}>
                      <div className="flex justify-between w-full pr-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold uppercase">{student.name}</span>
                          {hasUnseenNewAssignment && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse" title="Yeni görev atandı, öğrenci henüz görmedi.">
                              GÖRÜLMEDİ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          {activeCount > 0 && (<span className="flex items-center font-semibold text-blue-800 dark:text-blue-200"><Clock className="mr-1.5 h-5 w-5" /> {activeCount} Aktif</span>)}
                          {pendingCount > 0 && (<span className="flex items-center font-semibold text-red-800 dark:text-red-200"><Hourglass className="mr-1.5 h-5 w-5" /> {pendingCount} Onayda</span>)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-2 border-t">
                        <BadgeDisplay badges={studentBadges} />
                        <Tabs defaultValue="active">
                          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
                            <TabsTrigger 
                              value="active" 
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Aktif ({activeCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="pending_approval"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Onay ({pendingCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="completed"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <span>Biten</span>
                                {(approvedCount > 0 || rejectedCount > 0) && (<div className="flex items-center text-xs font-semibold ml-1">(<span className="text-blue-600">{approvedCount}</span>/<span className="text-red-600">{rejectedCount}</span>)</div>)}
                              </div>
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="active">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now), studentAssignments, false)}</TabsContent>
                          <TabsContent value="pending_approval" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'pending_approval'), studentAssignments, false)}</TabsContent>
                          <TabsContent value="completed" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, completedStudentAssignments, studentAssignments, true)}</TabsContent>
                        </Tabs>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCoreAnalysisContent = (
    analysisData: Record<string, AnalysisItem[]> | null, 
    openItems: string[], 
    setOpenItems: (items: string[]) => void, 
    detailSubject: string | null,
    setDetailSubject: (subject: string | null) => void,
    setDetailSubtopic: (subtopic: string | null) => void,
    topicChartData: AnalysisItem[]
  ) => {
      
    const getSubjectSummary = (topics: AnalysisItem[]) => { 
      let acil = 0, gelistir = 0, iyi = 0, mukemmel = 0; 
      topics.forEach(t => { 
        if (t.totalQuestions > 0) { 
          const p = (t.Doğru / t.totalQuestions) * 100; 
          if (p < 50) acil++; 
          else if (p < 70) gelistir++; 
          else if (p < 90) iyi++; 
          else mukemmel++;
        } 
      }); 
      return { acil, gelistir, iyi, mukemmel }; 
    };
      
    return (
      <div className="max-h-[70vh] overflow-y-auto py-4">
        {analysisData && Object.keys(analysisData).length > 0 ? (
          detailSubject ? (
            <div className="space-y-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Doğru" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Boş" stackId="a" fill="#a1a1aa" />
                    <LabelList dataKey="Net" position="top" formatter={(value: number) => `${value.toFixed(2)}`} className="fill-white font-bold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center"><ZoomIn className="mr-2 h-6 w-6"/> Detaylar</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Konu</TableHead>
                        <TableHead className="text-center">Doğru</TableHead>
                        <TableHead className="text-center">Yanlış</TableHead>
                        <TableHead className="text-center">Boş</TableHead>
                        <TableHead className="text-right font-bold min-w-[50px]">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicChartData.map(item => (
                        <TableRow key={item.name}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.Doğru}</TableCell>
                          <TableCell className="text-center">{item.Yanlış}</TableCell>
                          <TableCell className="text-center">{item.Boş}</TableCell>
                          <TableCell className="text-right font-bold">{item.Net.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full" value={openItems} onValueChange={setOpenItems}>
              {Object.entries(analysisData).map(([subject, topics]) => { 
                const { Icon, iconClass, textClass, gradientClass } = getSubjectIcon(subject); 
                const topicsWithStatus = topics.filter(t => t.totalQuestions > 0); 
                if (topicsWithStatus.length === 0) return null; 
                const summary = getSubjectSummary(topicsWithStatus); 
                return (
                  <AccordionItem value={subject} key={subject}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r ${gradientClass} text-white font-bold`, // Arka planı dinamik gradient yapıldı
                      "hover:brightness-90 data-[state=open]:shadow-md", // Hover ve açık durum efektleri
                      "rounded-lg px-3 transition-all duration-300"
                    )}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={iconClass} />
                          <span className={textClass}>{subject}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                          {summary.acil > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-6 w-6" title="Acil Bakılması Gereken Konular">{summary.acil}</span>}
                          {summary.gelistir > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full h-6 w-6" title="Geliştirilmesi Gereken Konular">{summary.gelistir}</span>}
                          {summary.iyi > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full h-6 w-6" title="İyi Seviyedeki Konular">{summary.iyi}</span>}
                          {summary.mukemmel > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-green-500 rounded-full h-6 w-6" title="Mükemmel Seviyedeki Konular">{summary.mukemmel}</span>}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-white hover:bg-white/20" // Buton metni beyaz, hover efekti
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSubject(subject);
                              setDetailSubtopic(null);
                            }}
                            title="Dersin detaylı analizini görüntüle"
                          >
                            Detaylı Analiz <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {topicsWithStatus.map(topic => { 
                          const p = Math.min(100, (topic.Doğru / topic.totalQuestions) * 100); 
                          let statusText = 'MÜKEMMEL', statusColor = 'bg-green-500'; 
                          if (p < 50) { statusText = 'ACİL'; statusColor = 'bg-red-500'; } 
                          else if (p < 70) { statusText = 'GELİŞTİR'; statusColor = 'bg-yellow-500'; } 
                          else if (p < 90) { statusText = 'İYİ'; statusColor = 'bg-blue-500'; } 
                          else { statusText = 'MÜKEMMEL'; statusColor = 'bg-green-500'; }
                          return (
                            <div 
                              key={topic.name} 
                              className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setDetailSubject(subject);
                                setDetailSubtopic(topic.name);
                              }}
                              title={`${topic.name} konusunun detaylarını gör`}
                            >
                              <span className="font-medium">{topic.name}</span>
                              <span className={cn("px-2 py-1 rounded-full text-xs font-bold text-white", statusColor)}>{statusText} ({p.toFixed(0)}%)</span>
                            </div>
                          ); 
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ); 
              })}
            </Accordion>
          )
        ) : (
          <p className="text-center text-muted-foreground">Analiz edilecek tamamlanmış soru çözüm görevi bulunmamaktadır.</p>
        )}
      </div>
    );
  };

  const renderMyStudentsList = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-900/30 dark:to-orange-900/30">
      <Card className="mt-0">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            <Users className="mr-2 h-6 w-6 text-current"/> 
            <span>ÖĞRENCİLERİM ({students.length})</span>
          </CardTitle>
          <CardDescription className="text-center">Öğrencilerinizin görev durumlarını ve ilerlemelerini buradan takip edebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz öğrenciniz yok.</p>
          ) : (
            <Accordion type="multiple" className="w-full" value={openStudentAccordions} onValueChange={setOpenStudentAccordions}>
              {students.map(student => {
                const studentAssignments = teacherAssignments.filter(a => a.student_id === student.id);
                const studentBadges = badges.filter(b => b.user_id === student.user_id);
                
                // Öğrencinin son kontrol zamanı
                const lastCheckTime = student.profile.last_assignment_check_at ? parseISO(student.profile.last_assignment_check_at) : new Date(0);
                
                // Öğrenciye atanan en son aktif görev
                const latestActiveAssignment = studentAssignments
                  .filter(a => a.status === 'active')
                  .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                // Yeni görev var mı ve görülmedi mi?
                const hasUnseenNewAssignment = latestActiveAssignment && parseISO(latestActiveAssignment.created_at) > lastCheckTime;

                // Öğretmen görünümünde de anlık filtreleme yap
                const now = new Date();
                const activeCount = studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now).length;
                const pendingCount = studentAssignments.filter(a => a.status === 'pending_approval').length;
                
                const completedStudentAssignments = studentAssignments.filter(a => 
                  a.status === 'completed' || (a.status === 'active' && new Date(a.due_at) <= now)
                ).map(a => {
                  if (a.status === 'active' && new Date(a.due_at) <= now) {
                    return { ...a, status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' } as Assignment;
                  }
                  return a;
                });

                const approvedCount = completedStudentAssignments.filter(a => !a.rejection_reason).length;
                const rejectedCount = completedStudentAssignments.filter(a => !!a.rejection_reason).length;

                return (
                  <AccordionItem value={student.id} key={student.id}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold hover:brightness-90 data-[state=open]:shadow-md rounded-lg px-3 transition-all duration-300`
                    )}>
                      <div className="flex justify-between w-full pr-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold uppercase">{student.name}</span>
                          {hasUnseenNewAssignment && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse" title="Yeni görev atandı, öğrenci henüz görmedi.">
                              GÖRÜLMEDİ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          {activeCount > 0 && (<span className="flex items-center font-semibold text-blue-800 dark:text-blue-200"><Clock className="mr-1.5 h-5 w-5" /> {activeCount} Aktif</span>)}
                          {pendingCount > 0 && (<span className="flex items-center font-semibold text-red-800 dark:text-red-200"><Hourglass className="mr-1.5 h-5 w-5" /> {pendingCount} Onayda</span>)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-2 border-t">
                        <BadgeDisplay badges={studentBadges} />
                        <Tabs defaultValue="active">
                          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
                            <TabsTrigger 
                              value="active" 
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Aktif ({activeCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="pending_approval"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Onay ({pendingCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="completed"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <span>Biten</span>
                                {(approvedCount > 0 || rejectedCount > 0) && (<div className="flex items-center text-xs font-semibold ml-1">(<span className="text-blue-600">{approvedCount}</span>/<span className="text-red-600">{rejectedCount}</span>)</div>)}
                              </div>
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="active">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now), studentAssignments, false)}</TabsContent>
                          <TabsContent value="pending_approval" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'pending_approval'), studentAssignments, false)}</TabsContent>
                          <TabsContent value="completed" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, completedStudentAssignments, studentAssignments, true)}</TabsContent>
                        </Tabs>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCoreAnalysisContent = (
    analysisData: Record<string, AnalysisItem[]> | null, 
    openItems: string[], 
    setOpenItems: (items: string[]) => void, 
    detailSubject: string | null,
    setDetailSubject: (subject: string | null) => void,
    setDetailSubtopic: (subtopic: string | null) => void,
    topicChartData: AnalysisItem[]
  ) => {
      
    const getSubjectSummary = (topics: AnalysisItem[]) => { 
      let acil = 0, gelistir = 0, iyi = 0, mukemmel = 0; 
      topics.forEach(t => { 
        if (t.totalQuestions > 0) { 
          const p = (t.Doğru / t.totalQuestions) * 100; 
          if (p < 50) acil++; 
          else if (p < 70) gelistir++; 
          else if (p < 90) iyi++; 
          else mukemmel++;
        } 
      }); 
      return { acil, gelistir, iyi, mukemmel }; 
    };
      
    return (
      <div className="max-h-[70vh] overflow-y-auto py-4">
        {analysisData && Object.keys(analysisData).length > 0 ? (
          detailSubject ? (
            <div className="space-y-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Doğru" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Yanlış" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Boş" stackId="a" fill="#a1a1aa" />
                    <LabelList dataKey="Net" position="top" formatter={(value: number) => `${value.toFixed(2)}`} className="fill-white font-bold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center"><ZoomIn className="mr-2 h-6 w-6"/> Detaylar</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Konu</TableHead>
                        <TableHead className="text-center">Doğru</TableHead>
                        <TableHead className="text-center">Yanlış</TableHead>
                        <TableHead className="text-center">Boş</TableHead>
                        <TableHead className="text-right font-bold min-w-[50px]">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicChartData.map(item => (
                        <TableRow key={item.name}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.Doğru}</TableCell>
                          <TableCell className="text-center">{item.Yanlış}</TableCell>
                          <TableCell className="text-center">{item.Boş}</TableCell>
                          <TableCell className="text-right font-bold">{item.Net.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full" value={openItems} onValueChange={setOpenItems}>
              {Object.entries(analysisData).map(([subject, topics]) => { 
                const { Icon, iconClass, textClass, gradientClass } = getSubjectIcon(subject); 
                const topicsWithStatus = topics.filter(t => t.totalQuestions > 0); 
                if (topicsWithStatus.length === 0) return null; 
                const summary = getSubjectSummary(topicsWithStatus); 
                return (
                  <AccordionItem value={subject} key={subject}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r ${gradientClass} text-white font-bold`, // Arka planı dinamik gradient yapıldı
                      "hover:brightness-90 data-[state=open]:shadow-md", // Hover ve açık durum efektleri
                      "rounded-lg px-3 transition-all duration-300"
                    )}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={iconClass} />
                          <span className={textClass}>{subject}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                          {summary.acil > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-6 w-6" title="Acil Bakılması Gereken Konular">{summary.acil}</span>}
                          {summary.gelistir > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full h-6 w-6" title="Geliştirilmesi Gereken Konular">{summary.gelistir}</span>}
                          {summary.iyi > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full h-6 w-6" title="İyi Seviyedeki Konular">{summary.iyi}</span>}
                          {summary.mukemmel > 0 && <span className="flex items-center justify-center text-xs font-bold text-white bg-green-500 rounded-full h-6 w-6" title="Mükemmel Seviyedeki Konular">{summary.mukemmel}</span>}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-white hover:bg-white/20" // Buton metni beyaz, hover efekti
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSubject(subject);
                              setDetailSubtopic(null);
                            }}
                            title="Dersin detaylı analizini görüntüle"
                          >
                            Detaylı Analiz <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {topicsWithStatus.map(topic => { 
                          const p = Math.min(100, (topic.Doğru / topic.totalQuestions) * 100); 
                          let statusText = 'MÜKEMMEL', statusColor = 'bg-green-500'; 
                          if (p < 50) { statusText = 'ACİL'; statusColor = 'bg-red-500'; } 
                          else if (p < 70) { statusText = 'GELİŞTİR'; statusColor = 'bg-yellow-500'; } 
                          else if (p < 90) { statusText = 'İYİ'; statusColor = 'bg-blue-500'; } 
                          else { statusText = 'MÜKEMMEL'; statusColor = 'bg-green-500'; }
                          return (
                            <div 
                              key={topic.name} 
                              className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setDetailSubject(subject);
                                setDetailSubtopic(topic.name);
                              }}
                              title={`${topic.name} konusunun detaylarını gör`}
                            >
                              <span className="font-medium">{topic.name}</span>
                              <span className={cn("px-2 py-1 rounded-full text-xs font-bold text-white", statusColor)}>{statusText} ({p.toFixed(0)}%)</span>
                            </div>
                          ); 
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ); 
              })}
            </Accordion>
          )
        ) : (
          <p className="text-center text-muted-foreground">Analiz edilecek tamamlanmış soru çözüm görevi bulunmamaktadır.</p>
        )}
      </div>
    );
  };

  const renderMyStudentsList = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-900/30 dark:to-orange-900/30">
      <Card className="mt-0">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            <Users className="mr-2 h-6 w-6 text-current"/> 
            <span>ÖĞRENCİLERİM ({students.length})</span>
          </CardTitle>
          <CardDescription className="text-center">Öğrencilerinizin görev durumlarını ve ilerlemelerini buradan takip edebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz öğrenciniz yok.</p>
          ) : (
            <Accordion type="multiple" className="w-full" value={openStudentAccordions} onValueChange={setOpenStudentAccordions}>
              {students.map(student => {
                const studentAssignments = teacherAssignments.filter(a => a.student_id === student.id);
                const studentBadges = badges.filter(b => b.user_id === student.user_id);
                
                // Öğrencinin son kontrol zamanı
                const lastCheckTime = student.profile.last_assignment_check_at ? parseISO(student.profile.last_assignment_check_at) : new Date(0);
                
                // Öğrenciye atanan en son aktif görev
                const latestActiveAssignment = studentAssignments
                  .filter(a => a.status === 'active')
                  .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                // Yeni görev var mı ve görülmedi mi?
                const hasUnseenNewAssignment = latestActiveAssignment && parseISO(latestActiveAssignment.created_at) > lastCheckTime;

                // Öğretmen görünümünde de anlık filtreleme yap
                const now = new Date();
                const activeCount = studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now).length;
                const pendingCount = studentAssignments.filter(a => a.status === 'pending_approval').length;
                
                const completedStudentAssignments = studentAssignments.filter(a => 
                  a.status === 'completed' || (a.status === 'active' && new Date(a.due_at) <= now)
                ).map(a => {
                  if (a.status === 'active' && new Date(a.due_at) <= now) {
                    return { ...a, status: 'completed', is_rejected_by_deadline: true, rejection_reason: 'deadline' } as Assignment;
                  }
                  return a;
                });

                const approvedCount = completedStudentAssignments.filter(a => !a.rejection_reason).length;
                const rejectedCount = completedStudentAssignments.filter(a => !!a.rejection_reason).length;

                return (
                  <AccordionItem value={student.id} key={student.id}>
                    <AccordionTrigger className={cn(
                      `bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold hover:brightness-90 data-[state=open]:shadow-md rounded-lg px-3 transition-all duration-300`
                    )}>
                      <div className="flex justify-between w-full pr-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold uppercase">{student.name}</span>
                          {hasUnseenNewAssignment && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse" title="Yeni görev atandı, öğrenci henüz görmedi.">
                              GÖRÜLMEDİ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          {activeCount > 0 && (<span className="flex items-center font-semibold text-blue-800 dark:text-blue-200"><Clock className="mr-1.5 h-5 w-5" /> {activeCount} Aktif</span>)}
                          {pendingCount > 0 && (<span className="flex items-center font-semibold text-red-800 dark:text-red-200"><Hourglass className="mr-1.5 h-5 w-5" /> {pendingCount} Onayda</span>)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-2 border-t">
                        <BadgeDisplay badges={studentBadges} />
                        <Tabs defaultValue="active">
                          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
                            <TabsTrigger 
                              value="active" 
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Aktif ({activeCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="pending_approval"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              Onay ({pendingCount})
                            </TabsTrigger>
                            <TabsTrigger 
                              value="completed"
                              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <span>Biten</span>
                                {(approvedCount > 0 || rejectedCount > 0) && (<div className="flex items-center text-xs font-semibold ml-1">(<span className="text-blue-600">{approvedCount}</span>/<span className="text-red-600">{rejectedCount}</span>)</div>)}
                              </div>
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="active">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'active' && new Date(a.due_at) > now), studentAssignments, false)}</TabsContent>
                          <TabsContent value="pending_approval" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, studentAssignments.filter(a => a.status === 'pending_approval'), studentAssignments, false)}</TabsContent>
                          <TabsContent value="completed" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(student.id, completedStudentAssignments, studentAssignments, true)}</TabsContent>
                        </Tabs>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTeacherRequiredTopicsTab = () => (
    <div className="space-y-4">
      <Select onValueChange={handleStudentChangeForAnalysis} value={selectedStudentId || ''}>
        <SelectTrigger className="mt-4" title="Analiz için bir öğrenci seçin">
          <SelectValue placeholder="Analiz için bir öğrenci seçin..." />
        </SelectTrigger>
        <SelectContent>
          {students.map(s => <SelectItem key={s.id} value={s.id} className="font-bold uppercase">{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {selectedStudentId ? (
        <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-900/30 dark:to-pink-900/30">
          <Card className="mt-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
                  <Target className="mr-2 h-6 w-6 text-current"/> 
                  {teacherAnalysisSubject 
                    ? (teacherAnalysisSubtopic || teacherAnalysisSubject) 
                    : 'Çalışılması Gereken Konular'}
                </CardTitle>
                {teacherAnalysisSubject ? (
                  <Button variant="ghost" onClick={() => { setTeacherAnalysisSubject(null); setTeacherAnalysisSubtopic(null); }} className="mr-2" title="Önceki görünüme geri dön">
                    <ArrowLeft className="h-5 w-5 mr-2" /> Geri Dön
                  </Button>
                ) : (
                  studentAnalysisData && Object.keys(studentAnalysisData).length > 0 && (
                    <Button variant="ghost" size="icon" onClick={() => setTeacherAnalysisOpenAccordions([])} title="Tüm konuları kapat">
                      <XCircle className="h-5 w-5" />
                    </Button>
                  )
                )}
              </div>
              <CardDescription>Seçilen öğrencinin performansına göre tekrar etmesi gereken konular.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderCoreAnalysisContent(
                studentAnalysisData, 
                teacherAnalysisOpenAccordions, 
                setTeacherAnalysisOpenAccordions, 
                teacherAnalysisSubject,
                setTeacherAnalysisSubject,
                setTeacherAnalysisSubtopic,
                teacherAnalysisTopicChartData
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="mt-6 p-6 text-center text-muted-foreground">
          Lütfen analiz etmek istediğiniz öğrenciyi seçin.
        </Card>
      )}
    </div>
  );

  const renderTeacherBookAnalysisTab = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 dark:from-orange-900/30 dark:to-yellow-900/30">
      <Card className="mt-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">Okuma Analizi</CardTitle>
          <CardDescription>Öğrencilerinizin okuma ilerlemesini görüntüleyin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select onValueChange={handleStudentChangeForAnalysis} value={selectedStudentId || ''}>
            <SelectTrigger title="Analiz için bir öğrenci seçin"><SelectValue placeholder="Analiz için bir öğrenci seçin..." /></SelectTrigger>
            <SelectContent>
              {students.map(s => <SelectItem key={s.id} value={s.id} className="font-bold uppercase">{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedStudentId && bookReadingData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookReadingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-90} textAnchor="end" height={80} interval={0} />
                  <YAxis label={{ value: 'Okunan Sayfa', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="Okunan Sayfa" 
                    fillOpacity={0.8}
                    barSize={20}
                    onClick={(data: any) => {
                      if (data.isRejected) {
                        showError(`Bu görev öğretmen tarafından reddedilmiştir.`);
                      } else {
                        showSuccess(`Bu görev başarıyla onaylanmıştır.`);
                      }
                    }}
                  >
                    {bookReadingData.map((entry: any, index) => (
                      <Bar key={`bar-${index}`} dataKey="Okunan Sayfa" fill={entry.isRejected ? '#ef4444' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Onaylandı</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Reddedildi</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground pt-8">Okuma görevi verisi bulunamadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTrialExamTab = () => (
    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 dark:from-purple-900/30 dark:to-blue-900/30">
      <Card className="mt-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Deneme Sınavı Takibi</CardTitle>
              <CardDescription>Net yüzdelerinizin zaman içindeki değişimini izleyin.</CardDescription>
            </div>
          </div>
          {profile?.role === 'teacher' && (
            <Select onValueChange={setSelectedStudentId} value={selectedStudentId || ''}>
              <SelectTrigger className="mt-4" title="Grafiği görüntülenecek öğrenciyi seçin"><SelectValue placeholder="Grafiği görüntülemek için bir öğrenci seçin..." /></SelectTrigger>
              <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id} className="font-bold uppercase">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {trialExamData.length > 0 ? (
            <>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trialExamData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} domain={[0, 100]} />
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]} />
                    <Legend />
                    {Object.keys(subjectChartColors).map(subject => (
                      <Line key={subject} type="monotone" dataKey={subject} stroke={subjectChartColors[subject]} strokeWidth={2} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 overflow-x-auto">
                <h3 className="text-lg font-semibold mb-4">Net Sayıları</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deneme</TableHead>
                      {Object.entries(subjectChartColors).map(([subject, color]) => (
                        <TableHead key={subject} className="text-center" style={{ color }}>
                          {subject}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialExamData.map((exam, index) => {
                      const previousExam = index > 0 ? trialExamData[index - 1] : null;
                      const student = students.find(s => s.id === exam.student_id);
                      const studentName = student ? student.name.toUpperCase() : 'ÖĞRENCİ';
                      
                      // Öğrenci rolündeyse öğrenci adını gösterme
                      const displayStudentName = profile?.role === 'teacher' && studentName ? `(${studentName})` : '';

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{exam.fullName}{displayStudentName}</TableCell>
                          {Object.keys(subjectChartColors).map(subject => {
                            const currentNet = exam[`${subject}_net`];
                            const previousNet = previousExam ? previousExam[`${subject}_net`] : null;
                            let trendIcon = null;

                            if (previousNet != null && currentNet != null) {
                              if (currentNet > previousNet) {
                                trendIcon = <ArrowUp className="h-5 w-5 text-green-500" />;
                              } else if (currentNet < previousNet) {
                                trendIcon = <ArrowDown className="h-5 w-5 text-red-500" />;
                              } else {
                                trendIcon = <ArrowRight className="h-5 w-5 text-gray-500" />;
                              }
                            }

                            return (
                              <TableCell key={subject} className="text-center font-mono">
                                <div className="flex items-center justify-center gap-1">
                                  {currentNet != null ? currentNet.toFixed(2) : '---'}
                                  {trendIcon}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-100"
                              onClick={() => setExamSessionToDelete(exam)}
                              title="Deneme sınavını sil"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground pt-8">Grafiği görüntülemek için lütfen deneme sınavı sonucu girin {profile?.role === 'teacher' && 've bir öğrenci seçin'}.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const userNameDisplay = profile?.role === 'teacher' 
    ? `${profile?.first_name} ${profile?.last_name}`.toUpperCase()
    : `${profile?.first_name} ${profile?.last_name}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-foreground p-4 md:p-8">
      {showFireworks && <Fireworks />}
      {animatedBadge && <BadgeAnimation badgeName={animatedBadge} onAnimationEnd={() => setAnimatedBadge(null)} />}
      
      {/* Yeni Görev Uyarısı Modalı (Sadece Öğrenci için) */}
      {profile?.role === 'student' && (
        <AssignmentAlertModal 
          assignments={assignments} 
          profile={profile} 
          onMarkAsSeen={fetchAllData} 
        />
      )}

      <header className="flex justify-between items-center mb-8 pb-4 border-b gap-4">
        <img
          src="/logo.png"
          alt="SyncMind Logo"
          className="h-12 w-auto cursor-pointer"
          onClick={handleTitleClick}
          title="Ana sayfayı yenile"
        />
        <div className="flex items-center gap-4">
          {profile?.role === 'student' ? (
            <>
              <BadgeDisplay badges={badges} />
              <div className="flex items-center gap-2">
                {newAssignmentCount > 0 && (
                  <div className="relative" title={`${newAssignmentCount} yeni görev!`}>
                    <BellRing className="h-6 w-6 text-red-500 animate-pulse" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {newAssignmentCount}
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-end gap-1">
                  <Button onClick={handleLogout} variant="outline" className="flex-shrink-0" title="Oturumu kapat">
                      <LogOut className="h-5 w-5 sm:mr-2" />
                      <span className="hidden sm:inline">Çıkış</span>
                  </Button>
                  <span className="text-sm text-red-600 dark:text-red-400 font-bold uppercase text-right truncate">
                    {userNameDisplay}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-end min-w-0">
                <Dialog open={isStudentManagementOpen} onOpenChange={setIsStudentManagementOpen}>
                    <DialogTrigger asChild>
                        <Button variant="link" className="text-sm text-red-600 dark:text-red-400 font-bold uppercase text-right truncate p-0 h-auto hover:text-red-700 flex items-center" title="Öğrenci yönetimi ve ayarları">
                            {userNameDisplay}
                            <Settings className="ml-1 h-4 w-4 text-gray-500" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">Öğrenci Yönetimi</DialogTitle>
                            <DialogDescription>
                                Buradan öğrencilerinizi silebilir ve tüm öğrenci verilerini temizleyebilirsiniz.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            <h3 className="text-lg font-semibold border-b pb-2">Bireysel Öğrenci Silme</h3>
                            {students.length > 0 ? students.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <span className="font-bold uppercase">{student.name}</span>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => {
                                            setStudentToDelete(student);
                                            setIsStudentManagementOpen(false);
                                        }}
                                        title={`${student.name} adlı öğrenciyi sil`}
                                        >
                                        <Trash2 className="mr-2 h-4 w-4" /> Sil
                                    </Button>
                                </div>
                            )) : <p className="text-center text-muted-foreground">Yönetilecek öğrenci bulunmuyor.</p>}
                        </div>
                        <DialogFooter className="mt-4">
                            <Button 
                                onClick={() => {
                                    setIsClearAllDialogOpen(true);
                                    setIsStudentManagementOpen(false);
                                }} 
                                variant="destructive" 
                                className="w-full"
                                disabled={teacherAssignments.length === 0 && trialExams.length === 0}
                                title="Tüm öğrenci verilerini kalıcı olarak sil"
                            >
                                <Trash2 className="mr-2 h-5 w-5"/> Tüm Öğrenci Verilerini Sil (Geri Alınamaz)
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="link" className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1" title="Öğrencilerinizle paylaşmak için öğretmen kodunuzu görüntüleyin">
                            <Code className="mr-1 h-4 w-4" /> Öğretmen Kodunu Göster
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Öğretmen Kodunuz</DialogTitle>
                        </DialogHeader>
                        <p className="mb-4 text-sm sm:text-base">Öğrencilerinizin kaydolması için bu kodu paylaşın:</p>
                        <div className="flex items-center space-x-2">
                            <Input type="text" value={profile ? profile.teacher_code || 'Kod Yok' : 'Kod Yok'} readOnly className="font-mono text-lg" />
                            <Button onClick={() => { (navigator as Navigator).clipboard.writeText(profile ? profile.teacher_code || '' : ''); showSuccess('Kod kopyalandı!'); }} title="Öğretmen kodunu kopyala">
                                <Copy className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
              </div>
              <Button onClick={handleLogout} variant="outline" className="flex-shrink-0" title="Oturumu kapat">
                  <LogOut className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </>
          )}
        </div>
      </header>
      <main>
        {profile?.role === 'teacher' ? (
          <Tabs value={activeTeacherTab} onValueChange={handleTeacherTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted p-1 rounded-md">
              <TabsTrigger 
                value="management" 
                title="Görev yönetimi ve öğrenci işlemleri"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <Settings className="mr-2 h-5 w-5"/> Yönetim
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                title="Öğrenci performans analizleri"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <BarChart2 className="mr-2 h-5 w-5"/> Analiz
              </TabsTrigger>
            </TabsList>
            <TabsContent value="management">
              <div className="space-y-6">
                {renderMyStudentsList()}
                <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 dark:from-blue-900/30 dark:to-purple-900/30">
                  <Card className="mt-0">
                    <CardHeader className="text-center">
                      <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                        <Send className="mr-2 h-6 w-6 text-current" /> 
                        <span>YÖNETİM ARAÇLARI</span>
                      </CardTitle>
                      <CardDescription className="text-center">Öğrencilerinize görev atayın veya deneme sınavı sonuçlarını girin.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4 sm:justify-between">
                      <AssignmentFormModal 
                        students={students} 
                        teacherId={user?.id || ''} 
                        onAssignmentSent={fetchAllData} 
                      />
                      <Dialog open={isTrialExamDialogOpen} onOpenChange={setIsTrialExamDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className="sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-lg h-12 shadow-lg transition-all duration-300" 
                            title="Yeni deneme sınavı sonucu gir"
                          >
                            <FileText className="mr-2 h-5 w-5" /> Deneme Girişi
                          </Button>
                        </DialogTrigger>
                        <TrialExamForm 
                          students={students}
                          onSuccess={fetchAllData}
                          isOpen={isTrialExamDialogOpen}
                          onOpenChange={setIsTrialExamDialogOpen}
                          teacherId={user?.id || ''}
                        />
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="analysis">
              <Tabs defaultValue="requiredTopics">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted p-1 rounded-md">
                  <TabsTrigger 
                    value="requiredTopics" 
                    title="Öğrencilerin çalışması gereken konuları görüntüle"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <Target className="mr-1 sm:mr-2 h-5 w-5 text-current"/> 
                    <span className="hidden sm:inline">Konu Analizi</span>
                    <span className="inline sm:hidden">Konu</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bookAnalysis" 
                    title="Kitap okuma ilerlemelerini takip et"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <ScrollText className="mr-1 sm:mr-2 h-5 w-5 text-current"/> 
                    <span className="hidden sm:inline">Okuma Analizi</span>
                    <span className="inline sm:hidden">Okuma</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trialAnalysis" 
                    title="Deneme sınavı sonuçlarını görüntüleyin"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <ClipboardCheck className="mr-1 sm:mr-2 h-5 w-5 text-current"/> 
                    <span>Deneme Analizi</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="requiredTopics">
                  {renderTeacherRequiredTopicsTab()}
                </TabsContent>
                <TabsContent value="bookAnalysis">
                  {renderTeacherBookAnalysisTab()}
                </TabsContent>
                <TabsContent value="trialAnalysis">
                  {renderTrialExamTab()}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <Dialog open={isSelfAnalysisModalOpen} onOpenChange={(open) => { 
              setIsSelfAnalysisModalOpen(open); 
              if (!open) {
                setStudentModalDetailSubject(null);
                setStudentModalDetailSubtopic(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full mt-6 font-bold text-base sm:text-lg flex items-center justify-between transition-all duration-300",
                    totalSelfAnalysisSummary.acil > 0
                      ? "animate-red-glow border-red-500 text-red-500 hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-900/20"
                      : "border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
                  )}
                  title="Çalışılması gereken konularınızı görüntüleyin"
                >
                  <div className="flex items-center">
                    <BarChart2 className={cn(
                      "mr-2 h-5 w-5",
                      totalSelfAnalysisSummary.acil > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )}/>
                    <span>KONULAR & ANALİZLERİ</span>
                  </div>
                  {(totalSelfAnalysisSummary.acil > 0 || totalSelfAnalysisSummary.gelistir > 0 || totalSelfAnalysisSummary.iyi > 0 || totalSelfAnalysisSummary.mukemmel > 0) && (
                    <div className="flex items-center space-x-1">
                      {totalSelfAnalysisSummary.acil > 0 && (
                        <span className="flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-5 w-5" title="Acil Bakılması Gereken Konular">
                          {totalSelfAnalysisSummary.acil}
                        </span>
                      )}
                      {totalSelfAnalysisSummary.gelistir > 0 && (
                        <span className="flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full h-5 w-5" title="Geliştirilmesi Gereken Konular">
                          {totalSelfAnalysisSummary.gelistir}
                        </span>
                      )}
                      {totalSelfAnalysisSummary.iyi > 0 && (
                        <span className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full h-5 w-5" title="İyi Seviyedeki Konular">
                          {totalSelfAnalysisSummary.iyi}
                        </span>
                      )}
                      {totalSelfAnalysisSummary.mukemmel > 0 && (
                        <span className="flex items-center justify-center text-xs font-bold text-white bg-green-500 rounded-full h-5 w-5" title="Mükemmel Seviyedeki Konular">
                          {totalSelfAnalysisSummary.mukemmel}
                        </span>
                      )}
                    </div>
                  )}
                </Button>
              </DialogTrigger>
              {studentSelfAnalysisBySubject && Object.keys(studentSelfAnalysisBySubject).length > 0 && (
                <DialogContent className="max-w-3xl">
                  <DialogHeader className="flex flex-row items-center justify-between">
                    {studentModalDetailSubject ? (
                      <Button variant="ghost" onClick={() => { setStudentModalDetailSubject(null); setStudentModalDetailSubtopic(null); }} className="mr-2" title="Önceki görünüme geri dön">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Geri Dön
                      </Button>
                    ) : null}
                    <DialogTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
                      <Target className="mr-2 h-6 w-6 text-current"/> 
                      {studentModalDetailSubject 
                        ? (studentModalDetailSubtopic || studentModalDetailSubject) 
                        : 'Çalışılması Gereken Konular'}
                    </DialogTitle>
                  </DialogHeader>
                  {renderCoreAnalysisContent(
                    studentSelfAnalysisBySubject, 
                    studentModalOpenAccordions, 
                    setStudentModalOpenAccordions, 
                    studentModalDetailSubject,
                    setStudentModalDetailSubject,
                    setStudentModalDetailSubtopic,
                    studentSelfTopicAnalysisChartData
                  )}
                </DialogContent>
              )}
            </Dialog>
            
            <Tabs defaultValue="active" className="mt-6">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-1 rounded-md">
                <TabsTrigger value="active" title="Devam eden aktif görevleriniz"
                  className="flex items-center justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md p-2">
                  <Clock className="hidden sm:inline-block mr-2 h-5 w-5 data-[state=active]:text-white" /> 
                  <span>Aktif ({activeAssignments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="pending_approval" title="Öğretmen onayını bekleyen görevleriniz"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md p-2">
                  <Hourglass className="hidden sm:inline-block mr-2 h-5 w-5 data-[state=active]:text-white" /> 
                  <span>Onayda</span>
                  {(pendingAssignments.length > 0) && (
                    <span className="text-xs font-semibold ml-1 data-[state=active]:text-white text-foreground">
                      ({pendingAssignments.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" title="Tamamlanmış görevleriniz"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md p-2">
                  <CheckCircle className="hidden sm:inline-block mr-2 h-5 w-5 data-[state=active]:text-white" /> 
                  <span>Biten</span>
                  {(completedAssignments.length > 0) && (
                    <div className="flex items-center text-xs font-semibold ml-1 data-[state=active]:text-white text-foreground">
                      (<span className="data-[state=active]:text-white text-green-600 dark:text-green-400">{completedAssignments.filter(a => !a.rejection_reason).length}</span>/<span className="data-[state=active]:text-white text-red-600 dark:text-red-400">{completedAssignments.filter(a => !!a.rejection_reason).length}</span>)
                    </div>
                  )}
                </TabsTrigger>
                <TabsTrigger value="analysis" title="Performans analizlerinizi görüntüleyin"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md p-2">
                  <BarChart2 className="hidden sm:inline-block mr-2 h-5 w-5 data-[state=active]:text-white" /> 
                  <span>Analiz</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active">{user?.id && renderAssignmentsGroupedBySubject(user.id, activeAssignments, assignments, false)}</TabsContent>
              <TabsContent value="pending_approval" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(user.id, pendingAssignments, assignments, false)}</TabsContent>
              <TabsContent value="completed" className="mt-4">{user?.id && renderAssignmentsGroupedBySubject(user.id, completedAssignments, assignments, true)}</TabsContent>
              <TabsContent value="analysis">
                <Tabs defaultValue="topicAnalysis">
                  <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md">
                    <TabsTrigger 
                      value="topicAnalysis" 
                      title="Konu analizlerinizi görüntüleyin"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    >
                      <Target className="mr-1 sm:mr-2 h-5 w-5 text-current"/> 
                      <span className="hidden sm:inline">Konu Analizi</span>
                      <span className="inline sm:hidden">Konu</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="bookAnalysis" 
                      title="Okuma ilerlemenizi takip edin"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    >
                      <ScrollText className="mr-1 sm:mr-2 h-5 w-5 text-current"/> 
                      <span className="hidden sm:inline">Okuma Analizi</span>
                      <span className="inline sm:hidden">Okuma</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="trialAnalysis" 
                      title="Deneme sınavı sonuçlarınızı görüntüleyin"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                    >
                      <ClipboardCheck className="mr-1 sm:mr-2 h-5 w-5 text-current"/> 
                      <span>Deneme Analizi</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="topicAnalysis">
                    <div className="p-1 border-2 border-transparent rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-900/30 dark:to-pink-900/30">
                      <Card className="mt-0">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
                              <Target className="mr-2 h-6 w-6 text-current"/> 
                              {studentModalDetailSubject 
                                ? (studentModalDetailSubtopic || studentModalDetailSubject) 
                                : 'Çalışılması Gereken Konular'}
                            </CardTitle>
                            {studentModalDetailSubject ? (
                              <Button variant="ghost" onClick={() => { setStudentModalDetailSubject(null); setStudentModalDetailSubtopic(null); }} className="mr-2" title="Önceki görünüme geri dön">
                                <ArrowLeft className="h-5 w-5 mr-2" /> Geri Dön
                              </Button>
                            ) : (
                              studentSelfAnalysisBySubject && Object.keys(studentSelfAnalysisBySubject).length > 0 && (
                                <Button variant="ghost" size="icon" onClick={() => setStudentModalOpenAccordions([])} title="Tüm konuları kapat">
                                  <XCircle className="h-5 w-5" />
                                </Button>
                              )
                            )}
                          </div>
                          <CardDescription>Tamamladığınız soru çözümü görevlerine göre performans analiziniz.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {renderCoreAnalysisContent(
                            studentSelfAnalysisBySubject, 
                            studentModalOpenAccordions, 
                            setStudentModalOpenAccordions, 
                            studentModalDetailSubject,
                            setStudentModalDetailSubject,
                            setStudentModalDetailSubtopic,
                            studentSelfTopicAnalysisChartData
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="bookAnalysis">
                    {renderTeacherBookAnalysisTab()}
                  </TabsContent>
                  <TabsContent value="trialAnalysis">
                    {renderTrialExamTab()}
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </>
        )}
        {/* PWA Kurulum Bileşeni */}
        <PWAInstallPrompt />
      </main>
      <AlertDialog open={!!assignmentToSubmit} onOpenChange={() => setAssignmentToSubmit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Görevi Onaya Gönder</AlertDialogTitle>
            <AlertDialogDescription>"{assignmentToSubmit?.subtopic}" görevini bitirdiniz mi? Öğretmeninizin onayına gönderilecek.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmitForApproval}>Onaya Gönder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!assignmentToReview} onOpenChange={() => setAssignmentToReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Görevi İncele</AlertDialogTitle>
            <AlertDialogDescription>Öğrencinin "{assignmentToReview?.subtopic}" görevini değerlendirin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel onClick={() => setAssignmentToReview(null)}>İptal</AlertDialogCancel>
            <Button variant="destructive" onClick={() => assignmentToReview && handleTeacherReviewAssignment(assignmentToReview.id, false)}>
              <ThumbsDown className="mr-2 h-5 w-5"/> Bitmedi
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => assignmentToReview && handleTeacherReviewAssignment(assignmentToReview.id, true)}>
              <ThumbsUp className="mr-2 h-5 w-5"/> Bitti
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Görevi Sil</AlertDialogTitle>
            <AlertDialogDescription>"{assignmentToDelete?.subtopic}" görevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteSingleAssignment}>Evet, Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Tüm Öğrenci Verilerini Kalıcı Olarak Sil</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem, tüm öğrencilerinizin görevlerini ve deneme sınavı sınavlarını kalıcı olarak silecektir. Bu işlem geri alınamaz. Devam etmek için lütfen şifrenizi girin.</AlertDialogDescription>
            <Input type="password" placeholder="Şifreniz" value={passwordInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordInput(e.target.value)} className="mt-4" />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPasswordInput('')}>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleClearAllStudentData} disabled={teacherAssignments.length === 0 && trialExams.length === 0}>Evet, Hepsini Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!assignmentForAnalysis} onOpenChange={(open) => { if (!open) { setAssignmentForAnalysis(null); setAnalysisData({ correct: 0, incorrect: 0, blank: 0 }); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600">Analiz Verilerini Gir</DialogTitle>
            <DialogDescription>"{assignmentForAnalysis?.subtopic}" görevi için toplam {totalQuestionsForAnalysis} soru bulunmaktadır. Lütfen sonuçları girin.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="correct">Doğru</Label>
              <Input id="correct" type="number" value={analysisData.correct} onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisData(d => ({...d, correct: +e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incorrect">Yanlış</Label>
              <Input id="incorrect" type="number" value={analysisData.incorrect} onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisData(d => ({...d, incorrect: +e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blank">Boş</Label>
              <Input id="blank" type="number" value={analysisData.blank} onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisData(d => ({...d, blank: +e.target.value}))} />
            </div>
          </div>
          <div className="text-center text-sm mb-4">
            <p className={cn("font-semibold", isAnalysisDataValid ? "text-green-600" : "text-red-600")}>Girilen Toplam: {currentAnalysisSum} / Gerekli: {totalQuestionsForAnalysis}</p>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAnalysisData} disabled={!isAnalysisDataValid}>Kaydet ve Bitir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!examSessionToDelete} onOpenChange={() => setExamSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Deneme Sınavını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              "{examSessionToDelete?.fullName}" denemesini ve ilgili tüm ders verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz. Devam etmek için lütfen şifrenizi girin.
            </AlertDialogDescription>
            <Input
              type="password"
              placeholder="Şifreniz"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="mt-4"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPasswordInput('')}>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteTrialExam}
              disabled={!passwordInput}
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Öğrenciyi Kalıcı Olarak Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem "{studentToDelete?.name}" adlı öğrenciyi ve öğrenciye ait tüm görevleri, deneme sınavlarını ve profil bilgilerini kalıcı olarak silecektir. Bu işlem geri alınamaz. Devam etmek için lütfen şifrenizi girin.
            </AlertDialogDescription>
            <Input
              type="password"
              placeholder="Şifreniz"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="mt-4"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPasswordInput('')}>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteStudent}
              disabled={!passwordInput}
            >
              Evet, Öğrenciyi Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;