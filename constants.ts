
import { User, Role, Announcement, ClassGroup, Exam, MeetSession, Poll, Urgency, TimeTable, Course, AuditLog } from './types';

export const MOCK_CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'L3 Génie Logiciel', description: 'Licence 3 Informatique', email: 'l3gl@ecole.com' },
  { id: 'c2', name: 'Master 1 Data Science', description: 'Master 1 Big Data & AI', email: 'm1data@ecole.com' }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Principal', email: 'admin@demo.com', role: Role.ADMIN, avatar: '🛡️' },
  { id: 'u2', name: 'M. Diop', email: 'prof@demo.com', role: Role.RESPONSIBLE, classId: 'c1', avatar: '👨‍🏫' },
  { id: 'u3', name: 'Aminata Diallo', email: 'student@demo.com', role: Role.STUDENT, classId: 'c1', avatar: '👩‍🎓' },
  { id: 'u4', name: 'Moussa Koné', email: 'moussa@demo.com', role: Role.STUDENT, classId: 'c1', avatar: '👨‍🎓' },
  { id: 'u5', name: 'Samba Ndiaye', email: 'samba@demo.com', role: Role.STUDENT, classId: 'c2', avatar: '🦁' },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: '🎉 Bienvenue sur Class Connect+',
    content: 'Nous sommes ravis de vous accueillir sur la nouvelle plateforme. Consultez vos cours, examens et participez aux sondages de la classe.',
    date: new Date().toISOString(),
    urgency: Urgency.INFO,
    authorId: 'u1',
    classId: 'c1',
    durationHours: 168
  },
  {
    id: 'a2',
    title: '⚠️ Rappel: Projet Java',
    content: 'N\'oubliez pas de soumettre votre projet Java avant ce soir minuit. Le dépôt se fait sur le Drive de la classe.',
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    urgency: Urgency.URGENT,
    authorId: 'u2',
    classId: 'c1',
    durationHours: 24
  },
  {
    id: 'a3',
    title: 'Club Robotique',
    content: 'Réunion d\'information pour le club de robotique ce mercredi en salle TP2.',
    date: new Date(Date.now() - 86400000).toISOString(),
    urgency: Urgency.NORMAL,
    authorId: 'u1',
    classId: 'c2',
  }
];

export const MOCK_MEETS: MeetSession[] = [
  {
    id: 'm1',
    subject: 'Cours de ReactJS Avancé',
    teacherName: 'M. Diop',
    link: 'https://meet.google.com/abc-defg-hij',
    date: new Date(Date.now() + 3600000).toISOString(), // Dans 1h
    classId: 'c1',
    authorId: 'u2'
  },
  {
    id: 'm2',
    subject: 'Introduction au Machine Learning',
    teacherName: 'Mme. Sy',
    link: 'https://meet.google.com/xyz-uvw-trs',
    date: new Date(Date.now() + 86400000).toISOString(), // Demain
    classId: 'c2',
    authorId: 'u1'
  }
];

export const MOCK_EXAMS: Exam[] = [
  {
    id: 'e1',
    subject: 'Base de Données SQL',
    date: new Date(Date.now() + 86400000 * 2).toISOString(), // Dans 2 jours
    durationMinutes: 120,
    room: 'Amphi A',
    notes: 'Calculatrice et documents autorisés.',
    authorId: 'u2',
    classId: 'c1'
  },
  {
    id: 'e2',
    subject: 'Analyse de Données',
    date: new Date(Date.now() + 86400000 * 5).toISOString(), // Dans 5 jours
    durationMinutes: 90,
    room: 'Salle 104',
    notes: 'QCM sur tablette.',
    authorId: 'u1',
    classId: 'c2'
  }
];

export const MOCK_POLLS: Poll[] = [
  {
    id: 'p1',
    question: 'Date du prochain rattrapage ?',
    type: 'SINGLE',
    options: [
      { id: 'o1', label: 'Lundi Matin', voterIds: ['u3'] },
      { id: 'o2', label: 'Mardi Soir', voterIds: ['u4', 'u2'] }
    ],
    active: true,
    createdAt: new Date().toISOString(),
    isAnonymous: false,
    classId: 'c1',
    authorId: 'u2',
    durationHours: 48
  }
];

export const MOCK_COURSES: Course[] = [
  { id: 'crs1', subject: 'Algorithmique', teacher: 'M. Fall', room: 'S202', dayOfWeek: 1, startTime: '08:00', endTime: '10:00', color: 'bg-blue-100 border-blue-200 text-blue-800', classId: 'c1' },
  { id: 'crs2', subject: 'Droit Informatique', teacher: 'Mme. Ndiaye', room: 'Amphi B', dayOfWeek: 2, startTime: '10:00', endTime: '12:00', color: 'bg-orange-100 border-orange-200 text-orange-800', classId: 'c1' },
];

export const MOCK_TIMETABLES: TimeTable[] = [];
export const MOCK_LOGS: AuditLog[] = [
  { id: 'l1', action: 'LOGIN', details: 'Connexion Admin', author: 'Admin Principal', role: Role.ADMIN, timestamp: new Date().toISOString(), severity: 'INFO' }
];
