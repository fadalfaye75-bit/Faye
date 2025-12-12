
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Role, User, ClassGroup } from '../types';
import { Users, Shield, Trash2, Plus, Pencil, Save, AlertTriangle, Download, Upload, School, UserCircle, X, Copy, Check, Mail, Calendar, Info, RefreshCw, Eye, Search, Filter, Send, Settings, Lock, Server, Terminal, ExternalLink, CheckCircle } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

export const AdminPanel: React.FC = () => {
  const { 
    user, users, classes, schoolName, setSchoolName,
    addClass, updateClass, deleteClass, 
    addUser, importUsers, updateUser, deleteUser, 
    auditLogs, sentEmails, addNotification, resendEmail,
    emailConfig, updateEmailConfig
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'logs' | 'emails'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string; type: 'USER' | 'CLASS' } | null>(null);
  
  const [isEditingSchoolName, setIsEditingSchoolName] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);

  // Sync temp state when context changes (fix visual bug)
  useEffect(() => {
    setTempSchoolName(schoolName);
  }, [schoolName]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [classEmail, setClassEmail] = useState('');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<Role>(Role.STUDENT);
  const [userClassId, setUserClassId] = useState('');

  // --- LOG FILTERS STATE ---
  const [logSearch, setLogSearch] = useState('');
  const [logSeverity, setLogSeverity] = useState('ALL');
  const [logAuthor, setLogAuthor] = useState('ALL');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  
  // State pour les logs "Non lus" (Basé sur le localStorage)
  const [lastReadLogTime, setLastReadLogTime] = useState(() => {
    return localStorage.getItem('admin_last_read_log_time') || new Date(0).toISOString();
  });
  const [filterUnread, setFilterUnread] = useState(false);
  
  // --- EMAIL CONFIG STATE ---
  const [sgApiKey, setSgApiKey] = useState(emailConfig.apiKey || '');
  const [sgSender, setSgSender] = useState(emailConfig.senderEmail || '');
  const [emailProvider, setEmailProvider] = useState(emailConfig.provider);

  const isAdmin = user?.role === Role.ADMIN;
  const isResponsible = user?.role === Role.RESPONSIBLE;
  
  // --- MEMOIZED DATA ---
  const filteredUsers = useMemo(() => {
    return isAdmin 
      ? users 
      : users.filter(u => u.classId === user?.classId);
  }, [isAdmin, users, user?.classId]);

  // --- LOG FILTERING LOGIC ---
  const uniqueLogAuthors = useMemo(() => {
    return Array.from(new Set(auditLogs.map(log => log.author)));
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // 1. Text Search (Action or Details)
      const searchLower = logSearch.toLowerCase();
      const matchesSearch = 
        log.action.toLowerCase().includes(searchLower) || 
        log.details.toLowerCase().includes(searchLower);

      // 2. Severity
      const matchesSeverity = logSeverity === 'ALL' || log.severity === logSeverity;

      // 3. Author
      const matchesAuthor = logAuthor === 'ALL' || log.author === logAuthor;

      // 4. Date Range
      let matchesDate = true;
      const logDate = new Date(log.timestamp);
      
      if (logStartDate) {
        matchesDate = matchesDate && (isAfter(logDate, startOfDay(new Date(logStartDate))) || logDate.getTime() === new Date(logStartDate).getTime());
      }
      if (logEndDate) {
        matchesDate = matchesDate && isBefore(logDate, endOfDay(new Date(logEndDate)));
      }

      // 5. Unread Filter
      let matchesUnread = true;
      if (filterUnread) {
        matchesUnread = logDate.getTime() > new Date(lastReadLogTime).getTime();
      }

      return matchesSearch && matchesSeverity && matchesAuthor && matchesDate && matchesUnread;
    });
  }, [auditLogs, logSearch, logSeverity, logAuthor, logStartDate, logEndDate, filterUnread, lastReadLogTime]);

  const clearLogFilters = () => {
    setLogSearch('');
    setLogSeverity('ALL');
    setLogAuthor('ALL');
    setLogStartDate('');
    setLogEndDate('');
    setFilterUnread(false);
  };

  const markAllLogsAsRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem('admin_last_read_log_time', now);
    setLastReadLogTime(now);
    addNotification("Tous les journaux marqués comme lus", "SUCCESS");
  };

  const saveSchoolName = () => {
    setSchoolName(tempSchoolName);
    setIsEditingSchoolName(false);
  };
  
  const saveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmailConfig({
        provider: emailProvider,
        // On ne sauvegarde pas la clé API ici si on utilise les Edge Functions
        // apiKey: sgApiKey, 
        senderEmail: sgSender,
        senderName: schoolName
    });
    addNotification("Configuration email mise à jour", "SUCCESS");
  };

  const openCreate = () => {
    setEditingId(null);
    setClassName('');
    setClassDesc('');
    setClassEmail('');
    setUserName('');
    setUserEmail('');
    setUserRole(Role.STUDENT);
    setUserClassId(isAdmin ? '' : (user?.classId || '')); // Default to responsible's class
    setIsModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingId(u.id);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserClassId(u.classId || '');
    setIsModalOpen(true);
  };

  const copyUserInfo = (u: User) => {
    const uClass = classes.find(c => c.id === u.classId)?.name || 'Sans classe';
    const text = `📋 FICHE UTILISATEUR\n------------------\nNom : ${u.name}\nEmail : ${u.email}\nRôle : ${u.role}\nClasse : ${uClass}\n------------------\n${schoolName}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUserId(u.id);
      setTimeout(() => setCopiedUserId(null), 2000);
      addNotification("Infos copiées", "INFO");
    });
  };

  const openEditClass = (c: ClassGroup) => {
    setEditingId(c.id);
    setClassName(c.name);
    setClassDesc(c.description || '');
    setClassEmail(c.email || '');
    setIsModalOpen(true);
  };

  const confirmDeleteUser = (u: User) => {
    setDeleteConfirmation({ id: u.id, name: u.name, type: 'USER' });
  };

  const confirmDeleteClass = (c: ClassGroup) => {
    setDeleteConfirmation({ id: c.id, name: c.name, type: 'CLASS' });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    if (deleteConfirmation.type === 'USER') {
      await deleteUser(deleteConfirmation.id);
    } else {
      await deleteClass(deleteConfirmation.id);
    }
    setDeleteConfirmation(null);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClass(editingId, { name: className, description: classDesc, email: classEmail });
    } else {
      addClass(className, classDesc, classEmail);
    }
    setIsModalOpen(false);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
        name: userName,
        email: userEmail,
        role: userRole,
        classId: userClassId
    };
    if (editingId) {
        updateUser(editingId, payload);
    } else {
        addUser(payload);
    }
    setIsModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const headers = "Nom,Email,Role,NomClasse";
    const example = "Jean Dupont,jean@example.com,STUDENT,DUT Informatique";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_utilisateurs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const usersToImport: Omit<User, 'id'>[] = [];
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, email, roleStr, className] = line.split(',').map(s => s.trim());
        if (!name || !email) { errorCount++; continue; }

        let role = Role.STUDENT;
        if (roleStr?.toUpperCase() === 'ADMIN') role = Role.ADMIN;
        if (roleStr?.toUpperCase() === 'RESPONSIBLE') role = Role.RESPONSIBLE;
        
        let classId = undefined;
        if (className) {
          const foundClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
          if (foundClass) classId = foundClass.id;
        }

        // Security override: Responsible imports default to their class if not specified correctly or empty
        if (!isAdmin && user?.classId) {
             classId = user.classId;
        }

        usersToImport.push({
          name: name.replace(/"/g, ''),
          email: email.replace(/"/g, ''),
          role,
          classId
        });
      }

      if (usersToImport.length > 0) {
        await importUsers(usersToImport);
        if (errorCount > 0) addNotification(`Importé ${usersToImport.length}. ${errorCount} erreurs.`, "WARNING");
      } else {
        addNotification("Aucun utilisateur valide trouvé.", "ERROR");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleTestEmail = () => {
    if (!user?.email) {
      addNotification("Vous n'avez pas d'email configuré.", "ERROR");
      return;
    }
    const subject = `[${schoolName}] Test de configuration`;
    const body = "Ceci est un email de test pour vérifier que l'envoi fonctionne correctement.";
    
    // Si SendGrid, on teste l'API, sinon mailto
    if (emailConfig.provider === 'SENDGRID') {
        resendEmail({
            id: 'test',
            recipient_email: user.email,
            subject,
            body_html: body,
            created_at: new Date().toISOString(),
            resource_type: 'TEST',
            sender_name: 'Admin',
            class_id: ''
        });
    } else {
        window.location.href = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        addNotification("Application de messagerie ouverte.", "SUCCESS");
    }
  };

  // Define Tabs based on Role
  const availableTabs = [
    { id: 'users', label: 'Utilisateurs', icon: Users },
    ...(isAdmin ? [{ id: 'classes', label: 'Classes', icon: School }] : []),
    { id: 'logs', label: 'Journal', icon: Info },
    { id: 'emails', label: 'Emails', icon: Mail }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 pb-20 md:pb-12 animate-in fade-in duration-500">
      <div className="mb-8 md:mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                {isAdmin ? (
                  <span className="bg-red-50 dark:bg-red-900/30 p-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600"><Shield className="w-8 h-8" /></span>
                ) : (
                  <span className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600"><Users className="w-8 h-8" /></span>
                )}
                Administration
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">
                  {isAdmin ? "Gestion globale de l'établissement." : "Gestion de votre classe."}
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {isEditingSchoolName ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <input 
                      value={tempSchoolName} 
                      onChange={e => setTempSchoolName(e.target.value)} 
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/20 outline-none"
                    />
                    <button onClick={saveSchoolName} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsEditingSchoolName(false)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-2">
                    <School className="w-5 h-5 text-sky-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">{schoolName}</span>
                    <button onClick={() => setIsEditingSchoolName(true)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"><Pencil className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide">
         {availableTabs.map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${
               activeTab === tab.id 
               ? 'bg-slate-800 text-white shadow-lg shadow-slate-500/20' 
               : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
             }`}
           >
             <tab.icon className="w-4 h-4" /> {tab.label}
           </button>
         ))}
      </div>

      {/* Content: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-end gap-2">
             <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
             <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2">
                <Download className="w-4 h-4" /> <span className="hidden md:inline">Modèle CSV</span>
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2">
                <Upload className="w-4 h-4" /> <span className="hidden md:inline">Importer</span>
             </button>
             <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter
             </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-6 py-4">Rôle</th>
                    <th className="px-6 py-4">Classe</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center">Aucun utilisateur trouvé dans votre périmètre.</td></tr>
                  ) : filteredUsers.map((u) => {
                    const userClass = classes.find(c => c.id === u.classId);
                    const canEdit = isAdmin || (isResponsible && u.role === Role.STUDENT && u.classId === user?.classId);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={u} size="sm" />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                              <p className="text-xs">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold border uppercase tracking-wide ${
                            u.role === Role.ADMIN ? 'bg-red-50 text-red-600 border-red-200' : 
                            u.role === Role.RESPONSIBLE ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 
                            'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
                          {userClass ? userClass.name : <span className="text-slate-400 italic">Aucune</span>}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                           <button onClick={() => copyUserInfo(u)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition" title="Copier les infos">
                             {copiedUserId === u.id ? <Check className="w-4 h-4 text-emerald-500"/> : <Copy className="w-4 h-4" />}
                           </button>
                           {canEdit && (
                             <>
                               <button onClick={() => openEditUser(u)} className="flex items-center gap-2 p-2 px-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition text-xs font-bold" title="Modifier">
                                 <Pencil className="w-4 h-4" /> <span className="hidden xl:inline">Modifier</span>
                               </button>
                               <button onClick={() => confirmDeleteUser(u)} className="flex items-center gap-2 p-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition text-xs font-bold" title="Supprimer">
                                 <Trash2 className="w-4 h-4" /> <span className="hidden xl:inline">Supprimer</span>
                               </button>
                             </>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Content: Classes (ADMIN ONLY) */}
      {activeTab === 'classes' && isAdmin && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex justify-end">
             <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter
             </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(c => (
                <div key={c.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition group">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h3 className="text-lg font-bold text-slate-800 dark:text-white">{c.name}</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400">{c.description}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                         <button onClick={() => openEditClass(c)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sky-600"><Pencil className="w-4 h-4" /></button>
                         <button onClick={() => confirmDeleteClass(c)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                   {c.email && (
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg inline-flex">
                        <Mail className="w-3 h-3" /> {c.email}
                     </div>
                   )}
                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex -space-x-2">
                         {users.filter(u => u.classId === c.id).slice(0,5).map(u => (
                            <UserAvatar key={u.id} user={u} size="sm" className="ring-2 ring-white dark:ring-slate-900" />
                         ))}
                         {users.filter(u => u.classId === c.id).length > 5 && (
                           <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-900">
                             +{users.filter(u => u.classId === c.id).length - 5}
                           </div>
                         )}
                      </div>
                      <span className="text-xs font-bold text-slate-400">{users.filter(u => u.classId === c.id).length} Membres</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Content: Logs */}
      {activeTab === 'logs' && (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end md:items-center flex-wrap">
               {/* Filters UI... */}
               <div className="flex-1 w-full md:w-auto">
                 <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Recherche</label>
                 <div className="relative">
                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                   <input type="text" placeholder="Action, détails..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-white" />
                 </div>
               </div>
               <div className="w-full md:w-auto">
                 <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Sévérité</label>
                 <select value={logSeverity} onChange={e => setLogSeverity(e.target.value)} className="w-full md:w-32 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-white">
                   <option value="ALL">Tout</option>
                   <option value="INFO">Info</option>
                   <option value="WARNING">Warning</option>
                   <option value="CRITICAL">Critical</option>
                 </select>
               </div>
               <div className="w-full md:w-auto">
                 <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Auteur</label>
                 <select value={logAuthor} onChange={e => setLogAuthor(e.target.value)} className="w-full md:w-40 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-white">
                   <option value="ALL">Tous les auteurs</option>
                   {uniqueLogAuthors.map(author => (
                     <option key={author} value={author}>{author}</option>
                   ))}
                 </select>
               </div>
               <div className="w-full md:w-auto flex gap-2">
                 <div>
                   <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Du</label>
                   <input type="date" value={logStartDate} onChange={e => setLogStartDate(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-white" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Au</label>
                   <input type="date" value={logEndDate} onChange={e => setLogEndDate(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-white" />
                 </div>
               </div>
               <div className="flex items-end gap-2">
                 <button onClick={() => setFilterUnread(!filterUnread)} className={`p-2.5 rounded-xl transition border text-sm font-bold flex items-center gap-2 ${filterUnread ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500'}`} title="Afficher uniquement les nouveaux logs">
                   <div className={`w-2.5 h-2.5 rounded-full ${filterUnread ? 'bg-sky-500' : 'bg-slate-300'}`}></div> Nouveaux
                 </button>
                 <button onClick={markAllLogsAsRead} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition flex items-center gap-2 text-sm font-bold" title="Marquer tous comme lus"><CheckCircle className="w-4 h-4" /></button>
                 <button onClick={clearLogFilters} className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition" title="Effacer les filtres"><X className="w-4 h-4" /></button>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-xs font-bold text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Auteur</th>
                        <th className="px-6 py-4">Détails</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLogs.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center">Aucun log ne correspond aux critères.</td></tr>
                      ) : (
                        filteredLogs.map(log => {
                          const isNew = new Date(log.timestamp).getTime() > new Date(lastReadLogTime).getTime();
                          return (
                            <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${isNew ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {isNew && <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" title="Nouveau log"></div>}
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : log.severity === 'WARNING' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{log.action}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{log.author}</td>
                                <td className="px-6 py-4">{log.details}</td>
                                <td className="px-6 py-4 text-xs font-mono">{format(new Date(log.timestamp), 'dd/MM HH:mm')}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
         </div>
      )}

      {/* Content: Emails */}
      {activeTab === 'emails' && (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             {isAdmin && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><Server className="w-24 h-24 text-indigo-600" /></div>
                   <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-indigo-600" /><h3 className="font-bold text-lg text-slate-800 dark:text-white">Configuration d'envoi</h3></div>
                    <form onSubmit={saveEmailConfig} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="col-span-1">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Fournisseur</label>
                            <select value={emailProvider} onChange={e => setEmailProvider(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500 dark:text-white">
                                <option value="MAILTO">Client Mail (Défaut)</option>
                                <option value="SENDGRID">SendGrid (Edge Function)</option>
                            </select>
                        </div>
                        {emailProvider === 'SENDGRID' && (
                            <>
                              <div className="col-span-1"><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Email Expéditeur</label><input type="email" value={sgSender} onChange={e => setSgSender(e.target.value)} placeholder="no-reply@ecole.com" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 dark:text-white" /></div>
                              <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                  <p className="font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1"><Info className="w-3 h-3"/> Guide de Déploiement</p>
                                  Le code serveur a été généré dans <code>supabase/functions/send-email/index.ts</code>.<br/>
                                  <div className="mt-2 bg-slate-800 text-slate-200 p-2 rounded-lg font-mono text-[10px] overflow-x-auto whitespace-nowrap flex items-center gap-2"><Terminal className="w-3 h-3" /> npx supabase functions deploy send-email --no-verify-jwt</div>
                              </div>
                            </>
                        )}
                        <div className="col-span-1 flex gap-2 w-full"><button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition">Enregistrer</button></div>
                    </form>
                   </div>
                </div>
             )}

             <div className="flex justify-end">
                <button onClick={handleTestEmail} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2"><Send className="w-4 h-4" /> Tester l'envoi</button>
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-xs font-bold text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Sujet</th>
                        <th className="px-6 py-4">Destinataire</th>
                        <th className="px-6 py-4">Envoyé par</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sentEmails.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center">Aucun email envoyé pour le moment.</td></tr>
                      ) : sentEmails.map(email => (
                        <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 text-xs font-bold uppercase">{email.resource_type}</td>
                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{email.subject.substring(0, 30)}...</td>
                            <td className="px-6 py-4 text-xs">{email.recipient_email}</td>
                            <td className="px-6 py-4">{email.sender_name}</td>
                            <td className="px-6 py-4"><button onClick={() => resendEmail(email)} className="text-sky-600 hover:underline text-xs font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Renvoyer</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
         </div>
      )}

      {/* --- CREATE / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-wide">{activeTab === 'classes' ? (editingId ? 'Modifier la Classe' : 'Nouvelle Classe') : (editingId ? 'Modifier Utilisateur' : 'Nouvel Utilisateur')}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                 {activeTab === 'classes' ? (
                   <form onSubmit={handleCreateClass} className="space-y-4">
                      {/* Fields... */}
                      <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nom de la classe</label><input required value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" placeholder="Ex: Licence 3 Gestion" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Description</label><input value={classDesc} onChange={e => setClassDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Email (Mailing List)</label><input type="email" value={classEmail} onChange={e => setClassEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" placeholder="l3-gestion@ecole.com" /></div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition mt-4">Sauvegarder</button>
                   </form>
                 ) : (
                   <form onSubmit={handleCreateUser} className="space-y-4">
                      {/* Fields... */}
                      <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nom complet</label><input required value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Email</label><input required type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" /></div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Rôle</label>
                        <select value={userRole} onChange={e => setUserRole(e.target.value as Role)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" disabled={!isAdmin}><option value={Role.STUDENT}>Étudiant</option><option value={Role.RESPONSIBLE}>Responsable</option>{isAdmin && <option value={Role.ADMIN}>Administrateur</option>}</select>
                        {!isAdmin && <p className="text-[10px] text-slate-400 mt-1">Verrouillé sur Étudiant.</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Classe</label>
                        <select value={userClassId} onChange={e => setUserClassId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-indigo-500 dark:text-white" disabled={!isAdmin}><option value="">-- Aucune --</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        {!isAdmin && <p className="text-[10px] text-slate-400 mt-1">Verrouillé sur votre classe.</p>}
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition mt-4">Sauvegarder</button>
                   </form>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Êtes-vous sûr ?</h3>
              <p className="text-slate-500 mb-6">Vous allez supprimer <strong>{deleteConfirmation.name}</strong>. Cette action est irréversible.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteConfirmation(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
                 <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20">Supprimer</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
