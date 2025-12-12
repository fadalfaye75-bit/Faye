

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Megaphone, 
  Video,
  CalendarDays, 
  Vote, 
  LogOut, 
  Menu, 
  X,
  UserCircle,
  School,
  Settings,
  Bell,
  Pencil,
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Github,
  Twitter,
  Globe,
  Home,
  User as UserIcon,
  ArrowLeft,
  Trash2,
  Lock,
  Check,
  Sun,
  Moon,
  Sparkles,
  Bot,
  FileSpreadsheet
} from 'lucide-react';
import { Role, Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from './UserAvatar';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const AVATAR_PRESETS = [
  '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '🦁', '🦅', '🐘', '🌍', '☀️', '📚', '⚽', '💻', '🚀', '🎨', '🎵', '🇸🇳'
];

const LOGO_UCAD = "https://upload.wikimedia.org/wikipedia/fr/4/43/Logo_UCAD.png";

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { 
    user, 
    logout, 
    schoolName, 
    notifications, 
    dismissNotification, 
    notificationHistory, 
    deleteNotification,
    clearNotificationHistory,
    updateUser,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setHighlightedItemId,
    addNotification,
    theme,
    toggleTheme
  } = useApp();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Navigation Items (Desktop Sidebar)
  const navItems = [
    { id: 'dashboard', label: 'Aperçu', icon: LayoutDashboard, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'timetable', label: 'Emploi du Temps', icon: FileSpreadsheet, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'assistant', label: 'Assistant IA', icon: Sparkles, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'infos', label: 'Annonces', icon: Megaphone, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'meet', label: 'Visio', icon: Video, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'ds', label: 'Examens', icon: CalendarDays, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'polls', label: 'Sondages', icon: Vote, roles: [Role.ADMIN, Role.RESPONSIBLE, Role.STUDENT] },
    { id: 'admin', label: 'Réglages', icon: Settings, roles: [Role.ADMIN, Role.RESPONSIBLE] },
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  const unreadCount = notificationHistory.filter(n => !n.read).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUser(user.id, { avatar: reader.result as string });
        setIsProfileModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarSelect = (preset: string) => {
    if (user) {
      updateUser(user.id, { avatar: preset });
      setIsProfileModalOpen(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      addNotification("Le mot de passe est trop court.", "ERROR");
      return;
    }
    if (newPassword !== confirmPassword) {
      addNotification("Les mots de passe ne correspondent pas.", "ERROR");
      return;
    }
    // Simulation du changement de mot de passe
    addNotification("Mot de passe modifié avec succès !", "SUCCESS");
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordChange(false);
  };

  const handleNotificationClick = (notif: Notification) => {
    markNotificationAsRead(notif.id);
    if (notif.targetPage) {
       onNavigate(notif.targetPage);
       if (notif.resourceId) {
         setHighlightedItemId(notif.resourceId);
       }
    }
    setIsNotifMenuOpen(false);
  };

  useEffect(() => {
    if (!isProfileModalOpen) {
      // Reset form when modal closes
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isProfileModalOpen]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-700 dark:text-slate-200 transition-colors duration-500">
      
      {/* --- TOAST NOTIFICATIONS (Floating Top Center) --- */}
      <div className="fixed top-20 md:top-6 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col gap-3 w-[90%] md:w-full md:max-w-md px-4 pointer-events-none">
        {notifications.map((notif) => (
          <div 
            key={notif.id}
            onClick={() => {
              dismissNotification(notif.id);
              if (notif.targetPage) {
                onNavigate(notif.targetPage);
                if (notif.resourceId) setHighlightedItemId(notif.resourceId);
              }
            }}
            className="pointer-events-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-premium rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform animate-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 border-l-4 border-[#87CEEB]"
          >
             <div className={`p-2 rounded-full shrink-0 ${
               notif.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : 
               notif.type === 'ERROR' ? 'bg-red-100 text-red-600' : 
               notif.type === 'WARNING' ? 'bg-orange-100 text-orange-600' : 
               'bg-sky-100 text-sky-600'
             }`}>
               {notif.type === 'SUCCESS' && <CheckCircle className="w-5 h-5" />}
               {notif.type === 'ERROR' && <AlertCircle className="w-5 h-5" />}
               {notif.type === 'WARNING' && <AlertTriangle className="w-5 h-5" />}
               {notif.type === 'INFO' && <Info className="w-5 h-5" />}
             </div>
             <div className="flex-1">
               <p className="font-semibold text-sm text-slate-800 dark:text-white">{notif.message}</p>
             </div>
             <button 
                onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }} 
                className="text-slate-400 hover:text-slate-600"
             >
                <X className="w-4 h-4" />
             </button>
          </div>
        ))}
      </div>

      {/* --- MOBILE HEADER (Clean & Centered) --- */}
      <div className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 px-4 h-[60px] flex items-center justify-between shadow-sm">
         {/* Left: Hamburger OR Back Button */}
         {currentPage === 'dashboard' ? (
           <button 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
             className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition"
           >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
         ) : (
           <button 
             onClick={() => onNavigate('dashboard')} 
             className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition"
           >
              <ArrowLeft className="w-6 h-6" />
           </button>
         )}

         {/* Center: Logo */}
         <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0EA5E9]">
              {logoError ? <School className="w-5 h-5 text-[#87CEEB]" /> : <img src={LOGO_UCAD} className="w-full h-full object-contain" onError={() => setLogoError(true)} />}
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Class Connect</span>
         </div>

         {/* Right: Notifications */}
         <button onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} className="p-2 -mr-2 relative text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-[#87CEEB] rounded-full ring-2 ring-white dark:ring-slate-900"></span>}
         </button>
      </div>

      {/* --- SIDEBAR (Desktop) / DRAWER (Mobile) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-out bg-white dark:bg-slate-900
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-[280px] md:flex md:flex-col
        md:bg-transparent md:h-screen
      `}>
        <div className="h-full md:p-4 flex flex-col">
          {/* Sidebar Container */}
          <div className="flex-1 bg-white dark:bg-slate-900 md:bg-white/90 md:dark:bg-slate-900/90 md:backdrop-blur-xl md:shadow-premium md:rounded-[2rem] border-r md:border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden relative h-full">
             
             {/* Brand (Desktop only) */}
             <div className="hidden md:flex p-8 pb-4 items-center gap-4 border-b border-slate-50/50 dark:border-slate-800/50">
                <div className="w-12 h-12 bg-[#87CEEB]/20 rounded-2xl flex items-center justify-center p-1 border border-[#87CEEB]/30 shadow-sm">
                   {logoError ? <School className="w-7 h-7 text-[#87CEEB]" /> : <img src={LOGO_UCAD} className="w-full h-full object-contain" onError={() => setLogoError(true)} />}
                </div>
                <div>
                   <h1 className="font-extrabold text-lg text-slate-800 dark:text-white leading-none tracking-tight">Class Connect</h1>
                   <p className="text-xs text-[#87CEEB] font-bold mt-1.5 uppercase tracking-wider flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                     En Ligne
                   </p>
                </div>
             </div>

             {/* Mobile Drawer Header */}
             <div className="md:hidden p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 mt-14 bg-slate-50 dark:bg-slate-800/50">
               <UserAvatar user={user} size="lg" className="ring-4 ring-white dark:ring-slate-900 shadow-sm" />
               <div>
                  <h2 className="font-bold text-lg text-slate-800 dark:text-white">{user?.name}</h2>
                  <p className="text-sm text-[#87CEEB] font-medium uppercase tracking-wide">{user?.role}</p>
               </div>
             </div>

             {/* Nav Links */}
             <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Principal</p>
                {filteredNavItems.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative
                        ${isActive 
                          ? 'bg-[#87CEEB]/15 text-[#0369A1] dark:text-[#7DD3FC] shadow-sm border border-[#87CEEB]/20' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }
                      `}
                    >
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#87CEEB] rounded-r-full"></div>}
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-[#0EA5E9]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} transition-colors`} strokeWidth={isActive ? 2.5 : 2} />
                      <span className={`text-[14px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#7DD3FC]" />}
                    </button>
                  );
                })}
             </nav>

             {/* User Profile Footer (Desktop) */}
             <div className="hidden md:block p-4 mt-auto border-t border-slate-50 dark:border-slate-800">
                <div 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700/50 hover:shadow-md transition-all cursor-pointer group"
                >
                   <UserAvatar user={user} size="sm" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-[10px] text-[#87CEEB] font-medium truncate uppercase tracking-wide bg-[#87CEEB]/10 inline-block px-1.5 py-0.5 rounded-md mt-0.5">
                        {user?.role}
                      </p>
                   </div>
                   <Settings className="w-4 h-4 text-slate-300 group-hover:text-[#87CEEB] transition" />
                </div>
                <button 
                  onClick={logout}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 p-3 rounded-xl transition border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
             </div>

             {/* Mobile Drawer Footer */}
             <div className="md:hidden p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
               <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
               >
                 {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                 {theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
               </button>
               <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/20 font-bold">
                 <LogOut className="w-5 h-5" /> Déconnexion
               </button>
             </div>
          </div>
        </div>
      </aside>

      {/* --- BOTTOM NAVIGATION BAR (Mobile Only) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 pb-[env(safe-area-inset-bottom)] z-40 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         <button 
           onClick={() => onNavigate('dashboard')} 
           className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${currentPage === 'dashboard' ? 'text-[#87CEEB]' : 'text-slate-400'}`}
         >
           <Home className={`w-6 h-6 ${currentPage === 'dashboard' ? 'fill-current' : ''}`} strokeWidth={2} />
           <span className="text-[10px] font-bold">Accueil</span>
         </button>
         
         <button 
           onClick={() => onNavigate('timetable')} 
           className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${currentPage === 'timetable' ? 'text-[#87CEEB]' : 'text-slate-400'}`}
         >
           <FileSpreadsheet className={`w-6 h-6 ${currentPage === 'timetable' ? 'fill-current' : ''}`} strokeWidth={2} />
           <span className="text-[10px] font-bold">EDT</span>
         </button>

         <button 
           onClick={() => onNavigate('infos')} 
           className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${currentPage === 'infos' ? 'text-[#87CEEB]' : 'text-slate-400'}`}
         >
           <Megaphone className={`w-6 h-6 ${currentPage === 'infos' ? 'fill-current' : ''}`} strokeWidth={2} />
           <span className="text-[10px] font-bold">Annonces</span>
         </button>

         <button 
           onClick={() => onNavigate('meet')} 
           className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${currentPage === 'meet' ? 'text-[#87CEEB]' : 'text-slate-400'}`}
         >
           <Video className={`w-6 h-6 ${currentPage === 'meet' ? 'fill-current' : ''}`} strokeWidth={2} />
           <span className="text-[10px] font-bold">Meet</span>
         </button>

         <button 
           onClick={() => setIsProfileModalOpen(true)} 
           className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${isProfileModalOpen ? 'text-[#87CEEB]' : 'text-slate-400'}`}
         >
           <UserIcon className={`w-6 h-6 ${isProfileModalOpen ? 'fill-current' : ''}`} strokeWidth={2} />
           <span className="text-[10px] font-bold">Profil</span>
         </button>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative scroll-smooth bg-slate-50 dark:bg-slate-950 flex flex-col pt-4 md:pt-0 pb-20 md:pb-0">
         
         {/* Desktop Header */}
         <header className="hidden md:flex items-center justify-between px-8 py-6 sticky top-0 z-30 pointer-events-none">
            <div className="pointer-events-auto"></div> 
            
            <div className="flex items-center gap-4 pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-full border border-white/60 dark:border-slate-700 shadow-glass">
               <button 
                 onClick={toggleTheme}
                 className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300 hover:text-[#0EA5E9]"
                 title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
               >
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
               </button>

               <button 
                  onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition relative text-slate-600 dark:text-slate-300 hover:text-[#0EA5E9]"
               >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>}
               </button>
               <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
               <div className="flex items-center gap-2 pr-2">
                 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-2">{user?.role}</span>
               </div>
            </div>

            {/* Notifications Dropdown */}
            {isNotifMenuOpen && (
               <div className="absolute top-20 right-8 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-800 overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 origin-top-right z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#87CEEB]/20">
                     <h3 className="font-bold text-sm text-[#0C4A6E] dark:text-[#E0F2FE]">Notifications</h3>
                     <div className="flex gap-2">
                        {notificationHistory.length > 0 && (
                          <button 
                             onClick={clearNotificationHistory} 
                             className="text-xs text-red-500 font-bold hover:bg-red-100 px-2 py-1 rounded transition flex items-center gap-1"
                             title="Tout effacer"
                          >
                             <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={markAllNotificationsAsRead} className="text-xs text-[#0369A1] dark:text-[#7DD3FC] font-bold hover:underline bg-white/50 dark:bg-black/20 px-2 py-1 rounded">Tout lire</button>
                     </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                     {notificationHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Rien à signaler.</div>
                     ) : (
                        notificationHistory.map(n => (
                           <div 
                              key={n.id} 
                              onClick={() => handleNotificationClick(n)}
                              className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex gap-3 group relative ${!n.read ? 'bg-[#87CEEB]/10' : ''}`}
                           >
                              <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.read ? 'bg-[#0EA5E9]' : 'bg-transparent'}`}></div>
                              <div className="flex-1 pr-6">
                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{n.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{formatDistanceToNow(new Date(n.timestamp || Date.now()), { addSuffix: true, locale: fr })}</p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                className="absolute right-2 top-2 p-1.5 rounded-full text-slate-300 hover:text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            )}
         </header>

         {/* Page Content Injection */}
         <div className="px-4 md:px-10 pb-4 max-w-7xl mx-auto w-full flex-grow">
            {children}
         </div>

         {/* --- FOOTER (Hidden on Mobile due to Bottom Nav) --- */}
         <footer className="hidden md:block mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-8 px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-3">
                  <School className="w-5 h-5 text-[#87CEEB]" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Class Connect © 2025</span>
               </div>
               
               <div className="flex items-center gap-4">
                  <a href="#" className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#87CEEB]/20 hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition text-slate-500 dark:text-slate-400"><Twitter className="w-4 h-4"/></a>
                  <a href="#" className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#87CEEB]/20 hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition text-slate-500 dark:text-slate-400"><Github className="w-4 h-4"/></a>
                  <a href="#" className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#87CEEB]/20 hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition text-slate-500 dark:text-slate-400"><Globe className="w-4 h-4"/></a>
               </div>
            </div>
         </footer>

      </main>

      {/* --- PROFILE MODAL --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 relative max-h-[90vh] overflow-y-auto">
              <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800 relative bg-gradient-to-b from-[#87CEEB]/30 to-white dark:to-slate-900">
                 <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm border border-slate-100 dark:border-slate-700"><X className="w-4 h-4 text-slate-500 dark:text-slate-400" /></button>
                 
                 <div className="relative inline-block mt-2 mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <UserAvatar user={user} size="xl" className="ring-4 ring-white dark:ring-slate-900 shadow-premium" />
                    <div className="absolute inset-0 bg-[#0C4A6E]/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-[1px]">
                       <Upload className="w-6 h-6 text-white" />
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h3>
                 <p className="text-[#0EA5E9] font-medium text-sm mt-1">{user?.email}</p>
                 <div className="mt-2 inline-block px-3 py-1 bg-[#87CEEB]/20 text-[#0369A1] dark:text-[#7DD3FC] text-xs font-bold rounded-full uppercase tracking-wide">
                   {user?.role}
                 </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-950 space-y-6">
                 {/* Avatar Selection */}
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Choisir un avatar</p>
                    <div className="grid grid-cols-5 gap-3">
                        {AVATAR_PRESETS.map((emoji, i) => (
                          <button key={i} onClick={() => handleAvatarSelect(emoji)} className="text-2xl h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#87CEEB] hover:shadow-md hover:scale-110 transition duration-200 flex items-center justify-center">
                              {emoji}
                          </button>
                        ))}
                    </div>
                 </div>

                 <div className="border-t border-slate-200 dark:border-slate-800 my-2"></div>
                 
                 {/* Change Password Section */}
                 <div>
                    <button 
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="w-full flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                    >
                      <span className="flex items-center gap-2"><Lock className="w-4 h-4"/> Modifier mot de passe</span>
                      <ChevronRight className={`w-4 h-4 transition ${showPasswordChange ? 'rotate-90' : ''}`} />
                    </button>

                    {showPasswordChange && (
                      <form onSubmit={handleChangePassword} className="mt-4 space-y-3 animate-in slide-in-from-top-2">
                        <div>
                          <input 
                            type="password" 
                            placeholder="Nouveau mot de passe"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-[#87CEEB] outline-none dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <input 
                            type="password" 
                            placeholder="Confirmer mot de passe"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-[#87CEEB] outline-none dark:text-white"
                            required
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-slate-800 dark:bg-slate-700 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition"
                        >
                          Sauvegarder
                        </button>
                      </form>
                    )}
                 </div>

                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                 
                 {/* Mobile Logout in Modal */}
                 <div className="md:hidden pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 p-3 rounded-xl transition"
                    >
                      <LogOut className="w-4 h-4" /> Se déconnecter
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};