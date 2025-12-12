
import React, { createContext, useContext, useState, PropsWithChildren, useEffect } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, SentEmail, EmailConfig, AppContextType, TimeTable, Course, ReminderSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { sendEmail } from '../services/emailService';

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
  const [authLoading, setAuthLoading] = useState(true);
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meets, setMeets] = useState<MeetSession[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [schoolName, setSchoolNameState] = useState('Class Connect');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'MAILTO', 
    senderName: 'SunuClasse'
  });

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const getCurrentClass = () => classes.find(c => c.id === user?.classId);

  // --- INITIAL LOAD & AUTH LISTENER ---
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }

    // Reminders
    const storedReminders = localStorage.getItem('sunuclasse_reminders');
    if (storedReminders) {
      try { setReminderSettings(JSON.parse(storedReminders)); } catch (e) {}
    }

    // AUTH: Check session
    checkSession();

    // AUTH: Subscribe to changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUsers([]);
        setClasses([]);
        setAnnouncements([]);
        setMeets([]);
        setPolls([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchUserProfile(session.user.id);
    } else {
      setAuthLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        const appUser: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as Role,
          classId: profile.class_id,
          avatar: profile.avatar
        };
        setUser(appUser);
        // Once logged in, fetch data allowed by RLS
        await refreshAllData();
      }
    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const updateReminderSettings = (settings: ReminderSettings) => {
    setReminderSettings(settings);
    localStorage.setItem('sunuclasse_reminders', JSON.stringify(settings));
    addNotification("Préférences de rappel mises à jour", "SUCCESS");
  };

  // --- DATA FETCHING (SUPABASE) ---
  const refreshAllData = async () => {
    try {
      // 1. Settings & Config
      const { data: settingsData } = await supabase.from('app_settings').select('*');
      if (settingsData) {
        const name = settingsData.find(s => s.key === 'school_name')?.value;
        if (name) setSchoolNameState(name);
        
        const provider = settingsData.find(s => s.key === 'email_provider')?.value;
        const sender = settingsData.find(s => s.key === 'email_sender')?.value;
        if (provider) setEmailConfig(prev => ({ ...prev, provider: provider as any, senderEmail: sender }));
      }

      // 2. PARALLEL FETCHING
      // Note: RLS policies on Supabase will automatically filter this data based on the logged-in user.
      const [
        classesRes, 
        usersRes, 
        annRes, 
        meetRes, 
        examRes, 
        pollRes, 
        ttRes, 
        courseRes, 
        emailRes, 
        logsRes
      ] = await Promise.all([
        supabase.from('classes').select('*'),
        supabase.from('users').select('*'),
        supabase.from('announcements').select('*').order('date', { ascending: false }),
        supabase.from('meets').select('*').order('date', { ascending: true }),
        supabase.from('exams').select('*').order('date', { ascending: true }),
        supabase.from('polls').select('*').order('created_at', { ascending: false }),
        supabase.from('time_tables').select('*').order('date_added', { ascending: false }),
        supabase.from('courses').select('*'),
        supabase.from('sent_emails').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50)
      ]);

      if (classesRes.data) setClasses(classesRes.data);
      if (usersRes.data) {
        setUsers(usersRes.data.map((u: any) => ({ ...u, classId: u.class_id })));
      }
      if (annRes.data) {
        setAnnouncements(annRes.data.map((a: any) => ({
          ...a, classId: a.class_id, authorId: a.author_id, durationHours: a.duration_hours
        })));
      }
      if (meetRes.data) {
        setMeets(meetRes.data.map((m: any) => ({
          ...m, teacherName: m.teacher_name, classId: m.class_id, authorId: m.author_id
        })));
      }
      if (examRes.data) {
        setExams(examRes.data.map((e: any) => ({
          ...e, durationMinutes: e.duration_minutes, classId: e.class_id, authorId: e.author_id
        })));
      }
      if (pollRes.data) {
        setPolls(pollRes.data.map((p: any) => ({
          ...p, createdAt: p.created_at, isAnonymous: p.is_anonymous, classId: p.class_id, authorId: p.author_id, durationHours: p.duration_hours,
          options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options
        })));
      }
      if (ttRes.data) {
        setTimeTables(ttRes.data.map((t: any) => ({
          ...t, fileUrl: t.file_url, fileName: t.file_name, dateAdded: t.date_added, classId: t.class_id, authorId: t.author_id
        })));
      }
      if (courseRes.data) {
        setCourses(courseRes.data.map((c: any) => ({
          ...c, dayOfWeek: c.day_of_week, startTime: c.start_time, endTime: c.end_time, classId: c.class_id
        })));
      }
      if (emailRes.data) setSentEmails(emailRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data as AuditLog[]);

    } catch (err) {
      console.error("Erreur chargement Supabase:", err);
    }
  };

  // --- AUTH ---
  const login = async (email: string, password?: string, rememberMe?: boolean) => {
    if (!password) return false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("Auth Error from Supabase:", error.message);
        return false;
      }

      if (data.session) {
        logAction('LOGIN', 'Connexion réussie');
        return true;
      }
      return false;
    } catch (e) {
      console.error("Exception login:", e);
      return false;
    }
  };

  const logout = async () => {
    if (user) logAction('LOGOUT', 'Déconnexion');
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
    setClasses([]);
    setAnnouncements([]);
    setMeets([]);
    setPolls([]);
  };

  // --- SUPABASE STORAGE UPLOAD ---
  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading file:", error);
      addNotification(`Erreur upload: ${error.message}`, 'ERROR');
      return null;
    }
  };

  // ... Helper Functions ...
  const setSchoolName = async (name: string) => {
    setSchoolNameState(name);
    await supabase.from('app_settings').upsert({ key: 'school_name', value: name });
  };
  
  const updateEmailConfig = async (config: EmailConfig) => {
    setEmailConfig(config);
    await supabase.from('app_settings').upsert({ key: 'email_provider', value: config.provider });
    if (config.senderEmail) await supabase.from('app_settings').upsert({ key: 'email_sender', value: config.senderEmail });
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
    try {
      await supabase.from('audit_logs').insert([{
        action, details, author: user.name, role: user.role, severity
      }]);
    } catch (e) { }
  };

  // --- CRUD OPERATIONS (Security enforced by RLS on backend) ---

  const addAnnouncement = async (item: any) => {
    const { error } = await supabase.from('announcements').insert([{
      title: item.title,
      content: item.content,
      date: item.date || new Date().toISOString(),
      urgency: item.urgency,
      link: item.link,
      attachments: item.attachments,
      duration_hours: item.durationHours,
      author_id: user?.id,
      class_id: user?.classId
    }]);
    if (!error) { await refreshAllData(); addNotification('Annonce publiée', 'SUCCESS'); }
    else { addNotification(`Erreur: ${error.message}`, 'ERROR'); }
  };

  const updateAnnouncement = async (id: string, item: any) => {
    const payload: any = {};
    if (item.title !== undefined) payload.title = item.title;
    if (item.content !== undefined) payload.content = item.content;
    if (item.urgency !== undefined) payload.urgency = item.urgency;
    if (item.durationHours !== undefined) payload.duration_hours = item.durationHours;
    if (item.link !== undefined) payload.link = item.link;
    if (item.attachments !== undefined) payload.attachments = item.attachments;

    const { error } = await supabase.from('announcements').update(payload).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Mise à jour réussie', 'SUCCESS'); }
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Supprimé', 'INFO'); }
  };

  const addMeet = async (item: any) => {
    const { error } = await supabase.from('meets').insert([{
      subject: item.subject,
      link: item.link,
      date: item.date,
      teacher_name: item.teacherName,
      class_id: user?.classId,
      author_id: user?.id
    }]);
    if (!error) { 
        await refreshAllData(); 
        addNotification('Meet programmé', 'SUCCESS'); 
    } else {
        console.error(error);
        addNotification(`Erreur: ${error.message}`, 'ERROR');
    }
  };

  const updateMeet = async (id: string, item: any) => {
    const payload: any = {};
    if (item.subject) payload.subject = item.subject;
    if (item.link) payload.link = item.link;
    if (item.date) payload.date = item.date;
    if (item.teacherName) payload.teacher_name = item.teacherName;
    const { error } = await supabase.from('meets').update(payload).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Meet mis à jour', 'SUCCESS'); }
  };

  const deleteMeet = async (id: string) => {
    const { error } = await supabase.from('meets').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Meet supprimé', 'INFO'); }
  };

  const addExam = async (item: any) => {
    const { error } = await supabase.from('exams').insert([{
      subject: item.subject,
      date: item.date,
      duration_minutes: item.durationMinutes,
      room: item.room,
      notes: item.notes,
      author_id: user?.id,
      class_id: user?.classId
    }]);
    if (!error) { await refreshAllData(); addNotification('Examen ajouté', 'SUCCESS'); }
  };

  const updateExam = async (id: string, item: any) => {
    const { error } = await supabase.from('exams').update({
        subject: item.subject, date: item.date, duration_minutes: item.durationMinutes, room: item.room, notes: item.notes
    }).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Examen mis à jour', 'SUCCESS'); }
  };

  const deleteExam = async (id: string) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Examen supprimé', 'INFO'); }
  };

  const addPoll = async (item: any) => {
    const { error } = await supabase.from('polls').insert([{
      question: item.question,
      type: item.type || 'SINGLE',
      options: item.options, // Stored as JSONB
      active: true,
      is_anonymous: item.isAnonymous,
      duration_hours: item.durationHours,
      class_id: user?.classId,
      author_id: user?.id
    }]);
    if (!error) { 
        await refreshAllData(); 
        addNotification('Sondage créé', 'SUCCESS'); 
    } else {
        console.error(error);
        addNotification(`Erreur création sondage: ${error.message}`, 'ERROR');
    }
  };

  const updatePoll = async (id: string, item: any) => {
    const payload: any = {};
    if (item.active !== undefined) payload.active = item.active;
    if (item.options) payload.options = item.options;
    if (item.question) payload.question = item.question;
    const { error } = await supabase.from('polls').update(payload).eq('id', id);
    if (!error) {
        await refreshAllData();
    } else {
        addNotification(`Erreur update: ${error.message}`, 'ERROR');
    }
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    
    // Logic common for both modes
    const currentPolls = [...polls];
    const pollIndex = currentPolls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) return;
    
    const poll = currentPolls[pollIndex];
    const updatedOptions = poll.options.map(opt => ({
      ...opt,
      voterIds: opt.voterIds.filter(vid => vid !== user.id)
    })).map(opt => 
      opt.id === optionId ? { ...opt, voterIds: [...opt.voterIds, user.id] } : opt
    );

    const { error } = await supabase.from('polls').update({ options: updatedOptions }).eq('id', pollId);
    if (!error) { 
        await refreshAllData(); 
        addNotification('Vote enregistré', 'SUCCESS'); 
    } else {
        console.error("Erreur vote:", error);
        addNotification(`Erreur lors du vote: ${error.message || 'Erreur inconnue'}`, "ERROR");
    }
  };

  const deletePoll = async (id: string) => {
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Sondage supprimé', 'INFO'); }
  };

  const addTimeTable = async (item: any) => {
    const { error } = await supabase.from('time_tables').insert([{
      title: item.title, file_url: item.fileUrl, file_name: item.fileName, class_id: user?.classId, author_id: user?.id
    }]);
    if (!error) { await refreshAllData(); addNotification('Fichier ajouté', 'SUCCESS'); }
  };

  const deleteTimeTable = async (id: string) => {
    const { error } = await supabase.from('time_tables').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Fichier supprimé', 'INFO'); }
  };

  const addCourse = async (item: any) => {
    if (!user) return;
    const { error } = await supabase.from('courses').insert([{
      subject: item.subject, teacher: item.teacher, room: item.room, day_of_week: item.dayOfWeek,
      start_time: item.startTime, end_time: item.endTime, color: item.color, class_id: user.classId
    }]);
    if (!error) { await refreshAllData(); addNotification('Cours ajouté', 'SUCCESS'); }
  };

  const updateCourse = async (id: string, item: any) => {
    const { error } = await supabase.from('courses').update({
        subject: item.subject, teacher: item.teacher, room: item.room, day_of_week: item.dayOfWeek,
        start_time: item.startTime, end_time: item.endTime, color: item.color
    }).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Cours mis à jour', 'SUCCESS'); }
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Cours supprimé', 'INFO'); }
  };

  const shareResource = async (type: string, item: any) => {
    addNotification('Fonctionnalité Email disponible via SendGrid', 'INFO');
  };

  const resendEmail = (email: SentEmail) => {
    addNotification('Renvoi email...', 'INFO');
  };

  // ADMIN OPERATIONS
  const addClass = async (name: string, description: string, email: string) => {
    const { error } = await supabase.from('classes').insert([{ name, description, email }]);
    if (!error) { await refreshAllData(); addNotification('Classe créée', 'SUCCESS'); }
  };
  const updateClass = async (id: string, item: any) => {
    const { error } = await supabase.from('classes').update(item).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Classe mise à jour', 'SUCCESS'); }
  };
  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Classe supprimée', 'INFO'); }
  };
  
  const addUser = async (userData: any) => {
    addNotification("En production, utilisez l'invitation par email Supabase", "INFO");
  };
  
  const importUsers = async (usersData: any[]) => {
     addNotification("Importation simulée pour prototype", "INFO");
  };
  
  const updateUser = async (id: string, item: any) => {
    const { error } = await supabase.from('users').update({
        name: item.name, email: item.email, role: item.role, class_id: item.classId, avatar: item.avatar
    }).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Utilisateur mis à jour', 'SUCCESS'); }
  };
  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Utilisateur supprimé', 'INFO'); }
  };

  // --- RENDER ---
  if (authLoading) {
      return <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;
  }

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
    login, logout, getCurrentClass, uploadFile,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    addMeet, updateMeet, deleteMeet,
    addExam, updateExam, deleteExam,
    addPoll, updatePoll, votePoll, deletePoll,
    addTimeTable, deleteTimeTable,
    addCourse, updateCourse, deleteCourse,
    emailConfig, updateEmailConfig, shareResource, resendEmail,
    addClass, updateClass, deleteClass,
    addUser, importUsers, updateUser, deleteUser
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
