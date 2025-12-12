
import { Role, Announcement, Exam, Poll, Urgency, ClassGroup, User, MeetSession } from './types';

// Classes
export const INITIAL_CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'DUT Informatique - Année 1', description: 'Promotion 2024-2025' },
  { id: 'c2', name: 'Licence 3 - Gestion', description: 'Promotion 2025' },
];

// Users
export const INITIAL_USERS: User[] = [
  { id: 'u_admin', name: 'Serigne Fallou Faye', role: Role.ADMIN, email: 'faye@eco.com' }, // Admin Principal
  { id: 'u_prof1', name: 'M. Diallo', role: Role.RESPONSIBLE, email: 'diallo@eco.com', classId: 'c1' },
  { id: 'u_student1', name: 'Aminata Sow', role: Role.STUDENT, email: 'ami@student.com', classId: 'c1' },
];

const TODAY = new Date();
const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TOMORROW.getDate() + 1);
const NEXT_WEEK = new Date(TODAY);
NEXT_WEEK.setDate(NEXT_WEEK.getDate() + 7);

// Content linked to Class C1 (DUT 1)
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Bienvenue en DUT 1',
    content: 'Veuillez consulter vos emplois du temps sur l\'ENT. Bonne rentrée 2025 à tous !',
    date: new Date().toISOString(),
    urgency: Urgency.INFO,
    authorId: 'u_prof1',
    classId: 'c1',
  },
];

export const INITIAL_MEETS: MeetSession[] = [
  {
    id: 'm1',
    subject: 'Algorithmique Avancée',
    teacherName: 'M. Diop',
    link: 'https://meet.google.com/abc-defg-hij',
    date: addHours(new Date(), 1).toISOString(), // Dans 1 heure
    classId: 'c1',
    authorId: 'u_prof1',
  },
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'e1',
    subject: 'Partiel de Java',
    date: TOMORROW.toISOString(),
    durationMinutes: 90,
    room: 'Salle 304',
    notes: 'Calculatrices interdites.',
    authorId: 'u_prof1',
    classId: 'c1',
  },
];

export const INITIAL_POLLS: Poll[] = [
  {
    id: 'p1',
    question: 'Date préférée pour le rattrapage ?',
    type: 'SINGLE',
    active: true,
    createdAt: new Date().toISOString(),
    isAnonymous: false,
    options: [
      { id: 'o1', label: 'Lundi Matin', voterIds: ['u_student1'] },
      { id: 'o2', label: 'Mardi Soir', voterIds: [] },
    ],
    classId: 'c1',
    authorId: 'u_prof1',
  },
];

function addHours(date: Date, hours: number) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}
