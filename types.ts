

export enum Role {
  ADMIN = 'ADMIN',            // Super Admin (Gère tout)
  RESPONSIBLE = 'RESPONSIBLE', // Responsable de classe (Gère sa classe)
  STUDENT = 'STUDENT',         // Élève (Lecture seule + Vote)
}

export interface ClassGroup {
  id: string;
  name: string; // ex: DUT 2
  description?: string;
  email?: string; // Mailing list de la classe (ex: dut2@ecole.com)
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  classId?: string; // Null pour l'Admin global
  avatar?: string; // URL, Base64 string, or Emoji char
}

export enum Urgency {
  INFO = 'INFO',
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
}

export interface Attachment {
  id: string;
  type: 'PDF' | 'IMAGE';
  url: string; // Base64 ou URL
  name: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  urgency: Urgency;
  authorId: string;
  classId: string;
  durationHours?: number; // Durée de visibilité en heures (optionnel)
  link?: string; // Lien externe (Google Forms/Meet/Drive)
  attachments?: Attachment[]; // Fichiers joints (PDF, Images)
}

export interface TimeTable {
  id: string;
  title: string;
  fileUrl: string; // Base64 du fichier Excel
  fileName: string;
  dateAdded: string;
  classId: string;
  authorId: string;
}

export interface Course {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  dayOfWeek: number; // 1 (Lundi) à 6 (Samedi)
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  color: string;
  classId: string;
}

export interface MeetSession {
  id: string;
  subject: string;
  link: string;
  date: string; // ISO string
  teacherName: string;
  classId: string;
  authorId: string; // ID du créateur
}

export interface Exam {
  id: string;
  subject: string;
  date: string; // ISO string
  durationMinutes: number;
  room: string;
  notes?: string;
  authorId: string;
  classId: string;
}

export interface PollOption {
  id: string;
  label: string;
  voterIds: string[]; // Liste des IDs des votants pour permettre le changement de vote
}

export interface Poll {
  id: string;
  question: string;
  type: 'SINGLE' | 'MULTIPLE';
  options: PollOption[];
  active: boolean;
  createdAt: string;
  isAnonymous: boolean;
  classId: string;
  authorId: string; // ID du créateur
  durationHours?: number; // Durée de visibilité en heures (optionnel)
}

export interface SentEmail {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  resource_type: string;
  sender_name: string;
  class_id: string;
}

export interface EmailConfig {
  provider: 'MAILTO' | 'SENDGRID';
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
}

// --- REMINDERS ---
export interface ReminderSettings {
  enabled: boolean;
  courseDelay: number; // Minutes avant le cours
  examDelay: number;   // Minutes avant l'examen
  meetDelay: number;   // Minutes avant le meet
}

// --- SECURITY & UX ---

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  author: string;
  role: Role;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface Notification {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  timestamp?: string;
  targetPage?: string; // Page vers laquelle rediriger au clic
  resourceId?: string; // ID de l'élément spécifique à ouvrir
  read?: boolean; // État de lecture
}

export interface AppState {
  user: User | null;
  schoolName: string;
  classes: ClassGroup[];
  users: User[];
  announcements: Announcement[];
  meets: MeetSession[];
  exams: Exam[];
  polls: Poll[];
  auditLogs: AuditLog[];
}

export interface AppContextType {
  user: User | null;
  users: User[]; 
  classes: ClassGroup[];
  schoolName: string;
  setSchoolName: (name: string) => void;
  
  // Data
  announcements: Announcement[];
  meets: MeetSession[];
  exams: Exam[];
  polls: Poll[];
  timeTables: TimeTable[];
  courses: Course[]; // NOUVEAU
  sentEmails: SentEmail[];
  
  // Security & UX
  auditLogs: AuditLog[];
  notifications: Notification[];
  notificationHistory: Notification[];
  addNotification: (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', targetPage?: string, resourceId?: string) => void;
  dismissNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotificationHistory: () => void;
  
  // Reminders
  reminderSettings: ReminderSettings;
  updateReminderSettings: (settings: ReminderSettings) => void;
  
  // Deep Linking State
  highlightedItemId: string | null;
  setHighlightedItemId: (id: string | null) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Actions
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<boolean>; 
  logout: () => void;
  getCurrentClass: () => ClassGroup | undefined;
  
  // Content Management (CRUD)
  addAnnouncement: (item: Omit<Announcement, 'id' | 'authorId' | 'classId'>, targetRoles?: Role[]) => Promise<void>;
  updateAnnouncement: (id: string, item: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  
  addMeet: (item: Omit<MeetSession, 'id' | 'classId' | 'authorId'>, targetRoles?: Role[]) => Promise<void>;
  updateMeet: (id: string, item: Partial<MeetSession>) => Promise<void>;
  deleteMeet: (id: string) => Promise<void>;
  
  addExam: (item: Omit<Exam, 'id' | 'authorId' | 'classId'>, targetRoles?: Role[]) => Promise<void>;
  updateExam: (id: string, item: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  
  addPoll: (item: Omit<Poll, 'id' | 'createdAt' | 'classId' | 'authorId'>) => Promise<void>;
  updatePoll: (id: string, item: Partial<Poll>) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  deletePoll: (id: string) => Promise<void>;

  // Emplois du temps
  addTimeTable: (item: Omit<TimeTable, 'id' | 'authorId' | 'classId' | 'dateAdded'>) => Promise<void>;
  deleteTimeTable: (id: string) => Promise<void>;

  // Cours (Calendrier Interactif)
  addCourse: (item: Omit<Course, 'id' | 'classId'>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  // Sharing & Config
  emailConfig: EmailConfig;
  updateEmailConfig: (config: EmailConfig) => void;
  shareResource: (type: 'ANNOUNCEMENT' | 'MEET' | 'EXAM' | 'POLL', item: any) => Promise<void>;
  resendEmail: (email: SentEmail) => void;

  // Admin / Class Management
  addClass: (name: string, description: string, email: string) => Promise<void>;
  updateClass: (id: string, item: Partial<ClassGroup>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  importUsers: (usersData: Omit<User, 'id'>[]) => Promise<void>;
  updateUser: (id: string, item: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}