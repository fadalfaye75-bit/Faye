

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Poll } from '../types';
import { Vote, Trash2, Plus, BarChart2, CheckCircle, Eye, EyeOff, Pencil, X, Send, Lock, Unlock, Timer, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { addHours, isAfter } from 'date-fns';

export const Polls: React.FC = () => {
  const { user, polls, addPoll, updatePoll, votePoll, deletePoll, shareResource, addNotification } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [optionsStr, setOptionsStr] = useState(''); 
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [durationHours, setDurationHours] = useState<number | ''>('');

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Permission: Responsable UNIQUEMENT peut créer/gérer. L'Admin supervise.
  const canManage = user?.role === Role.RESPONSIBLE;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTER BY CLASS (Admin voit tout) ---
  const myPolls = isAdmin ? polls : polls.filter(p => p.classId === user?.classId);

  const openCreate = () => {
    setEditingId(null);
    setQuestion('');
    setOptionsStr('');
    setIsAnonymous(false);
    setDurationHours('');
    setIsModalOpen(true);
  };

  const openEdit = (poll: Poll) => {
    setEditingId(poll.id);
    setQuestion(poll.question);
    setOptionsStr(poll.options.map(o => o.label).join(', '));
    setIsAnonymous(poll.isAnonymous);
    setDurationHours(poll.durationHours || '');
    setIsModalOpen(true);
  };

  const togglePollStatus = (poll: Poll) => {
    // Seul le créateur (Responsable) peut le faire.
    if (poll.authorId !== user?.id) {
       addNotification("Action réservée au créateur", "ERROR");
       return;
    }
    updatePoll(poll.id, { active: !poll.active });
    addNotification(poll.active ? 'Sondage clôturé' : 'Sondage réouvert', 'INFO');
  };

  const handleCopy = (poll: Poll) => {
      const optionsText = poll.options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
      const text = `SONDAGE : ${poll.question}\n\nOptions :\n${optionsText}\n\n(Vote sur la plateforme)`;
      navigator.clipboard.writeText(text).then(() => {
          addNotification("Sondage copié", "SUCCESS");
      }).catch(() => {
          addNotification("Erreur lors de la copie", "ERROR");
      });
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deletePoll(deleteId);
      setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const optionsList = optionsStr.split(/[,\n]/).map(s => ({
      id: Math.random().toString(36).substr(2, 5),
      label: s.trim(),
      voterIds: []
    })).filter(o => o.label.length > 0);

    if (optionsList.length < 2) {
      addNotification("Il faut au moins 2 options pour un sondage.", "WARNING");
      return;
    }

    const payload = {
        question,
        isAnonymous,
        durationHours: durationHours === '' ? undefined : Number(durationHours)
    };

    if (editingId) {
       updatePoll(editingId, {
         ...payload,
         options: optionsList 
       });
    } else {
        addPoll({
          ...payload,
          type: 'SINGLE',
          options: optionsList,
          active: true,
        });
    }
    setIsModalOpen(false);
  };

  const handleVote = (pollId: string, optionId: string, isActive: boolean) => {
    if (!isActive) {
      addNotification("Ce sondage est clôturé.", "WARNING");
      return;
    }
    if (isAdmin) {
      addNotification("L'administrateur supervise mais ne vote pas.", "INFO");
      return;
    }
    votePoll(pollId, optionId);
  };

  // --- FILTRE : Masquer les sondages expirés (Durée) ---
  const visiblePolls = myPolls.filter(poll => {
      if (poll.durationHours && poll.durationHours > 0) {
          const expirationDate = addHours(new Date(poll.createdAt), poll.durationHours);
          if (isAfter(new Date(), expirationDate)) {
              return false; // Masqué
          }
      }
      return true;
  });

  const COLORS = ['#0EA5E9', '#6366F1', '#14B8A6', '#F59E0B', '#F43F5E'];

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 p-2 rounded-xl text-indigo-600"><Vote className="w-8 h-8" /></span>
            Sondages
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">La voix de la classe compte.</p>
        </div>
        {canManage && (
          <button 
            onClick={openCreate}
            className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-md"
          >
            <Plus className="w-5 h-5"/> <span>Nouveau Sondage</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-8">
        {visiblePolls.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
             <Vote className="w-16 h-16 mx-auto mb-4 opacity-10 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucun sondage actif ou visible.</p>
          </div>
        )}
        {visiblePolls.map(poll => {
          const totalVotes = poll.options.reduce((acc, curr) => acc + curr.voterIds.length, 0);
          const userVotedOptionId = poll.options.find(opt => opt.voterIds.includes(user?.id || ''))?.id;
          const hasVoted = !!userVotedOptionId;
          const canViewResults = hasVoted || user?.role === Role.RESPONSIBLE || isAdmin || !poll.active;
          const chartData = poll.options.map(o => ({ ...o, votes: o.voterIds.length }));

          // PERMISSION : Seul le créateur (Responsable) voit les boutons
          const isAuthor = user?.id === poll.authorId;

          return (
            <div key={poll.id} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6 transition group ${poll.active ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700' : 'border-slate-100 dark:border-slate-800 opacity-80 bg-slate-50/50'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 gap-4">
                <div className="flex-1 w-full">
                   <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-tight flex items-center gap-2">
                     {poll.question}
                     {!poll.active && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-2 py-1 rounded-md uppercase font-bold border border-slate-200 dark:border-slate-700">Clôturé</span>}
                   </h3>
                   <div className="flex items-center gap-3 mt-3">
                      {poll.isAnonymous ? (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded uppercase font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                           <EyeOff className="w-3 h-3" /> Anonyme
                        </span>
                      ) : (
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded uppercase font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                           <Eye className="w-3 h-3" /> Public
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-400">• {totalVotes} votes</span>
                      {poll.durationHours && (
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 ml-2">
                            <Timer className="w-3 h-3" /> Visibilité: {poll.durationHours}h
                        </span>
                       )}
                   </div>
                </div>
                {isAuthor && (
                  <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <button 
                      onClick={() => togglePollStatus(poll)}
                      className={`flex-1 md:flex-none justify-center p-2.5 rounded-lg transition border active:scale-95 ${poll.active ? 'text-orange-600 bg-orange-50 border-orange-100 hover:bg-orange-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}
                    >
                      {poll.active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleCopy(poll)} className="flex-1 md:flex-none justify-center text-slate-600 bg-slate-50 border border-slate-100 hover:bg-slate-100 p-2.5 rounded-lg transition active:scale-95">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => shareResource('POLL', poll)} className="flex-1 md:flex-none justify-center text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 p-2.5 rounded-lg transition active:scale-95">
                      <Send className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEdit(poll)} 
                      className="flex-1 md:flex-none justify-center p-2.5 rounded-lg transition active:scale-95"
                      style={{ color: '#87CEEB', backgroundColor: 'rgba(135, 206, 235, 0.1)' }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(poll.id)} className="flex-1 md:flex-none justify-center text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 p-2.5 rounded-lg transition active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                {/* Voting Section */}
                <div className="space-y-3">
                  {poll.options.map((opt) => {
                    const isSelected = opt.id === userVotedOptionId;
                    const voteCount = opt.voterIds.length;
                    const isDisabled = !poll.active || isAdmin;
                    
                    return (
                      <button
                        key={opt.id}
                        onClick={(e) => { e.stopPropagation(); handleVote(poll.id, opt.id, poll.active); }}
                        disabled={isDisabled && !isSelected}
                        className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group 
                          ${isSelected 
                            ? 'cursor-default border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-sm' 
                            : isDisabled
                              ? 'opacity-60 cursor-not-allowed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                              : 'hover:border-indigo-300 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white bg-white dark:bg-slate-800 active:scale-[0.99] hover:shadow-sm'
                          }
                        `}
                      >
                        <div className="flex justify-between items-center z-10 relative">
                          <span className={`font-medium text-base ${isSelected ? 'flex items-center gap-2 font-bold' : ''}`}>
                             {isSelected && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                             {opt.label}
                          </span>
                          {canViewResults && (voteCount > 0) && (
                             <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded">{Math.round((voteCount / totalVotes) * 100)}%</span>
                          )}
                        </div>
                        {canViewResults && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-indigo-100/50 dark:bg-indigo-900/30 z-0 transition-all duration-700 ease-out" 
                            style={{ width: `${(voteCount / totalVotes) * 100}%` }}
                          />
                        )}
                      </button>
                    );
                  })}
                  
                  {hasVoted && poll.active && !isAdmin && (
                    <p className="text-center text-xs text-indigo-500 font-medium mt-2">
                       Cliquez pour changer votre vote.
                    </p>
                  )}
                  {isAdmin && (
                     <p className="text-center text-xs text-slate-400 font-medium mt-2 flex items-center justify-center gap-1">
                       <Eye className="w-3 h-3"/> Mode Supervision
                    </p>
                  )}
                  {!poll.active && (
                     <p className="text-center text-xs text-red-400 font-medium mt-2 flex items-center justify-center gap-1">
                       <Lock className="w-3 h-3"/> Clôturé
                    </p>
                  )}
                </div>

                {/* Results Section */}
                <div className="min-h-[200px] flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                  {!canViewResults ? (
                     <div className="text-center text-slate-400">
                       <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                       <p className="font-medium text-sm">Votez pour voir les résultats</p>
                     </div>
                  ) : totalVotes === 0 ? (
                    <div className="text-center text-slate-400">
                       <p className="font-medium text-sm">Aucun vote pour le moment.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="label" type="category" width={90} tick={{fontSize: 11, fontWeight: 600, fill: '#64748B'}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                        <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={20}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
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
                {editingId ? 'Modifier Sondage' : 'Nouveau Sondage'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 bg-white dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Question</label>
                  </div>
                  <input required type="text" value={question} onChange={e => setQuestion(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-medium text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Options (séparées par virgule)</label>
                  <textarea required value={optionsStr} onChange={e => setOptionsStr(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-medium text-slate-800 dark:text-white" placeholder="Option 1, Option 2, Option 3" rows={3}/>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Durée (Heures) - Optionnel</label>
                    <div className="relative">
                        <Timer className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="number" 
                            min="1"
                            value={durationHours} 
                            onChange={e => setDurationHours(e.target.value === '' ? '' : Number(e.target.value))} 
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800 dark:text-white" 
                            placeholder="Illimité" 
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition">
                   <input 
                     type="checkbox" 
                     id="anon"
                     checked={isAnonymous}
                     onChange={e => setIsAnonymous(e.target.checked)}
                     className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                   />
                   <label htmlFor="anon" className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer font-bold select-none uppercase tracking-wide flex-1">
                      <EyeOff className="w-4 h-4 text-slate-400" /> Vote Anonyme
                   </label>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                    Annuler
                  </button>
                  <button type="submit" className="w-full md:w-2/3 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition active:scale-95">
                    {editingId ? 'Mettre à jour' : 'Lancer'}
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
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer le sondage ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Êtes-vous sûr de vouloir supprimer ce sondage ? Cette action est irréversible.</p>
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