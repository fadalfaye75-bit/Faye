
import React, { createContext, useContext, useState, PropsWithChildren, useMemo, useEffect, useCallback, useRef } from 'react';
import { User, Announcement, Exam, Poll, Role, MeetSession, ClassGroup, AuditLog, Notification, PollOption, SentEmail, EmailConfig, AppContextType, TimeTable, Course, ReminderSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { format, differenceInMinutes, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { INITIAL_CLASSES, INITIAL_USERS } from '../constants';
import { sendEmail } from '../services/emailService';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Temps d'inactivité avant déconnexion automatique (15 minutes)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; 

// Initial Settings
const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: true,
  courseDelay: 15, // 15 min avant
  examDelay: 60 * 24, // 24h avant
  meetDelay: 30 // 30 min avant
};

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  
  // Data State (Initialisé vide, rempli par Supabase)
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [classes, setClasses] = useState<ClassGroup[]>(INITIAL_CLASSES);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meets, setMeets] = useState<MeetSession[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Defaulting to "Class Connect"
  const [schoolName, setSchoolNameState] = useState('Class Connect');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'MAILTO', // Default to client side for safety
    senderName: 'SunuClasse'
  });

  // Reminder Settings
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // UX / Logs
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  
  // Deep Linking
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Auto-Logout State
  const [lastActivity, setLastActivity] = useState(Date.now());

  // --- Helpers ---
  const getCurrentClass = () => classes.find(c => c.id === user?.classId);

  // --- INITIAL LOAD (Theme & Local Settings Only) ---
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else if (systemPrefersDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    // Session Persistence
    const storedUser = localStorage.getItem('sunuclasse_user') || sessionStorage.getItem('sunuclasse_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Session invalide");
      }
    }

    // Load Reminder Settings (Local Preference)
    const storedReminders = localStorage.getItem('sunuclasse_reminders');
    if (storedReminders) {
      try {
        setReminderSettings(JSON.parse(storedReminders));
      } catch (e) {}
    }
  }, []);

  // Persist Reminders
  const updateReminderSettings = (settings: ReminderSettings) => {
    setReminderSettings(settings);
    localStorage.setItem('sunuclasse_reminders', JSON.stringify(settings));
    addNotification("Préférences de rappel mises à jour", "SUCCESS");
  };

  // --- REMINDER SCHEDULER (Runs every minute) ---
  useEffect(() => {
    if (!user || !reminderSettings.enabled) return;

    const checkReminders = () => {
      const now = new Date();
      const currentDay = getDay(now); // 0=Sun, 1=Mon...
      
      // 1. Check Courses (Weekly)
      const myCourses = user.role === Role.ADMIN ? courses : courses.filter(c => c.classId === user.classId);
      myCourses.forEach(course => {
        if (course.dayOfWeek === currentDay) {
          const [h, m] = course.startTime.split(':').map(Number);
          const courseTime = new Date(now);
          courseTime.setHours(h, m, 0, 0);
          
          const diff = differenceInMinutes(courseTime, now);
          const notifKey = `course-${course.id}-${now.getDate()}`; // Unique per day

          if (diff > 0 && diff <= reminderSettings.courseDelay && !notifiedEventsRef.current.has(notifKey)) {
            addNotification(`Rappel: Cours de ${course.subject} dans ${diff} min (${course.room})`, "INFO", "timetable");
            notifiedEventsRef.current.add(notifKey);
          }
        }
      });

      // 2. Check Exams (One-off)
      const myExams = user.role === Role.ADMIN ? exams : exams.filter(e => e.classId === user.classId);
      myExams.forEach(exam => {
        const examTime = new Date(exam.date);
        const diff = differenceInMinutes(examTime, now);
        const notifKey = `exam-${exam.id}`;

        if (diff > 0 && diff <= reminderSettings.examDelay && !notifiedEventsRef.current.has(notifKey)) {
          const timeText = diff > 60 ? `${Math.round(diff/60)}h` : `${diff} min`;
          addNotification(`Rappel Examen: ${exam.subject} dans ${timeText}`, "WARNING", "ds");
          notifiedEventsRef.current.add(notifKey);
        }
      });

      // 3. Check Meets (One-off)
      const myMeets = user.role === Role.ADMIN ? meets : meets.filter(m => m.classId === user.classId);
      myMeets.forEach(meet => {
        const meetTime = new Date(meet.date);
        const diff = differenceInMinutes(meetTime, now);
        const notifKey = `meet-${meet.id}`;

        if (diff > 0 && diff <= reminderSettings.meetDelay && !notifiedEventsRef.current.has(notifKey)) {
          addNotification(`Rappel Visio: ${meet.subject} démarre dans ${diff} min`, "INFO", "meet");
          notifiedEventsRef.current.add(notifKey);
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [user, courses, exams, meets, reminderSettings]);


  // 2. Activity Listener for Auto-Logout
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listeners
    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('click', resetActivity);
    window.addEventListener('scroll', resetActivity);
    window.addEventListener('touchstart', resetActivity);

    // Timer Check
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
        setTimeout(() => {
             sessionStorage.setItem('logout_reason', 'inactivity');
        }, 100);
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('click', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      clearInterval(interval);
    };
  }, [user, lastActivity, resetActivity]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const addNotification = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', targetPage?: string, resourceId?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notif: Notification = { id, message, type, timestamp: new Date().toISOString(), read: false, targetPage, resourceId };
    
    setNotifications(prev => [...prev, notif]);
    setNotificationHistory(prev => [notif, ...prev]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markNotificationAsRead = (id: string) => {
    setNotificationHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotificationHistory(prev => prev.filter(n => n.id !== id));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  const logAction = async (action: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    if (!user) return;
    const log: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      details,
      author: user.name,
      role: user.role,
      timestamp: new Date().toISOString(),
      severity
    };
    setAuditLogs(prev => [log, ...prev]);
    
    try {
      await supabase.from('audit_logs').insert([{
        action: log.action,
        details: log.details,
        author: log.author,
        role: log.role,
        severity: log.severity,
        timestamp: log.timestamp
      }]);
    } catch (e) { console.error("Log error", e); }
  };

  // --- Fetch Data from SUPABASE ---
  const refreshAllData = async () => {
    try {
      // 1. Settings
      const { data: settingsData } = await supabase.from('app_settings').select('*');
      if (settingsData) {
        const schoolNameSetting = settingsData.find(s => s.key === 'school_name');
        if (schoolNameSetting) setSchoolNameState(schoolNameSetting.value);
        
        const emailProvider = settingsData.find(s => s.key === 'email_provider')?.value;
        const emailSender = settingsData.find(s => s.key === 'email_sender')?.value;
        if (emailProvider) {
            setEmailConfig(prev => ({ ...prev, provider: emailProvider as any, senderEmail: emailSender }));
        }
      }

      // 2. Core Entities
      const { data: classesData } = await supabase.from('classes').select('*');
      if (classesData) setClasses(classesData);

      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        setUsers(usersData.map((u: any) => ({ ...u, classId: u.class_id })));
      }

      // 3. Content Data (Mapping snake_case to camelCase)
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
          options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options // Handle JSONB
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
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [user]); // Refresh when user changes/logs in

  // --- Auth ---
  const login = async (email: string, password?: string, rememberMe?: boolean) => {
    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      let matchedUser = dbUser;

      if (!matchedUser) {
        return false;
      }

      if (password) {
          if (matchedUser.role === Role.ADMIN) {
              if (password !== 'passer25') return false;
          } else {
              if (password.length < 4) return false;
          }
      } else {
          return false;
      }

      const appUser: User = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role as Role,
        classId: matchedUser.class_id || matchedUser.classId,
        avatar: matchedUser.avatar
      };

      setUser(appUser);
      setLastActivity(Date.now());
      
      if (rememberMe) {
        localStorage.setItem('sunuclasse_user', JSON.stringify(appUser));
      } else {
        sessionStorage.setItem('sunuclasse_user', JSON.stringify(appUser));
      }

      logAction('LOGIN', 'Connexion réussie');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    if (user) logAction('LOGOUT', 'Déconnexion');
    setUser(null);
    localStorage.removeItem('sunuclasse_user');
    sessionStorage.removeItem('sunuclasse_user');
  };

  const setSchoolName = async (name: string) => {
    setSchoolNameState(name);
    await supabase.from('app_settings').upsert({ key: 'school_name', value: name });
    logAction('CONFIG', `Changement nom école: ${name}`, 'WARNING');
  };
  
  const updateEmailConfig = async (config: EmailConfig) => {
    setEmailConfig(config);
    await supabase.from('app_settings').upsert({ key: 'email_provider', value: config.provider });
    if (config.senderEmail) {
        await supabase.from('app_settings').upsert({ key: 'email_sender', value: config.senderEmail });
    }
    logAction('CONFIG', `Mise à jour config email: ${config.provider}`, 'WARNING');
  };

  // --- Content Management Wrappers (DB Persistence) ---

  // ANNOUNCEMENTS
  const addAnnouncement = async (item: any, targetRoles?: Role[]) => {
    const id = Math.random().toString(36).substr(2, 9); // Generate ID locally or rely on DB return
    const dbPayload = {
      id,
      title: item.title,
      content: item.content,
      date: item.date || new Date().toISOString(),
      urgency: item.urgency,
      link: item.link,
      attachments: item.attachments, // Assumes DB has JSONB column
      duration_hours: item.durationHours,
      author_id: user?.id,
      class_id: user?.classId
    };

    const { error } = await supabase.from('announcements').insert([dbPayload]);
    if (!error) {
        refreshAllData();
        addNotification('Annonce publiée avec succès', 'SUCCESS', 'infos', id);
        logAction('PUBLICATION', `Annonce: ${item.title}`);
    } else {
        console.error(error);
        addNotification('Erreur sauvegarde annonce', 'ERROR');
    }
  };

  const updateAnnouncement = async (id: string, item: any) => {
    const existing = announcements.find(a => a.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const dbPayload: any = {};
    if (item.title) dbPayload.title = item.title;
    if (item.content) dbPayload.content = item.content;
    if (item.urgency) dbPayload.urgency = item.urgency;
    if (item.durationHours !== undefined) dbPayload.duration_hours = item.durationHours;
    if (item.link !== undefined) dbPayload.link = item.link;
    if (item.attachments) dbPayload.attachments = item.attachments;

    const { error } = await supabase.from('announcements').update(dbPayload).eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Annonce mise à jour', 'SUCCESS', 'infos', id);
        logAction('MODIFICATION', `Annonce ID: ${id}`);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const existing = announcements.find(a => a.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Annonce supprimée', 'INFO');
        logAction('SUPPRESSION', `Annonce ID: ${id}`, 'WARNING');
    }
  };

  // MEETS
  const addMeet = async (item: any, targetRoles?: Role[]) => {
    const id = Math.random().toString(36).substr(2, 9);
    const dbPayload = {
      id,
      subject: item.subject,
      link: item.link,
      date: item.date,
      teacher_name: item.teacherName,
      class_id: user?.classId,
      author_id: user?.id
    };

    const { error } = await supabase.from('meets').insert([dbPayload]);
    if (!error) {
        refreshAllData();
        addNotification('Session Meet programmée', 'SUCCESS', 'meet', id);
        logAction('CREATION', `Meet: ${item.subject}`);
    }
  };

  const updateMeet = async (id: string, item: any) => {
    const existing = meets.find(m => m.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const dbPayload: any = {};
    if (item.subject) dbPayload.subject = item.subject;
    if (item.link) dbPayload.link = item.link;
    if (item.date) dbPayload.date = item.date;
    if (item.teacherName) dbPayload.teacher_name = item.teacherName;

    const { error } = await supabase.from('meets').update(dbPayload).eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Session Meet mise à jour', 'SUCCESS', 'meet', id);
    }
  };

  const deleteMeet = async (id: string) => {
    const existing = meets.find(m => m.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const { error } = await supabase.from('meets').delete().eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Session Meet supprimée', 'INFO');
        logAction('SUPPRESSION', `Meet ID: ${id}`, 'WARNING');
    }
  };

  // EXAMS
  const addExam = async (item: any, targetRoles?: Role[]) => {
    const id = Math.random().toString(36).substr(2, 9);
    const dbPayload = {
      id,
      subject: item.subject,
      date: item.date,
      duration_minutes: item.durationMinutes,
      room: item.room,
      notes: item.notes,
      author_id: user?.id,
      class_id: user?.classId
    };

    const { error } = await supabase.from('exams').insert([dbPayload]);
    if (!error) {
        refreshAllData();
        addNotification('Examen planifié', 'SUCCESS', 'ds', id);
        logAction('CREATION', `Examen: ${item.subject}`);
    }
  };

  const updateExam = async (id: string, item: any) => {
    const existing = exams.find(e => e.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const dbPayload: any = {};
    if (item.subject) dbPayload.subject = item.subject;
    if (item.date) dbPayload.date = item.date;
    if (item.durationMinutes) dbPayload.duration_minutes = item.durationMinutes;
    if (item.room) dbPayload.room = item.room;
    if (item.notes !== undefined) dbPayload.notes = item.notes;

    const { error } = await supabase.from('exams').update(dbPayload).eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Examen mis à jour', 'SUCCESS', 'ds', id);
    }
  };

  const deleteExam = async (id: string) => {
    const existing = exams.find(e => e.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Examen supprimé', 'INFO');
        logAction('SUPPRESSION', `Examen ID: ${id}`, 'WARNING');
    }
  };

  // POLLS
  const addPoll = async (item: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    const dbPayload = { 
      id,
      question: item.question,
      type: item.type || 'SINGLE',
      options: item.options, // JSONB
      active: true,
      created_at: new Date().toISOString(), 
      is_anonymous: item.isAnonymous,
      duration_hours: item.durationHours,
      class_id: user?.classId,
      author_id: user?.id 
    };

    const { error } = await supabase.from('polls').insert([dbPayload]);
    if (!error) {
        refreshAllData();
        addNotification('Sondage publié', 'SUCCESS', 'polls', id);
        logAction('CREATION', `Sondage: ${item.question}`);
    }
  };

  const updatePoll = async (id: string, item: any) => {
    const existing = polls.find(p => p.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const dbPayload: any = {};
    if (item.active !== undefined) dbPayload.active = item.active;
    if (item.options) dbPayload.options = item.options; // JSONB
    
    // Note: If options logic is complex (adding/removing), managing JSON array in DB is tricky with just update.
    // For now, replacing the whole array works.

    const { error } = await supabase.from('polls').update(dbPayload).eq('id', id);
    if (!error) refreshAllData();
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return;
    
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    // Logic to update local state logic reflected for DB:
    const cleanedOptions = poll.options.map(opt => ({
      ...opt,
      voterIds: opt.voterIds.filter(vid => vid !== user.id)
    }));

    const updatedOptions = cleanedOptions.map(opt => 
      opt.id === optionId ? { ...opt, voterIds: [...opt.voterIds, user.id] } : opt
    );

    // Update DB (replacing the JSON)
    const { error } = await supabase.from('polls').update({ options: updatedOptions }).eq('id', pollId);
    if (!error) {
        refreshAllData();
        addNotification('Vote enregistré', 'SUCCESS');
    } else {
        addNotification('Erreur lors du vote', 'ERROR');
    }
  };

  const deletePoll = async (id: string) => {
    const existing = polls.find(p => p.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Sondage supprimé', 'INFO');
    }
  };

  // --- TIME TABLES (Fichiers) ---
  const addTimeTable = async (item: Omit<TimeTable, 'id' | 'authorId' | 'classId' | 'dateAdded'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const dbPayload = { 
      id,
      title: item.title,
      file_url: item.fileUrl,
      file_name: item.fileName,
      date_added: new Date().toISOString(), 
      class_id: user?.classId || '',
      author_id: user?.id || '' 
    };

    const { error } = await supabase.from('time_tables').insert([dbPayload]);
    if (!error) {
        refreshAllData();
        addNotification('Emploi du temps ajouté', 'SUCCESS', 'timetable', id);
        logAction('CREATION', `Emploi du temps: ${item.title}`);
    } else {
        addNotification("Erreur d'ajout (Fichier peut-être trop lourd)", 'ERROR');
    }
  };

  const deleteTimeTable = async (id: string) => {
    const existing = timeTables.find(t => t.id === id);
    if (!existing) return;
    if (existing.authorId !== user?.id && user?.role !== Role.ADMIN) {
       addNotification("Action non autorisée", "ERROR");
       return;
    }

    const { error } = await supabase.from('time_tables').delete().eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Emploi du temps supprimé', 'INFO');
        logAction('SUPPRESSION', `Emploi du temps ID: ${id}`, 'WARNING');
    }
  };

  // --- COURSES (Calendrier Interactif) ---
  const addCourse = async (item: Omit<Course, 'id' | 'classId'>) => {
    if (!user) return;
    const id = Math.random().toString(36).substr(2, 9);
    const dbPayload = {
      id,
      subject: item.subject,
      teacher: item.teacher,
      room: item.room,
      day_of_week: item.dayOfWeek,
      start_time: item.startTime,
      end_time: item.endTime,
      color: item.color,
      class_id: user.classId || 'default'
    };

    const { error } = await supabase.from('courses').insert([dbPayload]);
    if (!error) {
        refreshAllData();
        addNotification('Cours ajouté au calendrier', 'SUCCESS');
        logAction('CALENDRIER', `Ajout cours: ${item.subject}`);
    }
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) {
        refreshAllData();
        addNotification('Cours retiré du calendrier', 'INFO');
    }
  };

  // --- SHARE FUNCTION (EMAIL with SendGrid Support) ---
  const shareResource = async (type: 'ANNOUNCEMENT' | 'MEET' | 'EXAM' | 'POLL', item: any) => {
    if (!user) return;

    const currentClass = getCurrentClass();
    
    let targetEmails = currentClass?.email;
    let recipientLabel = currentClass?.email ? `Mailing List (${currentClass.email})` : 'Membres de la classe';

    if (!targetEmails) {
       const students = users.filter(u => u.classId === user.classId && u.role === Role.STUDENT);
       const emails = students.map(u => u.email).filter(e => e && e.includes('@')); // Basic validation
       if (emails.length > 0) {
         targetEmails = emails.join(',');
         recipientLabel = `${emails.length} Étudiants`;
       }
    }

    if (!targetEmails) {
        addNotification("Aucun email destinataire trouvé pour cette classe.", "WARNING");
        return;
    }
    
    let subject = '';
    let body = '';
    const footer = `\r\n\r\n--\r\nEnvoyé depuis ${schoolName} - Portail Numérique`;
    
    switch (type) {
      case 'ANNOUNCEMENT':
        subject = `[${schoolName}] Annonce : ${item.title}`;
        body = `Bonjour,\r\n\r\nUne nouvelle annonce a été publiée :\r\n\r\n"${item.content}"\r\n\r\nConnectez-vous pour plus de détails.${footer}`;
        break;
      case 'MEET':
        subject = `[${schoolName}] Nouveau cours vidéo : ${item.subject}`;
        body = `Bonjour,\r\n\r\nUn cours de ${item.subject} avec ${item.teacherName} est programmé.\r\n\r\n📅 Date : ${format(new Date(item.date), 'dd/MM à HH:mm')}\r\n🔗 Lien : ${item.link}\r\n\r\nSoyez à l'heure !${footer}`;
        break;
      case 'EXAM':
        subject = `[${schoolName}] Examen programmé : ${item.subject}`;
        body = `Bonjour,\r\n\r\nUn examen de ${item.subject} aura lieu prochainement.\r\n\r\n📅 Date : ${format(new Date(item.date), 'dd/MM à HH:mm')}\r\n📍 Salle : ${item.room}\r\n⏱️ Durée : ${item.durationMinutes} min\r\n\r\nNotes : ${item.notes || 'Aucune'}${footer}`;
        break;
      case 'POLL':
        subject = `[${schoolName}] Sondage : Votre avis compte`;
        body = `Bonjour,\r\n\r\nUn nouveau sondage nécessite votre attention :\r\n\r\n"${item.question}"\r\n\r\nConnectez-vous à la plateforme pour voter.${footer}`;
        break;
    }

    const bodyForDisplay = body.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');

    const { error } = await supabase.from('sent_emails').insert([{
      recipient_email: targetEmails || 'Non spécifié', 
      subject,
      body_html: bodyForDisplay, 
      resource_type: type,
      sender_name: user.name,
      class_id: user.classId
    }]);

    if (error) {
      console.error("Erreur enregistrement email:", error);
    } else {
      refreshAllData(); // Reload emails to get the new ID
    }

    logAction('PARTAGE', `Email initié (${type}) via ${emailConfig.provider}`);

    if (emailConfig.provider === 'SENDGRID') {
        addNotification(`Envoi via SendGrid en cours vers ${recipientLabel}...`, 'INFO');
    } else {
        addNotification(`Ouverture du client mail pour : ${recipientLabel}`, 'SUCCESS');
    }

    const result = await sendEmail(emailConfig, targetEmails, subject, bodyForDisplay);

    if (result.success) {
        if (emailConfig.provider === 'SENDGRID') {
            addNotification("Email envoyé avec succès via SendGrid !", "SUCCESS");
        }
    } else {
        addNotification(`Erreur d'envoi : ${result.error}`, "ERROR");
        if (emailConfig.provider === 'SENDGRID') {
            addNotification("Basculement automatique vers le client mail.", "INFO");
            // Fallback
            sendEmail({ ...emailConfig, provider: 'MAILTO' }, targetEmails, subject, bodyForDisplay);
        }
    }
  };

  // --- RESEND FEATURE ---
  const resendEmail = async (email: SentEmail) => {
    const recipientLabel = email.recipient_email;
    
    if (emailConfig.provider === 'SENDGRID') {
        addNotification(`Renvoi via SendGrid vers ${recipientLabel}...`, 'INFO');
    } else {
        addNotification('Client mail ré-ouvert', 'INFO');
    }
    
    const result = await sendEmail(emailConfig, email.recipient_email, email.subject, email.body_html);
    
    if (result.success) {
        if (emailConfig.provider === 'SENDGRID') {
            addNotification("Email renvoyé avec succès via SendGrid !", "SUCCESS");
        }
    } else {
        addNotification(`Erreur renvoi : ${result.error}`, "ERROR");
    }
    
    logAction('PARTAGE', `Renvoi email ID: ${email.id} via ${emailConfig.provider}`, 'WARNING');
  };

  // --- ADMIN ACTIONS (Supabase) ---
  const addClass = async (name: string, description: string, email: string) => {
    if (user?.role !== Role.ADMIN) {
        addNotification("Action réservée à l'administrateur", "ERROR");
        return;
    }

    const { error } = await supabase.from('classes').insert([{ 
      name, 
      description,
      email: email && email.trim() !== '' ? email : null 
    }]);

    if (error) {
       addNotification(`Erreur création: ${error.message}`, 'ERROR');
    } else {
       addNotification('Classe créée avec succès', 'SUCCESS');
       refreshAllData();
    }
  };

  const updateClass = async (id: string, item: Partial<ClassGroup>) => {
    if (user?.role !== Role.ADMIN) {
        addNotification("Action réservée à l'administrateur", "ERROR");
        return;
    }
    const payload: any = {};
    if (item.name !== undefined) payload.name = item.name;
    if (item.description !== undefined) payload.description = item.description;
    if (item.email !== undefined) {
      payload.email = item.email && item.email.trim() !== '' ? item.email : null;
    }

    const { error } = await supabase.from('classes').update(payload).eq('id', id);

    if (error) {
       console.error("Update Error:", error);
       addNotification(`Erreur mise à jour: ${error.message}`, 'ERROR');
    } else {
       addNotification('Classe mise à jour', 'SUCCESS');
       refreshAllData();
    }
  };

  const deleteClass = async (id: string) => {
    if (user?.role !== Role.ADMIN) {
        addNotification("Action réservée à l'administrateur", "ERROR");
        return;
    }
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
       addNotification('Classe supprimée', 'INFO');
       refreshAllData();
    } else {
       addNotification('Erreur lors de la suppression', 'ERROR');
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    const { error } = await supabase.from('users').insert([{
      name: userData.name,
      email: userData.email,
      role: userData.role,
      class_id: userData.classId && userData.classId !== '' ? userData.classId : null
    }]);

    if (error) {
       addNotification(`Erreur: ${error.message}`, 'ERROR');
    } else {
       addNotification('Utilisateur ajouté', 'SUCCESS');
       refreshAllData();
    }
  };

  const importUsers = async (usersData: Omit<User, 'id'>[]) => {
    const dbUsers = usersData.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      class_id: u.classId
    }));

    const { error } = await supabase.from('users').insert(dbUsers);
    
    if (error) {
      addNotification('Erreur importation CSV', 'ERROR');
    } else {
      addNotification(`${usersData.length} utilisateurs importés`, 'SUCCESS');
      refreshAllData();
    }
  };

  const updateUser = async (id: string, item: Partial<User>) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser && user?.role === Role.RESPONSIBLE) {
        if (targetUser.role === Role.ADMIN || targetUser.role === Role.RESPONSIBLE) {
            addNotification("Action non autorisée sur ce rôle", "ERROR");
            return;
        }
        if (targetUser.classId !== user.classId) {
            addNotification("Utilisateur hors de votre classe", "ERROR");
            return;
        }
    }

    const payload: any = {};
    if (item.name) payload.name = item.name;
    if (item.email) payload.email = item.email;
    if (item.role) payload.role = item.role;
    if (item.classId !== undefined) payload.class_id = item.classId === '' ? null : item.classId;
    if (item.avatar) payload.avatar = item.avatar;

    const { error } = await supabase.from('users').update(payload).eq('id', id);

    if (error) {
       console.error("Update User Error:", error);
       addNotification(`Erreur: ${error.message}`, 'ERROR');
    } else {
       addNotification('Utilisateur mis à jour', 'SUCCESS');
       refreshAllData();
    }
  };

  const deleteUser = async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser && user?.role === Role.RESPONSIBLE) {
        if (targetUser.role === Role.ADMIN || targetUser.role === Role.RESPONSIBLE) {
            addNotification("Action non autorisée sur ce rôle", "ERROR");
            return;
        }
        if (targetUser.classId !== user.classId) {
            addNotification("Utilisateur hors de votre classe", "ERROR");
            return;
        }
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
       addNotification('Utilisateur supprimé', 'INFO');
       refreshAllData();
    } else {
       addNotification('Erreur suppression', 'ERROR');
    }
  };

  const contextValue: AppContextType = {
    user, users, classes, schoolName, setSchoolName,
    announcements, meets, exams, polls, sentEmails, timeTables, courses,
    auditLogs, notifications, notificationHistory,
    addNotification, dismissNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearNotificationHistory,
    highlightedItemId, setHighlightedItemId,
    reminderSettings, updateReminderSettings,
    theme, toggleTheme,
    login, logout, getCurrentClass,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    addMeet, updateMeet, deleteMeet,
    addExam, updateExam, deleteExam,
    addPoll, updatePoll, votePoll, deletePoll,
    addTimeTable, deleteTimeTable,
    addCourse, deleteCourse,
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
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
