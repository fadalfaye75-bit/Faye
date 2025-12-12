

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Exam } from '../types';
import { CalendarDays, Clock, MapPin, Trash2, Plus, Download, Pencil, AlertCircle, X, Send, Copy } from 'lucide-react';
import { format, isSameWeek, addMinutes, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

export const DS: React.FC = () => {
  const { user, exams, addExam, updateExam, deleteExam, shareResource, addNotification } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState(60);
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Création réservée au Responsable UNIQUEMENT. L'Admin supervise.
  const canCreate = user?.role === Role.RESPONSIBLE;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTER BY CLASS (Admin voit tout) ---
  const myExams = isAdmin ? exams : exams.filter(e => e.classId === user?.classId);

  // --- FILTRE AUTOMATIQUE : Masquer les examens passés ---
  const now = new Date();
  
  const [showHistory, setShowHistory] = useState(false);

  const displayedExams = myExams.filter(exam => {
    if (showHistory) return true;
    const examEnd = addMinutes(new Date(exam.date), exam.durationMinutes);
    return isAfter(examEnd, now);
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const openCreate = () => {
    setEditingId(null);
    setSubject('');
    setDate(new Date().toISOString().slice(0, 16));
    setDuration(60);
    setRoom('');
    setNotes('');
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const openEdit = (item: Exam) => {
    setEditingId(item.id);
    setSubject(item.subject);
    setDate(new Date(item.date).toISOString().slice(0, 16));
    setDuration(item.durationMinutes);
    setRoom(item.room);
    setNotes(item.notes || '');
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const handleCopy = (item: Exam) => {
      const text = `EXAMEN : ${item.subject.toUpperCase()}\nDate : ${format(new Date(item.date), 'EEEE dd/MM/yyyy à HH:mm', { locale: fr })}\nSalle : ${item.room}\nDurée : ${item.durationMinutes} min\n${item.notes ? `Notes : ${item.notes}` : ''}`;
      navigator.clipboard.writeText(text).then(() => {
          addNotification("Détails de l'examen copiés", "SUCCESS");
      }).catch(() => {
          addNotification("Erreur lors de la copie", "ERROR");
      });
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteExam(deleteId);
      setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      subject,
      date: new Date(date).toISOString(),
      durationMinutes: duration,
      room,
      notes,
    };
    if (editingId) {
      updateExam(editingId, payload);
    } else {
      addExam(payload, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    if (displayedExams.length === 0) return;
    const headers = ['Matière', 'Jour', 'Date', 'Heure', 'Durée (min)', 'Salle', 'Notes'];
    const rows = displayedExams.map(e => [
      e.subject, 
      format(new Date(e.date), 'EEEE', { locale: fr }), // Ajout de la colonne Jour
      format(new Date(e.date), 'dd/MM/yyyy'), 
      format(new Date(e.date), 'HH:mm'), 
      e.durationMinutes, 
      e.room, 
      e.notes || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sunuclasse_examens.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto px-0 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
             <span className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-2 rounded-xl text-red-600"><CalendarDays className="w-8 h-8" /></span>
             Examens
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Calendrier officiel des évaluations à venir.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
             onClick={() => setShowHistory(!showHistory)}
             className={`w-full md:w-auto flex-1 md:flex-none justify-center border px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-sm active:scale-95 ${showHistory ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
          >
             {showHistory ? 'Masquer historique' : 'Voir historique'}
          </button>

          {displayedExams.length > 0 && (
             <button
               onClick={handleExportCSV}
               className="w-full md:w-auto flex-1 md:flex-none justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3 md:px-6 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 shadow-sm active:scale-95"
             >
               <Download className="w-5 h-5" /> <span className="">Exporter</span>
             </button>
          )}

          {canCreate && (
            <button 
              onClick={openCreate}
              className="w-full md:w-auto flex-1 md:flex-none justify-center btn-primary text-white px-4 py-3 md:px-6 rounded-xl font-bold active:scale-95 transition flex items-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" /> <span>Planifier</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayedExams.length === 0 && (
             <div className="p-16 text-center text-slate-400 flex flex-col items-center">
               <CalendarDays className="w-16 h-16 opacity-20 text-slate-800 dark:text-white mb-4" />
               <p className="font-medium text-lg">Aucun examen à venir.</p>
             </div>
          )}
          {displayedExams.map((exam) => {
            const examDate = new Date(exam.date);
            const isThisWeek = isSameWeek(examDate, new Date());
            
            // PERMISSION : Seul le créateur (Responsable) voit les boutons
            const isAuthor = user?.id === exam.authorId;

            return (
              <div key={exam.id} className="p-5 md:p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex flex-col md:flex-row gap-6 md:items-center group">
                {/* Date Box */}
                <div className="flex items-center gap-4 md:block min-w-[100px]">
                  <div className={`
                    flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl border shrink-0
                    ${isThisWeek ? 'bg-sky-500 border-sky-600 text-white shadow-lg shadow-sky-500/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}
                  `}>
                     {/* Affichage du jour en entier (EEEE) au lieu de l'abréviation (EEE) */}
                     <span className={`text-[10px] md:text-xs font-bold uppercase leading-none mb-1 ${isThisWeek ? 'text-sky-100' : 'text-slate-400'}`}>{format(examDate, 'EEEE', { locale: fr })}</span>
                     <span className={`text-xs md:text-sm font-bold uppercase leading-none ${isThisWeek ? 'text-sky-100' : 'text-slate-400'}`}>{format(examDate, 'MMM', { locale: fr })}</span>
                     <span className="text-2xl md:text-4xl font-black leading-none mt-1">{format(examDate, 'd')}</span>
                  </div>
                  <div className="md:hidden">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1">{exam.subject}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 font-medium">
                       <span className="flex items-center gap-1 capitalize"><Clock className="w-4 h-4" /> {format(examDate, 'EEEE HH:mm', { locale: fr })}</span>
                       <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {exam.room}</span>
                    </div>
                  </div>
                </div>

                {/* Details Desktop */}
                <div className="flex-1 hidden md:block">
                   <div className="flex items-center gap-3 mb-2">
                     <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{exam.subject}</h3>
                     {isThisWeek && <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded font-bold flex items-center gap-1 uppercase tracking-wide"><AlertCircle className="w-3 h-3"/> Cette semaine</span>}
                   </div>
                   
                   <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 capitalize">
                        <Clock className="w-4 h-4 text-sky-500" />
                        {/* Format complet ici aussi */}
                        {format(examDate, 'EEEE HH:mm', { locale: fr })} • {exam.durationMinutes} min
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <MapPin className="w-4 h-4 text-sky-500" />
                        {exam.room}
                      </div>
                   </div>
                   {exam.notes && (
                     <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400 inline-block max-w-xl">
                        <span className="font-bold text-yellow-700 uppercase mr-1">Note:</span> {exam.notes}
                     </p>
                   )}
                </div>

                {/* Details Mobile Notes */}
                {exam.notes && (
                   <div className="md:hidden text-sm text-slate-600 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                      <span className="font-bold text-yellow-700 uppercase mr-1">Note:</span> {exam.notes}
                   </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-1 md:flex md:justify-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => handleCopy(exam)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-3 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition text-sm font-bold border border-slate-100"
                    >
                       <Copy className="w-4 h-4" /> <span className="md:hidden">Copier</span>
                    </button>

                    <button 
                      onClick={() => shareResource('EXAM', exam)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-3 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition text-sm font-bold border border-emerald-100"
                    >
                      <Send className="w-4 h-4" /> <span className="md:hidden">Partager</span>
                    </button>
                    
                    {isAuthor && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEdit(exam)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition text-sm font-bold"
                          style={{ color: '#87CEEB', backgroundColor: 'rgba(135, 206, 235, 0.1)' }}
                        >
                          <Pencil className="w-4 h-4" /> <span className="md:hidden">Modifier</span>
                        </button>
                        
                        <button 
                          onClick={() => setDeleteId(exam.id)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition text-sm font-bold border border-red-100"
                        >
                          <Trash2 className="w-4 h-4" /> <span className="md:hidden">Supprimer</span>
                        </button>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

       {isModalOpen && canCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                {editingId ? 'Modifier DS' : 'Programmer un DS'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 bg-white dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Matière / Sujet</label>
                  <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Date & Heure</label>
                    <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Durée (Min)</label>
                    <input required type="number" step="15" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Salle</label>
                  <input required type="text" value={room} onChange={e => setRoom(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Notes</label>
                  </div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition font-medium text-slate-800 dark:text-white" rows={3} />
                </div>
                
                <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                      Annuler
                   </button>
                   <button type="submit" className="w-full md:w-2/3 bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-500/20 transition active:scale-95">
                      {editingId ? 'Mettre à jour' : 'Planifier'}
                   </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer l'examen ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Êtes-vous sûr de vouloir supprimer cet examen ? Cette action est irréversible.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20">Supprimer</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};