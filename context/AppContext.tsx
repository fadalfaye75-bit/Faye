
import React, { createContext, useContext, useState, PropsWithChildren, useEffect, useCallback } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, SentEmail, EmailConfig, AppContextType, TimeTable, Course, ReminderSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { sendEmail } from '../services/emailService';
import { MOCK_USERS, MOCK_CLASSES, MOCK_ANNOUNCEMENTS, MOCK_MEETS, MOCK_EXAMS, MOCK_POLLS, MOCK_COURSES, MOCK_LOGS } from '../constants';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Settings
const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: true,
  courseDelay: 15,
  examDelay: 60 * 24,
  meetDelay: 30
};

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meets, setMeets] = useState<MeetSession[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [schoolName, setSchoolNameState] = useState('Class Connect+');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'MAILTO', 
    senderName: 'SunuClasse',
    senderEmail: 'faye@ecole.com'
  });

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const getCurrentClass = () => classes.find(c => c.id === user?.classId);

  // --- INITIAL LOAD & AUTH RESTORATION ---
  useEffect(() => {
    // 1. Theme Restoration
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }

    // 2. Reminders Restoration
    const storedReminders = localStorage.getItem('sunuclasse_reminders');
    if (storedReminders) {
      try { setReminderSettings(JSON.parse(storedReminders)); } catch (e) {}
    }

    // 3. Session & Demo Check
    const storedUser = localStorage.getItem('sunuclasse_user') || sessionStorage.getItem('sunuclasse_user');
    const storedDemo = localStorage.getItem('sunuclasse_demo') === 'true';

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (storedDemo) {
          setIsDemoMode(true);
          refreshAllData(true); // Force demo load
        } else {
          refreshAllData(false);
        }
      } catch (e) {
        console.error("Session invalide, déconnexion.");
        localStorage.removeItem('sunuclasse_user');
      }
    } else {
       refreshAllData(false); // Try loading public data anyway if any
    }
  }, []);

  const updateReminderSettings = (settings: ReminderSettings) => {
    setReminderSettings(settings);
    localStorage.setItem('sunuclasse_reminders', JSON.stringify(settings));
    addNotification("Préférences de rappel mises à jour", "SUCCESS");
  };

  // --- DATA FETCHING (Supabase vs Mock) ---
  const refreshAllData = async (forceDemo = false) => {
    const useDemo = forceDemo || isDemoMode || localStorage.getItem('sunuclasse_demo') === 'true';

    if (useDemo) {
      // Load Mock Data
      setUsers(prev => prev.length > 0 ? prev : MOCK_USERS);
      setClasses(prev => prev.length > 0 ? prev : MOCK_CLASSES);
      setAnnouncements(prev => prev.length > 0 ? prev : MOCK_ANNOUNCEMENTS);
      setMeets(prev => prev.length > 0 ? prev : MOCK_MEETS);
      setExams(prev => prev.length > 0 ? prev : MOCK_EXAMS);
      setPolls(prev => prev.length > 0 ? prev : MOCK_POLLS);
      setCourses(prev => prev.length > 0 ? prev : MOCK_COURSES);
      setAuditLogs(prev => prev.length > 0 ? prev : MOCK_LOGS);
      return;
    }

    // Load Real Data
    try {
      const { data: settingsData } = await supabase.from('app_settings').select('*');
      if (settingsData) {
        const name = settingsData.find(s => s.key === 'school_name')?.value;
        if (name) setSchoolNameState(name);
        
        const provider = settingsData.find(s => s.key === 'email_provider')?.value;
        const sender = settingsData.find(s => s.key === 'email_sender')?.value;
        if (provider) setEmailConfig(prev => ({ ...prev, provider: provider as any, senderEmail: sender }));
      }

      const { data: classesData } = await supabase.from('classes').select('*');
      if (classesData) setClasses(classesData);

      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        setUsers(usersData.map((u: any) => ({ ...u, classId: u.class_id })));
      }

      const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (annData) {
        setAnnouncements(annData.map((a: any) => ({
          ...a, classId: a.class_id, authorId: a.author_id, durationHours: a.duration_hours
        })));
      }

      const { data: meetData } = await supabase.from('meets').select('*').order('date', { ascending: true });
      if (meetData) {
        setMeets(meetData.map((m: any) => ({
          ...m, teacherName: m.teacher_name, classId: m.class_id, authorId: m.author_id
        })));
      }

      const { data: examData } = await supabase.from('exams').select('*').order('date', { ascending: true });
      if (examData) {
        setExams(examData.map((e: any) => ({
          ...e, durationMinutes: e.duration_minutes, classId: e.class_id, authorId: e.author_id
        })));
      }

      const { data: pollData } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      if (pollData) {
        setPolls(pollData.map((p: any) => ({
          ...p, createdAt: p.created_at, isAnonymous: p.is_anonymous, classId: p.class_id, authorId: p.author_id, durationHours: p.duration_hours,
          options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options
        })));
      }

      const { data: ttData } = await supabase.from('time_tables').select('*').order('date_added', { ascending: false });
      if (ttData) {
        setTimeTables(ttData.map((t: any) => ({
          ...t, fileUrl: t.file_url, fileName: t.file_name, dateAdded: t.date_added, classId: t.class_id, authorId: t.author_id
        })));
      }

      const { data: courseData } = await supabase.from('courses').select('*');
      if (courseData) {
        setCourses(courseData.map((c: any) => ({
          ...c, dayOfWeek: c.day_of_week, startTime: c.start_time, endTime: c.end_time, classId: c.class_id
        })));
      }
      
      const { data: emailData } = await supabase.from('sent_emails').select('*').order('created_at', { ascending: false });
      if (emailData) setSentEmails(emailData);

      const { data: logsData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      if (logsData) setAuditLogs(logsData as AuditLog[]);

    } catch (err) {
      console.error("Erreur chargement données:", err);
    }
  };

  // --- AUTHENTICATION ---
  const login = async (email: string, password?: string, rememberMe?: boolean) => {
    // 1. Check Demo Users First
    const demoUser = MOCK_USERS.find(u => u.email === email);
    if (demoUser) {
        setUser(demoUser);
        setIsDemoMode(true);
        localStorage.setItem('sunuclasse_demo', 'true');
        if (rememberMe) localStorage.setItem('sunuclasse_user', JSON.stringify(demoUser));
        else sessionStorage.setItem('sunuclasse_user', JSON.stringify(demoUser));
        
        refreshAllData(true);
        addNotification(`Bienvenue ${demoUser.name} (Mode Démo)`, 'SUCCESS');
        return true;
    }

    // 2. Real Auth
    try {
      const { data: dbUser, error } = await supabase.from('users').select('*').eq('email', email).single();

      if (error || !dbUser) { console.error("Login fail:", error); return false; }

      if (password) {
          if (dbUser.role === 'ADMIN') { if (password !== 'passer25') return false; } 
          else { if (password.length < 4) return false; }
      } else return false;

      const appUser: User = {
        id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role as Role,
        classId: dbUser.class_id, avatar: dbUser.avatar
      };

      setUser(appUser);
      setIsDemoMode(false);
      localStorage.removeItem('sunuclasse_demo');
      
      if (rememberMe) localStorage.setItem('sunuclasse_user', JSON.stringify(appUser));
      else sessionStorage.setItem('sunuclasse_user', JSON.stringify(appUser));

      logAction('LOGIN', 'Connexion réussie');
      refreshAllData(false);
      return true;
    } catch (e) { console.error(e); return false; }
  };

  const logout = () => {
    if (user && !isDemoMode) logAction('LOGOUT', 'Déconnexion');
    setUser(null);
    setIsDemoMode(false);
    localStorage.removeItem('sunuclasse_user');
    sessionStorage.removeItem('sunuclasse_user');
    localStorage.removeItem('sunuclasse_demo');
  };

  // --- UTILS & MOCK HANDLERS ---
  const setSchoolName = async (name: string) => {
    setSchoolNameState(name);
    if (!isDemoMode) await supabase.from('app_settings').upsert({ key: 'school_name', value: name });
  };
  
  const updateEmailConfig = async (config: EmailConfig) => {
    setEmailConfig(config);
    if (!isDemoMode) {
      await supabase.from('app_settings').upsert({ key: 'email_provider', value: config.provider });
      if (config.senderEmail) await supabase.from('app_settings').upsert({ key: 'email_sender', value: config.senderEmail });
    }
  };

  const addNotification = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', targetPage?: string, resourceId?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notif: Notification = { id, message, type, timestamp: new Date().toISOString(), read: false, targetPage, resourceId };
    setNotifications(prev => [...prev, notif]);
    setNotificationHistory(prev => [notif, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const markNotificationAsRead = (id: string) => setNotificationHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotificationsAsRead = () => setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotification = (id: string) => setNotificationHistory(prev => prev.filter(n => n.id !== id));
  const clearNotificationHistory = () => setNotificationHistory([]);

  const logAction = async (action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    if (!user) return;
    const newLog: AuditLog = { id: Math.random().toString(), action, details, author: user.name, role: user.role, timestamp: new Date().toISOString(), severity };
    if (isDemoMode) {
        setAuditLogs(prev => [newLog, ...prev]);
    } else {
        try { await supabase.from('audit_logs').insert([{ action, details, author: user.name, role: user.role, severity }]); } catch (e) {}
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
     if (isDemoMode) {
         // Mock Upload
         return new Promise(resolve => setTimeout(() => resolve(URL.createObjectURL(file)), 1000));
     }
     try {
       const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
       const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
       if (error) { addNotification("Erreur upload", "ERROR"); return null; }
       const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
       return publicUrl;
     } catch (e) { return null; }
  };

  // --- CRUD OPERATIONS (Hybrid: Real vs Mock) ---

  const addAnnouncement = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9), authorId: user?.id, classId: user?.classId, date: item.date || new Date().toISOString() };
    if (isDemoMode) {
        setAnnouncements(prev => [newItem, ...prev]);
        addNotification('Annonce publiée (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('announcements').insert([{ title: item.title, content: item.content, date: newItem.date, urgency: item.urgency, link: item.link, attachments: item.attachments, duration_hours: item.durationHours, author_id: user?.id, class_id: user?.classId }]);
        if (!error) { refreshAllData(); addNotification('Annonce publiée', 'SUCCESS'); }
        else addNotification("Erreur", "ERROR");
    }
  };

  const updateAnnouncement = async (id: string, item: any) => {
    if (isDemoMode) {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...item } : a));
        addNotification('Annonce modifiée (Mode Démo)', 'SUCCESS');
    } else {
        const payload: any = { ...item };
        delete payload.durationHours;
        if (item.durationHours !== undefined) payload.duration_hours = item.durationHours;
        const { error } = await supabase.from('announcements').update(payload).eq('id', id);
        if (!error) { refreshAllData(); addNotification('Annonce mise à jour', 'SUCCESS'); }
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (isDemoMode) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        addNotification('Annonce supprimée (Mode Démo)', 'INFO');
    } else {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (!error) { refreshAllData(); addNotification('Annonce supprimée', 'INFO'); }
    }
  };

  const addMeet = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(), authorId: user?.id, classId: user?.classId };
    if (isDemoMode) {
        setMeets(prev => [...prev, newItem]);
        addNotification('Meet ajouté (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('meets').insert([{ subject: item.subject, link: item.link, date: item.date, teacher_name: item.teacherName, class_id: user?.classId, author_id: user?.id }]);
        if (!error) { refreshAllData(); addNotification('Meet programmé', 'SUCCESS'); }
    }
  };

  const updateMeet = async (id: string, item: any) => {
    if (isDemoMode) {
        setMeets(prev => prev.map(m => m.id === id ? { ...m, ...item } : m));
        addNotification('Meet modifié (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('meets').update({ ...item, teacher_name: item.teacherName }).eq('id', id);
        if (!error) { refreshAllData(); addNotification('Meet mis à jour', 'SUCCESS'); }
    }
  };

  const deleteMeet = async (id: string) => {
    if (isDemoMode) {
        setMeets(prev => prev.filter(m => m.id !== id));
        addNotification('Meet supprimé (Mode Démo)', 'INFO');
    } else {
        const { error } = await supabase.from('meets').delete().eq('id', id);
        if (!error) { refreshAllData(); addNotification('Meet supprimé', 'INFO'); }
    }
  };

  const addExam = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(), authorId: user?.id, classId: user?.classId };
    if (isDemoMode) {
        setExams(prev => [...prev, newItem]);
        addNotification('Examen ajouté (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('exams').insert([{ subject: item.subject, date: item.date, duration_minutes: item.durationMinutes, room: item.room, notes: item.notes, author_id: user?.id, class_id: user?.classId }]);
        if (!error) { refreshAllData(); addNotification('Examen ajouté', 'SUCCESS'); }
    }
  };

  const updateExam = async (id: string, item: any) => {
    if (isDemoMode) {
        setExams(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
        addNotification('Examen modifié (Mode Démo)', 'SUCCESS');
    } else {
        const payload: any = { ...item };
        if (item.durationMinutes) { payload.duration_minutes = item.durationMinutes; delete payload.durationMinutes; }
        const { error } = await supabase.from('exams').update(payload).eq('id', id);
        if (!error) { refreshAllData(); addNotification('Examen mis à jour', 'SUCCESS'); }
    }
  };

  const deleteExam = async (id: string) => {
    if (isDemoMode) {
        setExams(prev => prev.filter(e => e.id !== id));
        addNotification('Examen supprimé (Mode Démo)', 'INFO');
    } else {
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (!error) { refreshAllData(); addNotification('Examen supprimé', 'INFO'); }
    }
  };

  const addPoll = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(), authorId: user?.id, classId: user?.classId, active: true, createdAt: new Date().toISOString() };
    if (isDemoMode) {
        setPolls(prev => [newItem, ...prev]);
        addNotification('Sondage créé (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('polls').insert([{ question: item.question, type: item.type || 'SINGLE', options: item.options, active: true, is_anonymous: item.isAnonymous, duration_hours: item.durationHours, class_id: user?.classId, author_id: user?.id }]);
        if (!error) { refreshAllData(); addNotification('Sondage créé', 'SUCCESS'); }
    }
  };

  const updatePoll = async (id: string, item: any) => {
    if (isDemoMode) {
        setPolls(prev => prev.map(p => p.id === id ? { ...p, ...item } : p));
    } else {
        const { error } = await supabase.from('polls').update(item).eq('id', id);
        if (!error) refreshAllData();
    }
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    if (isDemoMode) {
        setPolls(prev => prev.map(p => {
            if (p.id !== pollId) return p;
            const newOptions = p.options.map(opt => ({
                ...opt,
                voterIds: opt.id === optionId ? [...opt.voterIds, user.id] : opt.voterIds.filter(id => id !== user.id)
            }));
            return { ...p, options: newOptions };
        }));
        addNotification('Vote enregistré (Mode Démo)', 'SUCCESS');
    } else {
        const poll = polls.find(p => p.id === pollId);
        if (!poll) return;
        const cleanedOptions = poll.options.map(opt => ({ ...opt, voterIds: opt.voterIds.filter(vid => vid !== user.id) }));
        const updatedOptions = cleanedOptions.map(opt => opt.id === optionId ? { ...opt, voterIds: [...opt.voterIds, user.id] } : opt);
        const { error } = await supabase.from('polls').update({ options: updatedOptions }).eq('id', pollId);
        if (!error) { refreshAllData(); addNotification('Vote enregistré', 'SUCCESS'); }
    }
  };

  const deletePoll = async (id: string) => {
    if (isDemoMode) {
        setPolls(prev => prev.filter(p => p.id !== id));
        addNotification('Sondage supprimé (Mode Démo)', 'INFO');
    } else {
        const { error } = await supabase.from('polls').delete().eq('id', id);
        if (!error) { refreshAllData(); addNotification('Sondage supprimé', 'INFO'); }
    }
  };

  const addTimeTable = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(), authorId: user?.id, classId: user?.classId, dateAdded: new Date().toISOString() };
    if (isDemoMode) {
        setTimeTables(prev => [newItem, ...prev]);
        addNotification('Emploi du temps ajouté (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('time_tables').insert([{ title: item.title, file_url: item.fileUrl, file_name: item.fileName, class_id: user?.classId, author_id: user?.id }]);
        if (!error) { refreshAllData(); addNotification('Emploi du temps ajouté', 'SUCCESS'); }
    }
  };

  const deleteTimeTable = async (id: string) => {
    if (isDemoMode) {
        setTimeTables(prev => prev.filter(t => t.id !== id));
        addNotification('Fichier supprimé (Mode Démo)', 'INFO');
    } else {
        const { error } = await supabase.from('time_tables').delete().eq('id', id);
        if (!error) { refreshAllData(); addNotification('Fichier supprimé', 'INFO'); }
    }
  };

  const addCourse = async (item: any) => {
    const newItem = { ...item, id: Math.random().toString(), classId: user?.classId };
    if (isDemoMode) {
        setCourses(prev => [...prev, newItem]);
        addNotification('Cours ajouté (Mode Démo)', 'SUCCESS');
    } else {
        const { error } = await supabase.from('courses').insert([{ subject: item.subject, teacher: item.teacher, room: item.room, day_of_week: item.dayOfWeek, start_time: item.startTime, end_time: item.endTime, color: item.color, class_id: user?.classId }]);
        if (!error) { refreshAllData(); addNotification('Cours ajouté', 'SUCCESS'); }
    }
  };
  
  const updateCourse = async (id: string, item: any) => {
      if (isDemoMode) {
          setCourses(prev => prev.map(c => c.id === id ? { ...c, ...item } : c));
          addNotification('Cours modifié (Mode Démo)', 'SUCCESS');
      } else {
          const payload: any = { ...item, day_of_week: item.dayOfWeek, start_time: item.startTime, end_time: item.endTime };
          const { error } = await supabase.from('courses').update(payload).eq('id', id);
          if(!error) { refreshAllData(); addNotification('Cours modifié', 'SUCCESS'); }
      }
  }

  const deleteCourse = async (id: string) => {
    if (isDemoMode) {
        setCourses(prev => prev.filter(c => c.id !== id));
        addNotification('Cours supprimé (Mode Démo)', 'INFO');
    } else {
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (!error) { refreshAllData(); addNotification('Cours supprimé', 'INFO'); }
    }
  };

  const shareResource = async (type: string, item: any) => {
    if (isDemoMode) {
        addNotification('Email envoyé (Simulation Démo)', 'SUCCESS');
        return;
    }
    if (emailConfig.provider === 'SENDGRID') {
        const { error } = await supabase.from('sent_emails').insert([{
            recipient_email: 'classe@ecole.com', subject: `Partage: ${item.title || item.subject || 'Ressource'}`, body_html: `<p>Une ressource a été partagée.</p>`, resource_type: type, sender_name: user?.name, class_id: user?.classId
        }]);
        if(!error) { refreshAllData(); addNotification('Partagé par email (simulé)', 'SUCCESS'); }
    } else {
        addNotification('Configuration email requise (SendGrid)', 'INFO');
    }
  };

  const resendEmail = (email: SentEmail) => {
    addNotification('Renvoi email simulé...', 'INFO');
  };

  // ADMIN
  const addClass = async (name: string, description: string, email: string) => {
    const newItem = { id: Math.random().toString(), name, description, email };
    if (isDemoMode) { setClasses(prev => [...prev, newItem]); addNotification('Classe créée (Démo)', 'SUCCESS'); }
    else { const { error } = await supabase.from('classes').insert([{ name, description, email }]); if (!error) { refreshAllData(); addNotification('Classe créée', 'SUCCESS'); } }
  };
  const updateClass = async (id: string, item: any) => {
    if (isDemoMode) { setClasses(prev => prev.map(c => c.id === id ? { ...c, ...item } : c)); addNotification('Classe mise à jour', 'SUCCESS'); }
    else { const { error } = await supabase.from('classes').update(item).eq('id', id); if (!error) { refreshAllData(); addNotification('Classe mise à jour', 'SUCCESS'); } }
  };
  const deleteClass = async (id: string) => {
    if (isDemoMode) { setClasses(prev => prev.filter(c => c.id !== id)); addNotification('Classe supprimée', 'INFO'); }
    else { const { error } = await supabase.from('classes').delete().eq('id', id); if (!error) { refreshAllData(); addNotification('Classe supprimée', 'INFO'); } }
  };
  const addUser = async (userData: any) => {
    const newItem = { ...userData, id: Math.random().toString() };
    if (isDemoMode) { setUsers(prev => [...prev, newItem]); addNotification('Utilisateur ajouté (Démo)', 'SUCCESS'); }
    else { const { error } = await supabase.from('users').insert([{ name: userData.name, email: userData.email, role: userData.role, class_id: userData.classId || null }]); if (!error) { refreshAllData(); addNotification('Utilisateur ajouté', 'SUCCESS'); } }
  };
  const importUsers = async (usersData: any[]) => {
    if (isDemoMode) {
        setUsers(prev => [...prev, ...usersData.map(u => ({ ...u, id: Math.random().toString() } as User))]);
        addNotification(`${usersData.length} utilisateurs importés (Démo)`, 'SUCCESS');
    } else {
        const dbUsers = usersData.map(u => ({ name: u.name, email: u.email, role: u.role, class_id: u.classId || null }));
        const { error } = await supabase.from('users').insert(dbUsers);
        if (!error) { refreshAllData(); addNotification('Utilisateurs importés', 'SUCCESS'); }
    }
  };
  const updateUser = async (id: string, item: any) => {
    if (isDemoMode) { setUsers(prev => prev.map(u => u.id === id ? { ...u, ...item } : u)); addNotification('Utilisateur mis à jour', 'SUCCESS'); }
    else { 
        const payload: any = { ...item }; if(item.classId !== undefined) payload.class_id = item.classId;
        const { error } = await supabase.from('users').update(payload).eq('id', id); if (!error) { refreshAllData(); addNotification('Utilisateur mis à jour', 'SUCCESS'); } 
    }
  };
  const deleteUser = async (id: string) => {
    if (isDemoMode) { setUsers(prev => prev.filter(u => u.id !== id)); addNotification('Utilisateur supprimé', 'INFO'); }
    else { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) { refreshAllData(); addNotification('Utilisateur supprimé', 'INFO'); } }
  };

  // --- RENDER ---
  const contextValue: AppContextType = {
    user, users, classes, schoolName, setSchoolName,
    announcements, meets, exams, polls, sentEmails, timeTables, courses,
    auditLogs, notifications, notificationHistory,
    addNotification, dismissNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearNotificationHistory,
    highlightedItemId, setHighlightedItemId,
    reminderSettings, updateReminderSettings,
    theme, toggleTheme: () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark');
    },
    login, logout, getCurrentClass,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    addMeet, updateMeet, deleteMeet,
    addExam, updateExam, deleteExam,
    addPoll, updatePoll, votePoll, deletePoll,
    addTimeTable, deleteTimeTable,
    addCourse, updateCourse, deleteCourse,
    emailConfig, updateEmailConfig, shareResource, resendEmail,
    addClass, updateClass, deleteClass,
    addUser, importUsers, updateUser, deleteUser,
    uploadFile
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
