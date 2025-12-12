import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Role, TimeTable as TimeTableType, Course } from '../types';
import { FileSpreadsheet, Upload, Trash2, Download, Eye, Plus, Calendar as CalendarIcon, AlertTriangle, Check, X, History, Clock, MapPin, Grid, List, Bell } from 'lucide-react';
import { format, startOfWeek, isBefore, isAfter, getDay, addDays, getHours, getMinutes, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TimeTable: React.FC = () => {
  const { user, timeTables, addTimeTable, deleteTimeTable, users, addNotification, courses, addCourse, deleteCourse, exams, meets, reminderSettings, updateReminderSettings } = useApp();
  
  // --- STATES ---
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Calendar Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseSubject, setCourseSubject] = useState('');
  const [courseTeacher, setCourseTeacher] = useState('');
  const [courseRoom, setCourseRoom] = useState('');
  const [courseDay, setCourseDay] = useState(1); // 1 = Lundi
  const [courseStart, setCourseStart] = useState('08:00');
  const [courseEnd, setCourseEnd] = useState('10:00');
  const [courseColor, setCourseColor] = useState('bg-blue-100 border-blue-200 text-blue-800');

  // Reminder Modal State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(reminderSettings);

  // Confirmation States
  const [pendingFile, setPendingFile] = useState<File | null>(null); // Pour confirmer l'upload
  const [deleteId, setDeleteId] = useState<string | null>(null); // Pour confirmer la suppression fichier
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null); // Pour confirmer suppression cours

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERMISSIONS ---
  const canManage = user?.role === Role.RESPONSIBLE;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTERING LOGIC (FILES) ---
  const myTimeTables = isAdmin ? timeTables : timeTables.filter(t => t.classId === user?.classId);

  const displayedTimeTables = useMemo(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

    return myTimeTables.filter(t => {
      if (showHistory) return true;
      const itemDate = new Date(t.dateAdded);
      return isAfter(itemDate, startOfCurrentWeek) || itemDate.getTime() >= startOfCurrentWeek.getTime();
    }).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [myTimeTables, showHistory]);

  // --- CALENDAR LOGIC ---
  const weekDays = [
    { day: 1, label: 'Lundi' },
    { day: 2, label: 'Mardi' },
    { day: 3, label: 'Mercredi' },
    { day: 4, label: 'Jeudi' },
    { day: 5, label: 'Vendredi' },
    { day: 6, label: 'Samedi' },
  ];
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 to 18:00

  // Filter Calendar Data
  const myCourses = isAdmin ? courses : courses.filter(c => c.classId === user?.classId);
  const myExams = isAdmin ? exams : exams.filter(e => e.classId === user?.classId);
  const myMeets = isAdmin ? meets : meets.filter(m => m.classId === user?.classId);

  // Merge events for display
  const getEventsForDay = (dayIndex: number) => {
    // 1. Regular Courses
    const dayCourses = myCourses.filter(c => c.dayOfWeek === dayIndex).map(c => ({
        id: c.id,
        title: c.subject,
        subtitle: c.room,
        teacher: c.teacher,
        start: c.startTime,
        end: c.endTime,
        type: 'COURSE',
        color: c.color,
        raw: c
    }));

    // 2. Exams (Check if exam date corresponds to this day of THIS WEEK)
    const today = new Date();
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 });
    const targetDate = addDays(startOfWeekDate, dayIndex - 1);
    
    const dayExams = myExams.filter(e => {
        const eDate = new Date(e.date);
        return eDate.getDate() === targetDate.getDate() && 
               eDate.getMonth() === targetDate.getMonth() && 
               eDate.getFullYear() === targetDate.getFullYear();
    }).map(e => {
        const startDate = new Date(e.date);
        const endDate = new Date(startDate.getTime() + e.durationMinutes * 60000);
        return {
            id: e.id,
            title: `EXAMEN: ${e.subject}`,
            subtitle: e.room,
            teacher: 'Surveillant',
            start: format(startDate, 'HH:mm'),
            end: format(endDate, 'HH:mm'),
            type: 'EXAM',
            color: 'bg-red-100 border-red-200 text-red-800 animate-pulse',
            raw: e
        };
    });

    // 3. Meets
    const dayMeets = myMeets.filter(m => {
        const mDate = new Date(m.date);
        return mDate.getDate() === targetDate.getDate() && 
               mDate.getMonth() === targetDate.getMonth() && 
               mDate.getFullYear() === targetDate.getFullYear();
    }).map(m => {
        const startDate = new Date(m.date);
        const endDate = new Date(startDate.getTime() + 60 * 60000); // Assume 1h
        return {
            id: m.id,
            title: `VISIO: ${m.subject}`,
            subtitle: 'En ligne',
            teacher: m.teacherName,
            start: format(startDate, 'HH:mm'),
            end: format(endDate, 'HH:mm'),
            type: 'MEET',
            color: 'bg-emerald-100 border-emerald-200 text-emerald-800',
            raw: m
        };
    });

    return [...dayCourses, ...dayExams, ...dayMeets].sort((a,b) => a.start.localeCompare(b.start));
  };

  // Helper to position events
  const getEventStyle = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const startMinutes = (startH - 8) * 60 + startM;
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    
    // 1 hour = 60px height (approx)
    const top = (startMinutes / 60) * 100; // in % of cell height? No, absolute pixels better
    const height = (durationMinutes / 60) * 100; // relative to 1 hour slot
    
    return {
        top: `${startMinutes}px`, // 1min = 1px for simplicity? No, let's use rem/px
        height: `${durationMinutes}px`
    };
  };

  // --- HANDLERS ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      prepareFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      prepareFileUpload(e.target.files[0]);
    }
  };

  const prepareFileUpload = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      addNotification("Seuls les fichiers Excel (.xlsx, .xls) sont autorisés.", "ERROR");
      return;
    }
    setPendingFile(file);
  };

  const confirmUpload = () => {
    if (!pendingFile) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const title = pendingFile.name.replace(/\.[^/.]+$/, "");
      addTimeTable({ title: title, fileUrl: base64, fileName: pendingFile.name });
      setIsUploading(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(pendingFile);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTimeTable(deleteId);
      setDeleteId(null);
    }
  };

  const handleDownload = (item: TimeTableType) => {
    addNotification(`Téléchargement de "${item.title}" lancé...`, "INFO");
    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (item: TimeTableType) => {
    addNotification("Préparation de l'aperçu...", "INFO");
    handleDownload(item);
  };

  // Calendar Event Handlers
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    addCourse({
        subject: courseSubject,
        teacher: courseTeacher,
        room: courseRoom,
        dayOfWeek: courseDay,
        startTime: courseStart,
        endTime: courseEnd,
        color: courseColor
    });
    setIsCourseModalOpen(false);
    // Reset form
    setCourseSubject('');
    setCourseRoom('');
  };

  const confirmDeleteCourse = () => {
      if (deleteCourseId) {
          deleteCourse(deleteCourseId);
          setDeleteCourseId(null);
      }
  };

  const handleSaveReminders = () => {
    updateReminderSettings(localSettings);
    setIsReminderModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-0 animate-in fade-in duration-500 relative pb-20">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 p-2 rounded-2xl text-sky-600"><FileSpreadsheet className="w-8 h-8" /></span>
            Emploi du Temps
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Planning hebdomadaire des cours.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${viewMode === 'LIST' ? 'bg-sky-50 text-sky-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <List className="w-4 h-4" /> Fichiers
                </button>
                <button 
                    onClick={() => setViewMode('CALENDAR')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${viewMode === 'CALENDAR' ? 'bg-sky-50 text-sky-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <Grid className="w-4 h-4" /> Calendrier
                </button>
            </div>

            {/* Notification Button */}
            <button 
                onClick={() => { setLocalSettings(reminderSettings); setIsReminderModalOpen(true); }}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center ${reminderSettings.enabled ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                title="Configurer les rappels"
            >
                <Bell className="w-5 h-5" />
            </button>

            {viewMode === 'LIST' && (
                <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition border ${showHistory ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
                >
                <History className="w-4 h-4" /> {showHistory ? 'Masquer historique' : 'Historique'}
                </button>
            )}

            {viewMode === 'CALENDAR' && canManage && (
                <button 
                    onClick={() => setIsCourseModalOpen(true)}
                    className="px-4 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:bg-sky-700 transition"
                >
                    <Plus className="w-4 h-4" /> Ajouter Cours
                </button>
            )}
        </div>
      </div>

      {/* --- LIST VIEW --- */}
      {viewMode === 'LIST' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Zone de dépôt */}
            {canManage && (
            <div className="lg:col-span-1">
                <div 
                className={`
                    bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed p-8 text-center transition-all duration-300 flex flex-col items-center justify-center h-full min-h-[300px]
                    ${dragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-sky-400'}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                >
                <div className="w-20 h-20 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-6 text-sky-600">
                    <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Nouvel Emploi du Temps</h3>
                <p className="text-slate-500 text-sm mb-6">Glissez le fichier Excel de la semaine ici.</p>
                
                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls" onChange={handleChange} />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-sky-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                    {isUploading ? 'Traitement...' : <><Plus className="w-5 h-5" /> Sélectionner</>}
                </button>
                <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-wide">Format : .xlsx</p>
                </div>
            </div>
            )}

            {/* Liste des fichiers */}
            <div className={canManage ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    {showHistory ? 'Tous les fichiers' : 'Semaine en cours'}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    {displayedTimeTables.length} fichier(s)
                    </span>
                </div>

                {displayedTimeTables.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-slate-200 dark:border-slate-800">
                    <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 font-medium text-lg">Aucun emploi du temps pour cette semaine.</p>
                    {!showHistory && <p className="text-sm text-slate-400 mt-2">Cliquez sur "Historique" pour voir les anciens.</p>}
                </div>
                ) : (
                displayedTimeTables.map((item) => {
                    const author = users.find(u => u.id === item.authorId);
                    const isOld = isBefore(new Date(item.dateAdded), startOfWeek(new Date(), { weekStartsOn: 1 }));

                    return (
                    <div key={item.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm hover:shadow-md transition group flex flex-col md:flex-row items-start md:items-center gap-4 ${isOld ? 'border-amber-200 dark:border-amber-900/30 opacity-80' : 'border-slate-200 dark:border-slate-800'}`}>
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${isOld ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                            <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{item.title}</h3>
                                {isOld && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Passé</span>}
                            </div>
                            <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" /> Ajouté le {format(new Date(item.dateAdded), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">Par {author?.name || 'Admin'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                            <button onClick={() => handleDownload(item)} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> <span className="md:hidden lg:inline">Télécharger</span></button>
                            <button onClick={() => handlePreview(item)} className="flex-1 md:flex-none px-4 py-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 font-bold rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/30 transition flex items-center justify-center gap-2 text-sm border border-sky-100 dark:border-sky-800"><Eye className="w-4 h-4" /> <span className="md:hidden lg:inline">Consulter</span></button>
                            {canManage && <button onClick={() => setDeleteId(item.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition border border-transparent hover:border-red-100 dark:hover:border-red-900/30" title="Supprimer"><Trash2 className="w-5 h-5" /></button>}
                        </div>
                    </div>
                    );
                })
                )}
            </div>
            </div>
        </div>
      )}

      {/* --- CALENDAR VIEW --- */}
      {viewMode === 'CALENDAR' && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
              <div className="min-w-[800px] p-6">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="text-center font-bold text-slate-400 text-xs uppercase tracking-wider py-2">Heure</div>
                      {weekDays.map(d => (
                          <div key={d.day} className="text-center font-bold text-slate-800 dark:text-white uppercase text-sm py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl mx-1">
                              {d.label}
                          </div>
                      ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="relative grid grid-cols-7 gap-0">
                      {/* Time Column */}
                      <div className="flex flex-col">
                          {hours.map(h => (
                              <div key={h} className="h-[60px] text-xs font-bold text-slate-400 text-center -mt-2">
                                  {h}:00
                              </div>
                          ))}
                      </div>

                      {/* Days Columns */}
                      {weekDays.map(d => {
                          const events = getEventsForDay(d.day);
                          return (
                              <div key={d.day} className="relative border-l border-slate-100 dark:border-slate-800 min-h-[660px]">
                                  {/* Grid Lines */}
                                  {hours.map(h => (
                                      <div key={h} className="absolute w-full border-t border-slate-50 dark:border-slate-800/50 h-[60px]" style={{ top: `${(h-8)*60}px` }}></div>
                                  ))}

                                  {/* Events */}
                                  {events.map((evt, idx) => {
                                      const style = getEventStyle(evt.start, evt.end);
                                      const isCourse = evt.type === 'COURSE';
                                      return (
                                          <div 
                                            key={`${evt.id}-${idx}`}
                                            className={`absolute left-1 right-1 rounded-lg p-2 text-xs border overflow-hidden shadow-sm hover:z-10 hover:shadow-md transition cursor-pointer group ${evt.color} ${!isCourse ? 'z-20' : 'z-10'}`}
                                            style={{ top: style.top, height: style.height }}
                                            onClick={() => isCourse && canManage ? setDeleteCourseId(evt.id) : null}
                                          >
                                              <div className="font-bold truncate">{evt.title}</div>
                                              <div className="flex items-center gap-1 opacity-80 truncate text-[10px]">
                                                  <MapPin className="w-3 h-3" /> {evt.subtitle}
                                              </div>
                                              <div className="opacity-70 mt-1 truncate font-medium">{evt.teacher}</div>
                                              
                                              {isCourse && canManage && (
                                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                                                      <div className="bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3"/></div>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* --- CONFIRMATION MODALS --- */}
      {pendingFile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4"><Upload className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Confirmer l'envoi ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Publier pour la classe :</p>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-mono text-sm mb-6 text-slate-700 dark:text-slate-300 break-all border border-slate-100 dark:border-slate-700">{pendingFile.name}</div>
              <div className="flex gap-3">
                 <button onClick={() => { setPendingFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={confirmUpload} disabled={isUploading} className="flex-1 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2">{isUploading ? 'Envoi...' : <><Check className="w-4 h-4" /> Publier</>}</button>
              </div>
           </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer ce fichier ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Action irréversible.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20">Supprimer</button>
              </div>
           </div>
        </div>
      )}

      {/* --- ADD COURSE MODAL --- */}
      {isCourseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Ajouter un cours</h3>
                      <button onClick={() => setIsCourseModalOpen(false)}><X className="w-5 h-5 text-slate-400"/></button>
                  </div>
                  <form onSubmit={handleAddCourse} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Matière</label>
                          <input required value={courseSubject} onChange={e => setCourseSubject(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500/20 dark:text-white" placeholder="Ex: Mathématiques" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Salle</label>
                              <input required value={courseRoom} onChange={e => setCourseRoom(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white" placeholder="S. 102" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Professeur</label>
                              <input value={courseTeacher} onChange={e => setCourseTeacher(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white" placeholder="M. Ndiaye" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Jour</label>
                          <select value={courseDay} onChange={e => setCourseDay(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white">
                              {weekDays.map(d => <option key={d.day} value={d.day}>{d.label}</option>)}
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Début</label>
                              <input type="time" required value={courseStart} onChange={e => setCourseStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fin</label>
                              <input type="time" required value={courseEnd} onChange={e => setCourseEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Couleur</label>
                          <div className="flex gap-2">
                              {['bg-blue-100 border-blue-200 text-blue-800', 'bg-green-100 border-green-200 text-green-800', 'bg-purple-100 border-purple-200 text-purple-800', 'bg-orange-100 border-orange-200 text-orange-800'].map(color => (
                                  <button type="button" key={color} onClick={() => setCourseColor(color)} className={`w-8 h-8 rounded-full border-2 ${courseColor === color ? 'border-slate-600' : 'border-transparent'} ${color.split(' ')[0]}`}></button>
                              ))}
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 transition">Ajouter au calendrier</button>
                  </form>
              </div>
          </div>
      )}

      {/* --- REMINDER SETTINGS MODAL --- */}
      {isReminderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Bell className="w-5 h-5 text-sky-500" /> Notifications
                      </h3>
                      <button onClick={() => setIsReminderModalOpen(false)}><X className="w-5 h-5 text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Activer les rappels</span>
                          <button 
                              onClick={() => setLocalSettings({...localSettings, enabled: !localSettings.enabled})}
                              className={`w-12 h-6 rounded-full p-1 transition duration-300 ease-in-out ${localSettings.enabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          >
                              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition duration-300 ${localSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                      </div>

                      <div className="space-y-4 opacity-100 transition-opacity duration-300" style={{ opacity: localSettings.enabled ? 1 : 0.5, pointerEvents: localSettings.enabled ? 'auto' : 'none' }}>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Rappel Cours</label>
                              <select 
                                  value={localSettings.courseDelay} 
                                  onChange={e => setLocalSettings({...localSettings, courseDelay: Number(e.target.value)})}
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white"
                              >
                                  <option value={5}>5 minutes avant</option>
                                  <option value={10}>10 minutes avant</option>
                                  <option value={15}>15 minutes avant</option>
                                  <option value={30}>30 minutes avant</option>
                                  <option value={60}>1 heure avant</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Rappel Examen</label>
                              <select 
                                  value={localSettings.examDelay} 
                                  onChange={e => setLocalSettings({...localSettings, examDelay: Number(e.target.value)})}
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white"
                              >
                                  <option value={60}>1 heure avant</option>
                                  <option value={120}>2 heures avant</option>
                                  <option value={60 * 24}>1 jour avant</option>
                                  <option value={60 * 48}>2 jours avant</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Rappel Visio</label>
                              <select 
                                  value={localSettings.meetDelay} 
                                  onChange={e => setLocalSettings({...localSettings, meetDelay: Number(e.target.value)})}
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none dark:text-white"
                              >
                                  <option value={5}>5 minutes avant</option>
                                  <option value={15}>15 minutes avant</option>
                                  <option value={30}>30 minutes avant</option>
                              </select>
                          </div>
                      </div>

                      <button onClick={handleSaveReminders} className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-500/20">
                          Enregistrer les préférences
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Course Confirmation */}
      {deleteCourseId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Retirer ce cours ?</h3>
                  <div className="flex gap-3 mt-4">
                      <button onClick={() => setDeleteCourseId(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold rounded-xl">Annuler</button>
                      <button onClick={confirmDeleteCourse} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl">Retirer</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};