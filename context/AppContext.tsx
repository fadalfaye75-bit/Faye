
import React, { createContext, useContext, useState, PropsWithChildren, useEffect, useCallback, useRef } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, SentEmail, EmailConfig, AppContextType, TimeTable, Course, ReminderSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { differenceInMinutes, getDay } from 'date-fns';
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

  // --- INITIAL LOAD ---
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

    // Auth Persistence
    const storedUser = localStorage.getItem('sunuclasse_user') || sessionStorage.getItem('sunuclasse_user');
    
    // Always refresh data on load, whether logged in or not (for school name, etc.)
    refreshAllData();

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // We call refreshAllData again after setting user to ensure user-specific data is fresh if needed
        // but since our RLS policies are public for this app, the first call is enough.
        console.log("Session restaurée pour :", parsedUser.name);
      } catch (e) {
        console.error("Session invalide");
        localStorage.removeItem('sunuclasse_user');
      }
    }
  }, []);

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

      // 2. Core Entities
      const { data: classesData } = await supabase.from('classes').select('*');
      if (classesData) setClasses(classesData);

      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        // Map database column snake_case to app camelCase
        setUsers(usersData.map((u: any) => ({ ...u, classId: u.class_id })));
      }

      // 3. Content
      const { data: annData } = await supabase.from('announcements').select('*').order('date', { ascending: false });
      if (annData) {
        setAnnouncements(annData.map((a: any) => ({
          ...a,
          classId: a.class_id,
          authorId: a.author_id,
          durationHours: a.duration_hours
        })));
      }

      const { data: meetData } = await supabase.from('meets').select('*').order('date', { ascending: true });
      if (meetData) {
        setMeets(meetData.map((m: any) => ({
          ...m,
          teacherName: m.teacher_name,
          classId: m.class_id,
          authorId: m.author_id
        })));
      }

      const { data: examData } = await supabase.from('exams').select('*').order('date', { ascending: true });
      if (examData) {
        setExams(examData.map((e: any) => ({
          ...e,
          durationMinutes: e.duration_minutes,
          classId: e.class_id,
          authorId: e.author_id
        })));
      }

      const { data: pollData } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      if (pollData) {
        setPolls(pollData.map((p: any) => ({
          ...p,
          createdAt: p.created_at,
          isAnonymous: p.is_anonymous,
          classId: p.class_id,
          authorId: p.author_id,
          durationHours: p.duration_hours,
          // Supabase returns JSON columns as objects automatically, but verify just in case
          options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options
        })));
      }

      const { data: ttData } = await supabase.from('time_tables').select('*').order('date_added', { ascending: false });
      if (ttData) {
        setTimeTables(ttData.map((t: any) => ({
          ...t,
          fileUrl: t.file_url,
          fileName: t.file_name,
          dateAdded: t.date_added,
          classId: t.class_id,
          authorId: t.author_id
        })));
      }

      const { data: courseData } = await supabase.from('courses').select('*');
      if (courseData) {
        setCourses(courseData.map((c: any) => ({
          ...c,
          dayOfWeek: c.day_of_week,
          startTime: c.start_time,
          endTime: c.end_time,
          classId: c.class_id
        })));
      }
      
      const { data: emailData } = await supabase.from('sent_emails').select('*').order('created_at', { ascending: false });
      if (emailData) setSentEmails(emailData);

      const { data: logsData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      if (logsData) setAuditLogs(logsData as AuditLog[]);

    } catch (err) {
      console.error("Erreur chargement Supabase:", err);
      // Fail silently for user, but log for dev
    }
  };

  // --- AUTH ---
  const login = async (email: string, password?: string, rememberMe?: boolean) => {
    try {
      // Fetch user from custom 'users' table
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
          console.error("Login DB Error:", error.message || JSON.stringify(error));
          return false;
      }

      if (!dbUser) {
          console.warn(`Tentative de connexion échouée pour l'email: ${email}`);
          return false;
      }

      // Password Check (Simulation for this prototype)
      if (password) {
          if (dbUser.role === 'ADMIN') {
              if (password !== 'passer25') return false;
          } else {
              if (password.length < 4) return false;
          }
      } else {
          return false;
      }

      const appUser: User = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as Role,
        classId: dbUser.class_id,
        avatar: dbUser.avatar
      };

      setUser(appUser);
      
      if (rememberMe) {
        localStorage.setItem('sunuclasse_user', JSON.stringify(appUser));
      } else {
        sessionStorage.setItem('sunuclasse_user', JSON.stringify(appUser));
      }

      logAction('LOGIN', 'Connexion réussie');
      refreshAllData(); 
      return true;
    } catch (e) {
      console.error("Exception login:", e);
      return false;
    }
  };

  const logout = () => {
    if (user) logAction('LOGOUT', 'Déconnexion');
    setUser(null);
    localStorage.removeItem('sunuclasse_user');
    sessionStorage.removeItem('sunuclasse_user');
    // We can clear data if we want security, but for UX we might keep public data
    // setAnnouncements([]); 
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
    } catch (e) { console.error("Log error", e); }
  };

  // --- CRUD OPERATIONS ---

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
    if (!error) { 
      await refreshAllData(); 
      addNotification('Annonce publiée', 'SUCCESS'); 
    } else { 
      console.error('Add Announcement Error:', error);
      addNotification(`Erreur lors de la publication: ${error.message}`, 'ERROR'); 
    }
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
    if (!error) { 
        await refreshAllData(); 
        addNotification('Annonce mise à jour', 'SUCCESS'); 
    } else {
        console.error('Update Announcement Error:', error);
        addNotification(`Erreur mise à jour: ${error.message}`, 'ERROR');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    // Suppression locale immédiate (Optimistic UI)
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) { 
        await refreshAllData(); 
        addNotification('Annonce supprimée', 'INFO'); 
    } else {
        // En cas d'erreur, on rafraîchit pour remettre l'élément
        await refreshAllData();
        addNotification(`Erreur lors de la suppression: ${error.message}`, "ERROR");
    }
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
    if (!error) { await refreshAllData(); addNotification('Meet programmé', 'SUCCESS'); }
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
    const payload: any = {};
    if (item.subject) payload.subject = item.subject;
    if (item.date) payload.date = item.date;
    if (item.durationMinutes) payload.duration_minutes = item.durationMinutes;
    if (item.room) payload.room = item.room;
    if (item.notes !== undefined) payload.notes = item.notes;
    const { error } = await supabase.from('exams').update(payload).eq('id', id);
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
      options: item.options,
      active: true,
      is_anonymous: item.isAnonymous,
      duration_hours: item.durationHours,
      class_id: user?.classId,
      author_id: user?.id
    }]);
    if (!error) { await refreshAllData(); addNotification('Sondage créé', 'SUCCESS'); }
  };

  const updatePoll = async (id: string, item: any) => {
    const payload: any = {};
    if (item.active !== undefined) payload.active = item.active;
    if (item.options) payload.options = item.options;
    if (item.question) payload.question = item.question;
    if (item.isAnonymous !== undefined) payload.is_anonymous = item.isAnonymous;
    if (item.durationHours !== undefined) payload.duration_hours = item.durationHours;

    const { error } = await supabase.from('polls').update(payload).eq('id', id);
    if (!error) await refreshAllData();
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    // Supabase needs the full object to update JSON column
    const cleanedOptions = poll.options.map(opt => ({
      ...opt,
      voterIds: opt.voterIds.filter(vid => vid !== user.id)
    }));

    const updatedOptions = cleanedOptions.map(opt => 
      opt.id === optionId ? { ...opt, voterIds: [...opt.voterIds, user.id] } : opt
    );

    const { error } = await supabase.from('polls').update({ options: updatedOptions }).eq('id', pollId);
    if (!error) { await refreshAllData(); addNotification('Vote enregistré', 'SUCCESS'); }
  };

  const deletePoll = async (id: string) => {
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Sondage supprimé', 'INFO'); }
  };

  const addTimeTable = async (item: any) => {
    const { error } = await supabase.from('time_tables').insert([{
      title: item.title,
      file_url: item.fileUrl,
      file_name: item.fileName,
      class_id: user?.classId,
      author_id: user?.id
    }]);
    if (!error) { await refreshAllData(); addNotification('Emploi du temps ajouté', 'SUCCESS'); }
    else { addNotification("Erreur d'envoi (fichier trop volumineux ?)", 'ERROR'); }
  };

  const deleteTimeTable = async (id: string) => {
    const { error } = await supabase.from('time_tables').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Fichier supprimé', 'INFO'); }
  };

  const addCourse = async (item: any) => {
    if (!user) return;
    
    // Payload explicitly defined
    const payload = {
      subject: item.subject,
      teacher: item.teacher,
      room: item.room,
      day_of_week: item.dayOfWeek,
      start_time: item.startTime,
      end_time: item.endTime,
      color: item.color,
      class_id: user.classId || null // Ensure null is sent if undefined
    };

    const { error } = await supabase.from('courses').insert([payload]);
    
    if (!error) { 
        await refreshAllData(); 
        addNotification('Cours ajouté au planning', 'SUCCESS'); 
    } else {
        console.error("Erreur ajout cours:", error);
        
        let errorMsg = "Erreur inconnue";
        if (typeof error === 'string') {
            errorMsg = error;
        } else if (error && typeof error === 'object') {
            if ('message' in error && typeof (error as any).message === 'string') {
                errorMsg = (error as any).message;
            } else if ('hint' in error && typeof (error as any).hint === 'string') {
                 errorMsg = (error as any).hint;
            } else {
                 try {
                     errorMsg = JSON.stringify(error);
                 } catch {
                     errorMsg = "Erreur (détails non affichables)";
                 }
            }
        }
        
        addNotification(`Erreur lors de l'ajout: ${errorMsg}`, 'ERROR');
    }
  };

  const updateCourse = async (id: string, item: any) => {
    const payload: any = {};
    if (item.subject) payload.subject = item.subject;
    if (item.teacher) payload.teacher = item.teacher;
    if (item.room) payload.room = item.room;
    if (item.dayOfWeek) payload.day_of_week = item.dayOfWeek;
    if (item.startTime) payload.start_time = item.startTime;
    if (item.endTime) payload.end_time = item.endTime;
    if (item.color) payload.color = item.color;

    const { error } = await supabase.from('courses').update(payload).eq('id', id);
    if (!error) { 
        await refreshAllData(); 
        addNotification('Cours mis à jour', 'SUCCESS'); 
    } else {
        console.error("Erreur update cours:", error);
        addNotification(`Erreur mise à jour: ${error.message}`, 'ERROR');
    }
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

  // ADMIN
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
    const { error } = await supabase.from('users').insert([{
      name: userData.name, email: userData.email, role: userData.role, class_id: userData.classId
    }]);
    if (!error) { await refreshAllData(); addNotification('Utilisateur ajouté', 'SUCCESS'); }
  };
  const importUsers = async (usersData: any[]) => {
    const dbUsers = usersData.map(u => ({ name: u.name, email: u.email, role: u.role, class_id: u.classId }));
    const { error } = await supabase.from('users').insert(dbUsers);
    if (!error) { await refreshAllData(); addNotification('Utilisateurs importés', 'SUCCESS'); }
  };
  const updateUser = async (id: string, item: any) => {
    const payload: any = {};
    if (item.name) payload.name = item.name;
    if (item.email) payload.email = item.email;
    if (item.role) payload.role = item.role;
    if (item.classId !== undefined) payload.class_id = item.classId || null;
    if (item.avatar) payload.avatar = item.avatar;
    const { error } = await supabase.from('users').update(payload).eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Utilisateur mis à jour', 'SUCCESS'); }
  };
  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) { await refreshAllData(); addNotification('Utilisateur supprimé', 'INFO'); }
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
