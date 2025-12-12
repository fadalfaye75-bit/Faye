
import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, TrendingUp, AlertCircle, ArrowRight, PieChart as PieChartIcon, Zap, Megaphone, Clock } from 'lucide-react';
import { Role } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { format, isSameWeek, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, users, exams, announcements, polls } = useApp();

  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTER DATA BY CLASS ---
  const myExams = isAdmin ? exams : exams.filter(e => e.classId === user?.classId);
  const myAnnouncements = isAdmin ? announcements : announcements.filter(a => a.classId === user?.classId);
  const myPolls = isAdmin ? polls : polls.filter(p => p.classId === user?.classId);

  const today = new Date();
  
  const nextExams = myExams
    .filter(e => new Date(e.date) >= new Date(today.setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const urgentAnnouncements = myAnnouncements.filter(a => a.urgency === 'URGENT');
  const recentAnnouncements = [...myAnnouncements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const activePolls = myPolls.filter(p => p.active);
  const totalPolls = myPolls.length;
  
  // Fake participation data
  const participationRate = totalPolls > 0 ? 75 : 0;
  const pieData = [
    { name: 'Votants', value: participationRate },
    { name: 'Abstention', value: 100 - participationRate },
  ];
  // Class Connect Palette: Sky Blue (#87CEEB) & Turquoise (#2DD4BF)
  const PIE_COLORS = ['#87CEEB', '#2DD4BF'];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* --- HEADER SECTION --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 md:pt-0">
        <div>
           <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
             Bonjour, <span className="text-brand-600 dark:text-brand-400">{user?.name.split(' ')[0]}</span>
           </h1>
           <p className="text-slate-500 dark:text-slate-400 text-lg mt-2 font-medium">
             Voici ce qu'il se passe sur Class Connect.
           </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-brand-600 dark:text-brand-400">
           <Clock className="w-4 h-4" />
           <span className="text-sm font-bold capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      {/* --- STATS CARDS (Floating White with Sky Accents) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('ds')}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-card hover:shadow-premium card-hover cursor-pointer border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-48 group relative overflow-hidden"
        >
           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-pastel/10 rounded-bl-[4rem] transition-all group-hover:scale-110"></div>
           <div className="flex justify-between items-start relative z-10">
              <div className="w-12 h-12 bg-brand-pastel/20 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:bg-brand-pastel group-hover:text-white transition-colors duration-300">
                 <Calendar className="w-6 h-6" />
              </div>
              <span className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-slate-100 dark:border-slate-700">Examen</span>
           </div>
           <div className="relative z-10">
              <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{nextExams.length}</span>
              <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-wide">Épreuves à venir</p>
           </div>
        </div>

        <div 
          onClick={() => onNavigate('polls')}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-card hover:shadow-premium card-hover cursor-pointer border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-48 group relative overflow-hidden"
        >
           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/10 rounded-bl-[4rem] transition-all group-hover:scale-110"></div>
           <div className="flex justify-between items-start relative z-10">
              <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors duration-300">
                 <TrendingUp className="w-6 h-6" />
              </div>
              <span className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-slate-100 dark:border-slate-700">Sondage</span>
           </div>
           <div className="relative z-10">
              <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{activePolls.length}</span>
              <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-wide">Votes en cours</p>
           </div>
        </div>

        <div 
          onClick={() => onNavigate('infos')}
          className="bg-gradient-to-br from-[#87CEEB] to-[#0EA5E9] p-8 rounded-[2rem] shadow-lg shadow-brand-pastel/30 card-hover cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden group"
        >
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 transition group-hover:scale-150 duration-700"></div>
           <div className="flex justify-between items-start relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm">
                 <Megaphone className="w-6 h-6" />
              </div>
              {urgentAnnouncements.length > 0 && <span className="bg-white text-brand-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">Important</span>}
           </div>
           <div className="relative z-10">
              <span className="text-5xl font-black text-white tracking-tighter">{urgentAnnouncements.length}</span>
              <p className="text-white/80 font-bold text-sm mt-1 uppercase tracking-wide">Messages Urgents</p>
           </div>
        </div>
      </div>

      {/* --- GRID LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Section Header */}
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Annonces Récentes</h3>
              <button onClick={() => onNavigate('infos')} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition group">
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500" />
              </button>
           </div>

           {/* Announcements List */}
           <div className="space-y-4">
              {recentAnnouncements.map((item, idx) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] shadow-card border border-slate-100 dark:border-slate-800 flex gap-5 hover:scale-[1.01] hover:shadow-lg hover:shadow-brand-pastel/10 transition duration-300">
                   <UserAvatar user={users.find(u => u.id === item.authorId)} size="md" className="hidden md:flex mt-1" />
                   <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                         <h4 className="font-bold text-lg text-slate-800 dark:text-white">{item.title}</h4>
                         <span className="text-xs font-bold text-brand-600 bg-brand-pastel/20 px-2 py-1 rounded-lg border border-brand-pastel/30">
                            {formatDistanceToNow(new Date(item.date), { locale: fr })}
                         </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base font-medium line-clamp-2">{item.content}</p>
                   </div>
                </div>
              ))}
              {recentAnnouncements.length === 0 && (
                <div className="bg-surface-50 dark:bg-slate-900/50 rounded-[1.5rem] p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                   <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-20 text-brand-pastel" />
                   <p className="font-medium">Rien à signaler pour le moment</p>
                </div>
              )}
           </div>

           {/* Exams Teaser */}
           {nextExams.length > 0 && (
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-card border border-slate-100 dark:border-slate-800 mt-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pastel/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 relative z-10">Prochain Examen</h3>
                <div className="flex items-center gap-6 relative z-10">
                   <div className="bg-brand-600 text-white rounded-2xl p-4 text-center min-w-[5rem] shadow-xl shadow-brand-500/20 flex flex-col justify-center">
                      {/* Affichage du Jour */}
                      <span className="block text-xs font-bold opacity-80 uppercase mb-0.5">{format(new Date(nextExams[0].date), 'EEEE', {locale:fr})}</span>
                      {/* Affichage du Jour (Numéro) */}
                      <span className="block text-3xl font-black leading-none">{format(new Date(nextExams[0].date), 'dd')}</span>
                      {/* Affichage du Mois */}
                      <span className="block text-xs font-bold opacity-80 uppercase mt-0.5">{format(new Date(nextExams[0].date), 'MMM', {locale:fr})}</span>
                   </div>
                   <div>
                      <h4 className="text-2xl font-bold text-slate-800 dark:text-white">{nextExams[0].subject}</h4>
                      <p className="text-brand-600 dark:text-brand-400 font-medium flex items-center gap-2 mt-1">
                         <Clock className="w-4 h-4" /> {format(new Date(nextExams[0].date), 'HH:mm')} • {nextExams[0].room}
                      </p>
                   </div>
                </div>
             </div>
           )}

        </div>

        {/* Right Col */}
        <div className="space-y-8">
           
           {/* Admin Actions */}
           {user?.role !== Role.STUDENT && (
             <div className="bg-brand-900 dark:bg-slate-800 rounded-[2rem] p-6 text-white shadow-xl shadow-brand-900/10 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-pastel rounded-full blur-3xl opacity-20"></div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2 relative z-10"><Zap className="w-5 h-5 text-brand-accent" /> Actions Rapides</h3>
                <p className="text-brand-200 text-sm mb-6 relative z-10">Gestion simplifiée.</p>
                <div className="grid grid-cols-2 gap-3 relative z-10">
                   <button onClick={() => onNavigate('infos')} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-sm font-bold backdrop-blur-md transition border border-white/10">Publier</button>
                   <button onClick={() => onNavigate('ds')} className="bg-white text-brand-900 hover:bg-brand-50 p-3 rounded-xl text-sm font-bold transition shadow-sm">Planifier</button>
                </div>
             </div>
           )}

           {/* Engagement Chart (Minimalist Sky Blue) */}
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-card border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <PieChartIcon className="w-5 h-5 text-slate-400" /> Participation
              </h3>
              <div className="h-40 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index]} />)}
                      </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">{participationRate}%</span>
                 </div>
              </div>
              <p className="text-center text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Moyenne Globale</p>
           </div>

        </div>

      </div>
    </div>
  );
};
