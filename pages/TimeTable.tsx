
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Role, TimeTable as TimeTableType, Course } from '../types';
import { FileSpreadsheet, Upload, Trash2, Download, Eye, Plus, Calendar as CalendarIcon, AlertTriangle, Check, X, History, Clock, MapPin, Grid, List, Bell, User, Loader2, Pencil } from 'lucide-react';
import { format, startOfWeek, isBefore, isAfter, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TimeTable: React.FC = () => {
  const { user, timeTables, addTimeTable, deleteTimeTable, courses, addCourse, updateCourse, deleteCourse, exams, meets, reminderSettings, updateReminderSettings, addNotification } = useApp();
  
  // --- STATES ---
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [dragActive, setDragActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Calendar Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERMISSIONS ---
  const canManage = user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN;
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

  // Helper to calculate position style
  const getEventStyle = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    // 1 hour = 80px
    const HOUR_HEIGHT = 80;
    const START_OFFSET = 8; // 08:00

    const top = ((startH - START_OFFSET) * 60 + startM) * (HOUR_HEIGHT / 60);
    const duration = ((endH * 60 + endM) - (startH * 60 + startM));
    const height = duration * (HOUR_HEIGHT / 60);
    
    return {
        top: `${top}px`,
        height: `${height}px`
    };
  };

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

    // 2. Exams
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

    return [...dayCourses, ...dayExams, ...dayMeets];
  };

  // --- HANDLERS ---
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setDragActive(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!dragActive) setDragActive(true); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) prepareFileUpload(e.dataTransfer.files[0]); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) prepareFileUpload(e.target.files[0]); };

  const prepareFileUpload = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      addNotification("Seuls les fichiers Excel (.xlsx, .xls) sont autorisés.", "ERROR");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addNotification("Le fichier dépasse la limite de 10 Mo.", "ERROR");
      return;
    }
    setPendingFile(file);
    setUploadProgress(0);
  };

  const confirmUpload = () => {
    if (!pendingFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
        setUploadProgress(prev => {
            if (prev >= 90) { clearInterval(interval); return 90; }
            return prev + 10;
        });
    }, 100);

    const reader = new FileReader();
    reader.onload = async () => {
      setUploadProgress(100);
      clearInterval(interval);
      setTimeout(async () => {
        const base64 = reader.result as string;
        const title = pendingFile.name.replace(/\.[^/.]+$/, "");
        await addTimeTable({ title: title, fileUrl: base64, fileName: pendingFile.name });
        setIsUploading(false);
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 500);
    };
    reader.readAsDataURL(pendingFile);
  };

  const confirmDelete = () => { if (deleteId) { deleteTimeTable(deleteId); setDeleteId(null); } };
  const handleDownload = (item: TimeTableType) => {
    addNotification(`Téléchargement de "${item.title}" lancé...`, "INFO");
    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCourseModal = (mode: 'CREATE' | 'EDIT', course?: any) => {
    if (mode === 'EDIT' && course) {
      setEditingCourseId(course.id);
      setCourseSubject(course.title);
      setCourseTeacher(course.teacher);
      setCourseRoom(course.subtitle); // Assuming subtitle is room for display, checking raw object is safer but `getEventsForDay` maps it
      // Better to use raw object if available
      if (course.raw) {
          setCourseSubject(course.raw.subject);
          setCourseTeacher(course.raw.teacher);
          setCourseRoom(course.raw.room);
          setCourseDay(course.raw.dayOfWeek);
          setCourseStart(course.raw.startTime);
          setCourseEnd(course.raw.endTime);
          setCourseColor(course.raw.color);
      }
    } else {
      setEditingCourseId(null);
      setCourseSubject('');
      setCourseTeacher('');
      setCourseRoom('');
      setCourseDay(1);
      setCourseStart('08:00');
      setCourseEnd('10:00');
      setCourseColor('bg-blue-100 border-blue-200 text-blue-800');
    }
    setIsCourseModalOpen(true);
  };

  const handleAddOrUpdateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (courseStart >= courseEnd) { addNotification("L'heure de fin doit être après l'heure de début.", "WARNING"); return; }
    
    const payload = {
        subject: courseSubject, teacher: courseTeacher, room: courseRoom,
        dayOfWeek: Number(courseDay), startTime: courseStart, endTime: courseEnd, color: courseColor
    };

    if (editingCourseId) {
        updateCourse(editingCourseId, payload);
    } else {
        addCourse(payload);
    }
    
    setIsCourseModalOpen(false);
  };

  const confirmDeleteCourse = () => { 
      if (deleteCourseId) { 
          deleteCourse(deleteCourseId); 
          setDeleteCourseId(null);
          // If we are in the edit modal and click delete, close modal too
          if (isCourseModalOpen) setIsCourseModalOpen(false);
      } 
  };
  
  const handleSaveReminders = () => { updateReminderSettings(localSettings); setIsReminderModalOpen(false); };
  const getDurationString = () => {
      if (!courseStart || !courseEnd) return null;
      const [sh, sm] = courseStart.split(':').map(Number);
      const [eh, em] = courseEnd.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff <= 0) return null;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m > 0 ? `${m}min` : ''}`;
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
                <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${viewMode === 'LIST' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                    <List className="w-4 h-4" /> Fichiers
                </button>
                <button onClick={() => setViewMode('CALENDAR')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${viewMode === 'CALENDAR' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Grid className="w-4 h-4" /> Interactif
                </button>
            </div>
            <button onClick={() => setIsReminderModalOpen(true)} className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition" title="Rappels">
                <Bell className="w-5 h-5" />
            </button>
            {canManage && viewMode === 'CALENDAR' && (
                <button onClick={() => openCourseModal('CREATE')} className="btn-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition">
                    <Plus className="w-5 h-5" /> Cours
                </button>
            )}
        </div>
      </div>

      {/* --- LIST MODE (Files) --- */}
      {viewMode === 'LIST' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
            {canManage && (
                <div 
                    className={`mb-8 border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer relative group ${dragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/10 scale-[1.01] shadow-xl' : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                    onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                >
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleChange} accept=".xlsx, .xls" />
                    <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform ${dragActive ? 'bg-sky-500 text-white scale-110' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 group-hover:scale-110'}`}><Upload className="w-8 h-8" /></div>
                        <div>
                            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{dragActive ? "Déposez le fichier ici !" : "Cliquez ou déposez votre emploi du temps ici"}</p>
                            <p className="text-sm text-slate-400 mt-1 font-medium">Format Excel (.xlsx) uniquement - Max 10 Mo</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-700 dark:text-white flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Historique des versions</h3>
                <button onClick={() => setShowHistory(!showHistory)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${showHistory ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-slate-500 border-slate-200'}`}>{showHistory ? 'Masquer anciens' : 'Voir anciens'}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedTimeTables.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Aucun fichier disponible.</p>
                        {canManage && <p className="text-xs text-sky-500 mt-2">Glissez un fichier ci-dessus pour commencer.</p>}
                    </div>
                )}
                {displayedTimeTables.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex items-center justify-between group">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0"><FileSpreadsheet className="w-6 h-6" /></div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> Ajouté le {format(new Date(item.dateAdded), "d MMM yyyy à HH:mm", { locale: fr })}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleDownload(item)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition" title="Télécharger"><Download className="w-5 h-5" /></button>
                            {(user?.id === item.authorId || isAdmin) && <button onClick={() => setDeleteId(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Supprimer"><Trash2 className="w-5 h-5" /></button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- CALENDAR MODE --- */}
      {viewMode === 'CALENDAR' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <div className="p-4 text-center font-bold text-slate-400 text-xs uppercase tracking-wider border-r border-slate-200 dark:border-slate-800">Heure</div>
                        {weekDays.map((d) => <div key={d.day} className="p-4 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0">{d.label}</div>)}
                    </div>
                    <div className="grid grid-cols-7 relative">
                        <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            {hours.map((h) => <div key={h} className="h-20 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 flex items-start justify-center pt-2">{h}:00</div>)}
                        </div>
                        {weekDays.map((d) => (
                            <div key={d.day} className="border-r border-slate-100 dark:border-slate-800 relative last:border-r-0">
                                {hours.map((h) => <div key={h} className="h-20 border-b border-slate-50 dark:border-slate-800/50" />)}
                                {getEventsForDay(d.day).map((event) => (
                                    <div 
                                        key={`${event.type}-${event.id}`}
                                        className={`absolute inset-x-1 rounded-lg p-2 text-xs border shadow-sm cursor-pointer hover:brightness-95 transition hover:scale-[1.02] hover:z-10 flex flex-col overflow-hidden ${event.color}`}
                                        style={{ ...getEventStyle(event.start, event.end), zIndex: 5 }}
                                        onClick={() => { if (event.type === 'COURSE' && canManage) { openCourseModal('EDIT', event); } }}
                                        title={`${event.title} (${event.start} - ${event.end})`}
                                    >
                                        <div className="font-bold truncate">{event.title}</div>
                                        <div className="opacity-80 truncate text-[10px] flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {event.start}-{event.end}</div>
                                        <div className="opacity-80 truncate text-[10px] mt-auto">
                                            {event.teacher && <span className="block font-medium">{event.teacher}</span>}
                                            {event.subtitle && <span className="block italic">{event.subtitle}</span>}
                                        </div>
                                        {event.type === 'COURSE' && canManage && <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"><Pencil className="w-3 h-3" /></div>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODALS (Upload, Delete, Course, Reminder) --- */}
      {pendingFile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Confirmer l'envoi</h3>
                <p className="text-slate-500 text-sm mb-4">Voulez-vous ajouter <strong>{pendingFile.name}</strong> ?</p>
                {isUploading ? (
                    <div className="w-full">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>Envoi en cours...</span><span>{uploadProgress}%</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-center text-xs text-slate-400 mt-2 animate-pulse">Veuillez patienter...</p>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Annuler</button>
                        <button onClick={confirmUpload} className="flex-1 py-2.5 rounded-xl font-bold bg-sky-500 text-white hover:bg-sky-600 flex justify-center items-center gap-2">Confirmer</button>
                    </div>
                )}
            </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6" /></div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Supprimer ce fichier ?</h3>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Non</button>
                    <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600">Oui, supprimer</button>
                </div>
            </div>
        </div>
      )}
      {deleteCourseId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Retirer ce cours ?</h3>
                <p className="text-sm text-slate-500">Cette action le retirera de l'emploi du temps interactif.</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setDeleteCourseId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Annuler</button>
                    <button onClick={confirmDeleteCourse} className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600">Retirer</button>
                </div>
            </div>
        </div>
      )}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingCourseId ? 'Modifier le cours' : 'Ajouter un cours'}</h3>
                    <div className="flex gap-2">
                        {editingCourseId && <button onClick={() => setDeleteCourseId(editingCourseId)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500" title="Supprimer"><Trash2 className="w-5 h-5" /></button>}
                        <button onClick={() => setIsCourseModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
                    </div>
                </div>
                <form onSubmit={handleAddOrUpdateCourse} className="p-6 overflow-y-auto space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matière</label><input required value={courseSubject} onChange={e => setCourseSubject(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20" placeholder="Ex: Algorithmique" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Enseignant</label><input value={courseTeacher} onChange={e => setCourseTeacher(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20" placeholder="M. Diop" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salle</label><input value={courseRoom} onChange={e => setCourseRoom(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20" placeholder="S304" /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jour</label><select value={courseDay} onChange={e => setCourseDay(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20">{weekDays.map(d => <option key={d.day} value={d.day}>{d.label}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Début</label><input type="time" required value={courseStart} onChange={e => setCourseStart(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fin</label><input type="time" required value={courseEnd} onChange={e => setCourseEnd(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20" /></div>
                    </div>
                    {getDurationString() && <div className="text-xs font-bold text-sky-600 dark:text-sky-400 text-center bg-sky-50 dark:bg-sky-900/20 py-2 rounded-lg border border-sky-100 dark:border-sky-900/30">Durée : {getDurationString()}</div>}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur</label>
                        <div className="flex gap-2">
                            {[{ class: 'bg-blue-100 border-blue-200 text-blue-800', label: 'Bleu' }, { class: 'bg-green-100 border-green-200 text-green-800', label: 'Vert' }, { class: 'bg-purple-100 border-purple-200 text-purple-800', label: 'Violet' }, { class: 'bg-orange-100 border-orange-200 text-orange-800', label: 'Orange' }].map((c) => (
                                <button key={c.label} type="button" onClick={() => setCourseColor(c.class)} className={`w-8 h-8 rounded-full border-2 ${c.class.split(' ')[0]} ${courseColor === c.class ? 'ring-2 ring-offset-2 ring-slate-400 border-white' : 'border-transparent'}`} title={c.label} />
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full btn-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-sky-500/20 hover:scale-[1.02] transition">{editingCourseId ? 'Mettre à jour' : 'Ajouter au planning'}</button>
                </form>
            </div>
        </div>
      )}
      {isReminderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Bell className="w-5 h-5 text-sky-500"/> Rappels</h3><button onClick={() => setIsReminderModalOpen(false)}><X className="w-5 h-5 text-slate-400"/></button></div>
                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Activer les rappels</span>
                          <button onClick={() => setLocalSettings({...localSettings, enabled: !localSettings.enabled})} className={`w-12 h-6 rounded-full p-1 transition ${localSettings.enabled ? 'bg-sky-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full transition transform ${localSettings.enabled ? 'translate-x-6' : ''}`} /></button>
                      </div>
                      {localSettings.enabled && (
                          <>
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1">Rappel Cours (minutes avant)</label><input type="number" value={localSettings.courseDelay} onChange={e => setLocalSettings({...localSettings, courseDelay: Number(e.target.value)})} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1">Rappel Examens (minutes avant)</label><input type="number" value={localSettings.examDelay} onChange={e => setLocalSettings({...localSettings, examDelay: Number(e.target.value)})} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" /></div>
                          </>
                      )}
                      <button onClick={handleSaveReminders} className="w-full py-2 bg-slate-800 text-white rounded-xl font-bold mt-4">Enregistrer</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
