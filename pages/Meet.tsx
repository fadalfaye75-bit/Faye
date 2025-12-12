

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, MeetSession } from '../types';
import { Video, Plus, Trash2, ExternalLink, AlertCircle, Pencil, User, Send, X, Copy, Mail, Eye, Lock } from 'lucide-react';
import { format, isBefore, addMinutes, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Meet: React.FC = () => {
  const { user, meets, addMeet, updateMeet, deleteMeet, shareResource, addNotification } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Share Confirmation State
  const [shareConfirmation, setShareConfirmation] = useState<MeetSession | null>(null);
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [link, setLink] = useState('');
  const [date, setDate] = useState('');

  const [targetRoles, setTargetRoles] = useState<Role[]>([]);
  
  // Permission: Responsable UNIQUEMENT peut créer. L'Admin supervise.
  const canManage = user?.role === Role.RESPONSIBLE;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTER BY CLASS (Admin voit tout) ---
  const myMeets = isAdmin ? meets : meets.filter(m => m.classId === user?.classId);

  const openCreate = () => {
    setEditingId(null);
    setSubject('');
    setTeacher(user?.name || '');
    setLink('');
    setDate('');
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const openEdit = (item: MeetSession) => {
    setEditingId(item.id);
    setSubject(item.subject);
    setTeacher(item.teacherName);
    setLink(item.link);
    setDate(new Date(item.date).toISOString().slice(0, 16));
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const handleCopy = (item: MeetSession) => {
      const text = `VISIO : ${item.subject}\nAvec : ${item.teacherName}\nDate : ${format(new Date(item.date), 'EEEE dd/MM/yyyy à HH:mm', { locale: fr })}\nLien : ${item.link}`;
      navigator.clipboard.writeText(text).then(() => {
          addNotification("Informations de connexion copiées", "SUCCESS");
      }).catch(() => {
          addNotification("Erreur lors de la copie", "ERROR");
      });
  };

  const handleConfirmShare = () => {
    if (shareConfirmation) {
      shareResource('MEET', shareConfirmation);
      setShareConfirmation(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteMeet(deleteId);
      setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      subject,
      teacherName: teacher,
      link,
      date: new Date(date).toISOString(),
    };

    if (editingId) {
      updateMeet(editingId, payload);
    } else {
      addMeet(payload, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  // --- FILTRE AUTOMATIQUE : Masquer les meets passés de plus d'une heure ---
  const sortedMeets = [...myMeets]
    .filter(meet => {
        // On considère qu'un meet est fini 1h après son début
        const meetEnd = addMinutes(new Date(meet.date), 60);
        return isAfter(meetEnd, new Date());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-2 rounded-xl text-emerald-600"><Video className="w-8 h-8" /></span>
            Visioconférences
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Accès direct aux cours en ligne à venir.</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-2 shadow-md">
            <Plus className="w-5 h-5"/> <span>Nouveau Meet</span>
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {sortedMeets.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
             <Video className="w-16 h-16 mx-auto mb-4 opacity-20 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucun cours vidéo programmé.</p>
          </div>
        )}
        {sortedMeets.map((meet) => {
           const meetDate = new Date(meet.date);
           const now = new Date();
           const isSoon = isAfter(meetDate, now) && isBefore(meetDate, addMinutes(now, 60));
           const isLive = isBefore(meetDate, now) && isBefore(now, addMinutes(meetDate, 60));

           // PERMISSION : Seul le créateur voit les boutons. (Admin n'étant pas créateur, il ne les voit pas)
           const isAuthor = user?.id === meet.authorId;

           return (
            <div key={meet.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 md:p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:-translate-y-1 transition duration-300 group ${isLive || isSoon ? 'border-emerald-500 shadow-emerald-500/10 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
               
               {/* Date & Time */}
               <div className="w-full md:w-auto flex justify-between md:block items-center border-b md:border-b-0 pb-4 md:pb-0 border-slate-100 dark:border-slate-800 mb-2 md:mb-0 md:min-w-[100px]">
                 <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{format(meetDate, 'EEEE', { locale: fr })}</span>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">{format(meetDate, 'MMM', { locale: fr })}</span>
                    <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">{format(meetDate, 'd')}</span>
                    <span className={`text-xs md:text-sm font-bold text-white px-3 py-1 rounded-full mt-2 ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-800 dark:bg-slate-700'}`}>
                      {format(meetDate, 'HH:mm')}
                    </span>
                 </div>
                 
                 {(isSoon || isLive) && (
                    <div className="md:hidden inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold animate-pulse border border-red-100 dark:border-red-800">
                        <AlertCircle className="w-3 h-3" />
                        {isLive ? 'EN DIRECT' : 'Bientôt'}
                    </div>
                 )}
               </div>
               
               {/* Details */}
               <div className="flex-1 w-full text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-1.5 leading-tight">{meet.subject}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <User className="w-4 h-4 text-sky-500" /> 
                    {meet.teacherName}
                  </div>
                  
                  {(isSoon || isLive) && (
                     <div className="hidden md:inline-flex mt-4 items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse uppercase tracking-wide">
                        <AlertCircle className="w-4 h-4" />
                        {isLive ? 'SESSION EN COURS' : 'DÉMARRE BIENTÔT'}
                     </div>
                  )}
               </div>

               {/* Actions */}
               <div className="flex flex-col w-full md:w-auto gap-3">
                 {isAdmin ? (
                    <button 
                      disabled
                      className="w-full md:w-auto text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <span>Lecture Seule</span> <Lock className="w-4 h-4" />
                    </button>
                 ) : (
                   <a 
                     href={meet.link} 
                     target="_blank" 
                     rel="noreferrer" 
                     className={`w-full md:w-auto text-white px-6 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 active:translate-y-1 shadow-md
                       ${isLive || isSoon ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-slate-800 hover:bg-slate-700 shadow-slate-800/20'}
                     `}
                   >
                     <span>Rejoindre</span> <ExternalLink className="w-4 h-4" />
                   </a>
                 )}
                 
                 <div className="flex gap-2 w-full">
                     <button 
                        onClick={() => handleCopy(meet)}
                        className="flex-1 p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg flex justify-center items-center transition border border-slate-100"
                        title="Copier le lien"
                     >
                        <Copy className="w-4 h-4" />
                     </button>
                     {isAuthor && (
                       <>
                          <button 
                            onClick={() => setShareConfirmation(meet)}
                            className="flex-1 p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex justify-center items-center transition border border-emerald-100"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEdit(meet)}
                            className="flex-1 p-2.5 rounded-lg flex justify-center items-center transition"
                            style={{ color: '#87CEEB', backgroundColor: 'rgba(135, 206, 235, 0.1)' }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteId(meet.id)}
                            className="flex-1 p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex justify-center items-center transition border border-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </>
                     )}
                 </div>
               </div>
            </div>
           );
        })}
      </div>

      {isModalOpen && canManage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[160] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-wide">
                {editingId ? 'Modifier la session' : 'Programmer un Meet'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 bg-white dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Matière</label>
                    <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Enseignant</label>
                    <input required type="text" value={teacher} onChange={e => setTeacher(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Date & Heure</label>
                    <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Lien Google Meet</label>
                    <div className="relative">
                      <Video className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                      <input required type="url" value={link} onChange={e => setLink(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 p-3 text-base focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition font-medium text-emerald-600" placeholder="https://meet.google.com/..." />
                    </div>
                 </div>
                 
                 <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                      Annuler
                    </button>
                    <button type="submit" className="w-full md:w-2/3 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition active:scale-95">
                      {editingId ? 'Sauvegarder' : 'Ajouter'}
                    </button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {shareConfirmation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[170] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Mail className="w-10 h-10" /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Partager le lien</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">Voulez-vous envoyer les détails du cours <strong>"{shareConfirmation.subject}"</strong> par email à la classe ?</p>
              <div className="flex gap-4">
                 <button onClick={() => setShareConfirmation(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={handleConfirmShare} className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20">Envoyer</button>
              </div>
           </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer le Meet ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Êtes-vous sûr de vouloir supprimer cette session ? Cette action est irréversible.</p>
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
