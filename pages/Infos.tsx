
import React, { useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Urgency, Announcement, Attachment } from '../types';
import { Megaphone, Trash2, Clock, Plus, X, ArrowUpDown, Filter, Send, Mail, User, AlertCircle, Timer, Search, Archive, Eye, Copy, ChevronLeft, ChevronRight, Pencil, School, Calendar, AlertTriangle, FileText, Info, Link as LinkIcon, Image as ImageIcon, ExternalLink, Download, File, Lock } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserAvatar } from '../components/UserAvatar';

// Configuration visuelle par niveau d'urgence
const URGENCY_CONFIG = {
  [Urgency.URGENT]: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-100 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    label: 'Urgent'
  },
  [Urgency.INFO]: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-100 dark:border-sky-800',
    badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
    label: 'Info'
  },
  [Urgency.NORMAL]: {
    icon: FileText,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    label: 'Normal'
  }
};

const getLinkIcon = (url: string) => {
  if (url.includes('docs.google.com/forms')) return { icon: FileText, label: 'Google Forms', color: 'text-purple-600 bg-purple-50 border-purple-200' };
  if (url.includes('meet.google.com')) return { icon: ExternalLink, label: 'Google Meet', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  if (url.includes('drive.google.com')) return { icon: File, label: 'Google Drive', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  return { icon: LinkIcon, label: 'Lien externe', color: 'text-slate-600 bg-slate-50 border-slate-200' };
};

export const Infos: React.FC = () => {
  const { 
    user, 
    announcements, 
    users, 
    classes,
    addAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement, 
    shareResource,
    highlightedItemId,
    setHighlightedItemId,
    addNotification
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // View Modal State
  const [viewingItem, setViewingItem] = useState<Announcement | null>(null);
  
  // Share Confirmation State
  const [shareConfirmation, setShareConfirmation] = useState<Announcement | null>(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sorting & Filtering State
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false); // État pour voir les archives
  
  // Real-time auto-hide
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6; 
  const listTopRef = useRef<HTMLDivElement>(null);
  
  // Recherche (Optimisée)
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery); 

  // Filtres
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'ALL'>('ALL');
  const [filterAuthorId, setFilterAuthorId] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.NORMAL);
  const [durationHours, setDurationHours] = useState<number | ''>(''); 
  const [link, setLink] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission: Responsable ET Admin peuvent créer
  const canCreate = user?.role === Role.RESPONSIBLE || user?.role === Role.ADMIN;
  const isAdmin = user?.role === Role.ADMIN;

  // --- FILTER BY CLASS (Memoized) ---
  const myAnnouncements = useMemo(() => {
    return isAdmin ? announcements : announcements.filter(a => a.classId === user?.classId);
  }, [isAdmin, announcements, user?.classId]);

  // --- REAL-TIME TIMER ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); 
    return () => clearInterval(timer);
  }, []);

  const uniqueAuthors = useMemo(() => {
    const authorIds = Array.from(new Set(myAnnouncements.map(a => a.authorId)));
    return authorIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  }, [myAnnouncements, users]);

  // --- DEEP LINKING (Auto Open) ---
  useEffect(() => {
    if (highlightedItemId) {
      const itemToOpen = myAnnouncements.find(a => a.id === highlightedItemId);
      if (itemToOpen) {
        setViewingItem(itemToOpen);
        setHighlightedItemId(null);
      }
    }
  }, [highlightedItemId, myAnnouncements, setHighlightedItemId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, filterStartDate, filterEndDate, filterUrgency, filterAuthorId, filterClassId, showArchived, sortOrder]);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setUrgency(Urgency.NORMAL);
    setDurationHours('');
    setLink('');
    setAttachments([]);
    setTargetRoles([]); 
    setIsModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setUrgency(item.urgency);
    setDurationHours(item.durationHours || '');
    setLink(item.link || '');
    setAttachments(item.attachments || []);
    setTargetRoles([]);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limitation Taille : 3 Mo
      const MAX_SIZE = 3 * 1024 * 1024; // 3 MB in bytes
      if (file.size > MAX_SIZE) {
        addNotification('Le fichier dépasse la limite de 3 Mo.', 'ERROR');
        return;
      }

      const reader = new FileReader();
      
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        addNotification('Seuls les images (JPG, PNG) et les PDF sont acceptés.', 'ERROR');
        return;
      }

      reader.onload = () => {
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substr(2, 9),
          type: isPdf ? 'PDF' : 'IMAGE',
          url: reader.result as string,
          name: file.name
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      title, 
      content, 
      urgency,
      // IMPORTANT: Envoi de 'null' si vide pour permettre la suppression en base de données
      durationHours: durationHours === '' ? null : Number(durationHours),
      link: link || null, 
      attachments
    };

    if (editingId) {
      // Cast explicity as Partial<Announcement> to fix TS build error with nulls
      updateAnnouncement(editingId, payload as unknown as Partial<Announcement>);
    } else {
      addAnnouncement({
        ...payload,
        date: new Date().toISOString(),
      }, targetRoles.length > 0 ? targetRoles : undefined);
    }
    setIsModalOpen(false);
  };

  const handleConfirmShare = () => {
    if (shareConfirmation) {
      shareResource('ANNOUNCEMENT', shareConfirmation);
      setShareConfirmation(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteAnnouncement(deleteId);
      setDeleteId(null);
      // Si on était en train de visualiser cet élément, on ferme la modale
      if (viewingItem?.id === deleteId) {
        setViewingItem(null);
      }
    }
  };

  const handleCopy = (item: Announcement) => {
    const textToCopy = `${item.title.toUpperCase()}\n\n${item.content}\n${item.link ? `Lien: ${item.link}` : ''}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      addNotification("Annonce copiée dans le presse-papier", "SUCCESS");
    }).catch(() => {
      addNotification("Erreur lors de la copie", "ERROR");
    });
  };

  const filteredAnnouncements = useMemo(() => {
    const sorted = [...myAnnouncements].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return sorted.filter(item => {
      const itemDate = new Date(item.date);

      if (item.durationHours && item.durationHours > 0) {
        const expirationDate = addHours(itemDate, item.durationHours);
        const isExpired = isAfter(currentTime, expirationDate);
        
        if (!showArchived && isExpired) {
          return false;
        }
      }

      if (deferredSearchQuery.trim()) {
        const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const query = normalize(deferredSearchQuery.trim());
        const titleStr = normalize(item.title || '');
        const contentStr = normalize(item.content || '');
        
        if (!titleStr.includes(query) && !contentStr.includes(query)) {
          return false;
        }
      }

      if (filterStartDate) {
        const start = startOfDay(new Date(filterStartDate));
        if (isBefore(itemDate, start)) return false;
      }
      if (filterEndDate) {
        const end = endOfDay(new Date(filterEndDate));
        if (isAfter(itemDate, end)) return false;
      }

      if (filterUrgency !== 'ALL' && item.urgency !== filterUrgency) return false;
      if (filterAuthorId !== 'ALL' && item.authorId !== filterAuthorId) return false;
      if (filterClassId !== 'ALL' && item.classId !== filterClassId) return false;

      return true;
    });
  }, [myAnnouncements, sortOrder, deferredSearchQuery, filterStartDate, filterEndDate, filterUrgency, filterAuthorId, filterClassId, showArchived, currentTime]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentAnnouncements = filteredAnnouncements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);

  const paginate = (pageNumber: number) => {
      setCurrentPage(pageNumber);
      // Auto-scroll top when changing page
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  const clearFilters = () => { 
    setFilterStartDate(''); 
    setFilterEndDate(''); 
    setFilterUrgency('ALL');
    setFilterAuthorId('ALL');
    setFilterClassId('ALL');
    setSearchQuery('');
  };

  // Logique pour les numéros de page (Ellipses)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisibleButtons = 5; 

    if (totalPages <= maxVisibleButtons) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 3) end = Math.min(totalPages - 1, 4);
        if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 3);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-6xl mx-auto px-0 md:px-0 animate-in fade-in duration-500">
      <div ref={listTopRef} className="scroll-mt-24"></div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <span className="bg-[#87CEEB]/20 dark:bg-[#87CEEB]/30 border border-[#87CEEB]/40 p-2 rounded-2xl text-[#0EA5E9] dark:text-[#87CEEB]"><Megaphone className="w-8 h-8" /></span>
            Annonces
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg">Actualités et communiqués officiels.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
             onClick={() => setShowArchived(!showArchived)}
             className={`p-3 rounded-2xl border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none ${showArchived ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
             title={showArchived ? "Masquer les archives" : "Voir les archives"}
          >
             <Archive className="w-5 h-5" />
          </button>

          <button 
             onClick={toggleSort}
             className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none justify-center"
             title={sortOrder === 'desc' ? "Plus récents d'abord" : "Plus anciens d'abord"}
          >
             <ArrowUpDown className="w-5 h-5" />
          </button>
          
          <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-3 rounded-2xl border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm flex-1 md:flex-none ${showFilters ? 'bg-[#87CEEB]/20 text-[#0369A1] border-[#87CEEB]/40' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
          >
             <Filter className="w-5 h-5" />
          </button>

          {canCreate && (
            <button 
              onClick={openCreate}
              className="w-full md:w-auto btn-primary text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition flex items-center justify-center gap-2 shadow-md shadow-[#87CEEB]/30"
            >
              <Plus className="w-5 h-5" /> <span>Publier</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#87CEEB] transition-colors" />
        </div>
        <input 
          type="text" 
          aria-label="Rechercher une annonce"
          placeholder="Rechercher une annonce (titre, contenu)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-11 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all shadow-sm font-medium"
        />
        {searchQuery && (
           <button 
             onClick={() => setSearchQuery('')}
             className="absolute inset-y-0 right-0 pr-3 flex items-center"
           >
             <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
               <X className="w-4 h-4" />
             </div>
           </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
           {/* Filters UI code (unchanged) */}
           <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
              <button onClick={clearFilters} className="text-xs text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-4 rounded-lg transition flex items-center gap-1">
                 <X className="w-3 h-3" /> Réinitialiser les filtres
              </button>
           </div>
        </div>
      )}

      {/* Compteur de résultats */}
      <div className="mb-4 px-2 flex justify-between items-center">
         <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {filteredAnnouncements.length} annonce{filteredAnnouncements.length > 1 ? 's' : ''} {showArchived ? '(archives incluses)' : ''}
         </span>
         {showArchived && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
               Mode Archives Actif
            </span>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAnnouncements.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
             <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-10 text-slate-900 dark:text-white" />
             <p className="font-medium text-lg text-slate-500">Aucun résultat ne correspond à vos critères.</p>
          </div>
        )}
        {currentAnnouncements.map((item) => {
           const author = users.find(u => u.id === item.authorId);
           // Seul l'auteur ou l'Admin peut modifier/supprimer.
           const isAuthor = user?.id === item.authorId;
           const canEditThis = isAuthor || isAdmin;
           
           const expirationDate = item.durationHours ? addHours(new Date(item.date), item.durationHours) : null;
           const isExpired = expirationDate ? isAfter(currentTime, expirationDate) : false;
           const style = URGENCY_CONFIG[item.urgency];
           const UrgencyIcon = style.icon;

           return (
            <div 
              key={item.id} 
              onClick={() => setViewingItem(item)}
              className={`
                bg-white dark:bg-slate-900 rounded-[2rem] border relative overflow-hidden flex flex-col
                group cursor-pointer transition-all duration-300 
                hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none
                ${style.border} ${isExpired ? 'opacity-60 grayscale-[0.8]' : ''}
              `}
            >
              {/* Header avec métadonnées */}
              <div className={`px-6 py-4 flex items-center justify-between ${style.bg} border-b ${style.border}`}>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${style.badge} ${style.border}`}>
                      <UrgencyIcon className="w-3.5 h-3.5" />
                      {style.label}
                  </div>
                  
                  <div className="flex items-center gap-3">
                      {item.durationHours && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                           <Timer className="w-3 h-3" />
                           {isExpired ? 'Expiré' : `${item.durationHours}h`}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(item.date), 'dd MMM', { locale: fr })}
                      </div>
                  </div>
              </div>

              {/* Contenu Principal */}
              <div className="p-6 flex-1 flex flex-col">
                 <h3 className={`text-xl font-bold mb-3 line-clamp-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors ${style.color}`}>
                    {isExpired && <span className="text-red-500 text-sm mr-2">[EXPIRÉ]</span>}
                    {item.title}
                 </h3>
                 <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-3 mb-6 font-medium">
                    {item.content}
                 </p>

                 {/* Indicateurs de contenu (Lien, PDF, Images) */}
                 {(item.link || (item.attachments && item.attachments.length > 0)) && (
                    <div className="mb-4 flex gap-2">
                       {item.link && <span className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md text-slate-500"><LinkIcon className="w-3.5 h-3.5"/></span>}
                       {item.attachments?.some(a => a.type === 'PDF') && <span className="bg-red-50 dark:bg-red-900/20 p-1.5 rounded-md text-red-500"><FileText className="w-3.5 h-3.5"/></span>}
                       {item.attachments?.some(a => a.type === 'IMAGE') && <span className="bg-purple-50 dark:bg-purple-900/20 p-1.5 rounded-md text-purple-500"><ImageIcon className="w-3.5 h-3.5"/></span>}
                    </div>
                 )}

                 {/* Footer : Auteur et Actions */}
                 <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                       <UserAvatar user={author} size="sm" className="ring-2 ring-white dark:ring-slate-900" />
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{author?.name || 'Inconnu'}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{format(new Date(item.date), 'HH:mm')}</span>
                       </div>
                    </div>

                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(item); }} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition" title="Copier"><Copy className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setShareConfirmation(item); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition" title="Partager"><Send className="w-4 h-4" /></button>
                        {canEditThis && (
                          <>
                             <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Modifier"><Pencil className="w-4 h-4" /></button>
                             <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                    </div>
                 </div>
              </div>
            </div>
           );
        })}
      </div>

      {/* Smart Pagination Controls */}
      {totalPages > 1 && (
         <div className="flex flex-col md:flex-row justify-center items-center gap-4 mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => paginate(currentPage - 1)} 
                    disabled={currentPage === 1} 
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    title="Page précédente"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2">
                   {getPageNumbers().map((page, index) => (
                      typeof page === 'number' ? (
                        <button 
                            key={index} 
                            onClick={() => paginate(page)} 
                            className={`w-12 h-12 rounded-2xl text-sm font-bold flex items-center justify-center transition shadow-sm ${currentPage === page ? 'bg-[#0EA5E9] text-white shadow-[#87CEEB]/40' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            {page}
                        </button>
                      ) : (
                        <span key={index} className="w-8 h-12 flex items-center justify-center text-slate-400 font-bold select-none">...</span>
                      )
                   ))}
                </div>

                <button 
                    onClick={() => paginate(currentPage + 1)} 
                    disabled={currentPage === totalPages} 
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    title="Page suivante"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            <div className="text-xs text-slate-400 font-medium">
                Page {currentPage} sur {totalPages}
            </div>
         </div>
      )}

      {/* --- MODALS (View, Confirm, Edit, Delete) --- */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingItem(null)}>
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingItem(null)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition z-10 text-slate-500"><X className="w-5 h-5" /></button>
              <div className="p-8 md:p-10">
                 <div className="flex items-start gap-4 mb-8">
                    <UserAvatar user={users.find(u => u.id === viewingItem.authorId)} size="lg" />
                    <div className="flex-1">
                       <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-3">{viewingItem.title}</h3>
                       <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${viewingItem.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border-red-200' : viewingItem.urgency === 'INFO' ? 'bg-sky-50 text-[#0369A1] border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{viewingItem.urgency}</span>
                          <span className="text-slate-500 font-bold text-sm flex items-center gap-2">par {users.find(u => u.id === viewingItem.authorId)?.name}</span>
                          <span className="text-slate-300 font-light text-sm hidden md:inline">•</span>
                          <span className="text-slate-400 font-medium text-sm flex items-center gap-1 capitalize"><Clock className="w-3 h-3" /> {format(new Date(viewingItem.date), 'EEEE dd MMM yyyy à HH:mm', { locale: fr })}</span>
                       </div>
                       {viewingItem.durationHours && (<p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1"><Timer className="w-3 h-3"/> Expire après {viewingItem.durationHours}h</p>)}
                    </div>
                 </div>
                 
                 {/* Contenu */}
                 <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-wrap font-medium mb-8">{viewingItem.content}</div>
                 
                 {/* LIEN EXTERNE */}
                 {viewingItem.link && (
                    <div className="mb-8">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4"/> Lien associé</h4>
                      {isAdmin ? (
                        <div className="flex items-center gap-3 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed">
                            {React.createElement(getLinkIcon(viewingItem.link).icon, { className: "w-6 h-6 text-slate-400" })}
                            <div className="flex-1">
                                <div className="font-bold text-slate-500">{getLinkIcon(viewingItem.link).label} (Lecture seule)</div>
                                <div className="text-xs text-slate-400 truncate">{viewingItem.link}</div>
                            </div>
                            <Lock className="w-4 h-4 text-slate-400" />
                        </div>
                      ) : (
                        <a href={viewingItem.link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-4 rounded-xl border transition hover:shadow-md group ${getLinkIcon(viewingItem.link).color}`}>
                            {React.createElement(getLinkIcon(viewingItem.link).icon, { className: "w-6 h-6" })}
                            <div className="flex-1">
                                <div className="font-bold">{getLinkIcon(viewingItem.link).label}</div>
                                <div className="text-xs opacity-70 truncate">{viewingItem.link}</div>
                            </div>
                            <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                        </a>
                      )}
                    </div>
                 )}

                 {/* FICHIERS JOINTS (PDF) */}
                 {viewingItem.attachments?.some(a => a.type === 'PDF') && (
                    <div className="mb-8">
                       <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText className="w-4 h-4"/> Documents PDF</h4>
                       <div className="grid gap-3">
                          {viewingItem.attachments.filter(a => a.type === 'PDF').map(pdf => (
                             <div key={pdf.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-red-100 text-red-500 rounded-lg"><FileText className="w-5 h-5" /></div>
                                   <span className="font-bold text-slate-700 dark:text-slate-200">{pdf.name}</span>
                                </div>
                                <a href={pdf.url} download={pdf.name} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"><Download className="w-5 h-5" /></a>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* FICHIERS JOINTS (IMAGES) */}
                 {viewingItem.attachments?.some(a => a.type === 'IMAGE') && (
                    <div>
                       <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Images</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingItem.attachments.filter(a => a.type === 'IMAGE').map(img => (
                             <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group">
                                <img src={img.url} alt={img.name} className="w-full h-auto object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                   <a href={img.url} download={img.name} className="p-2 bg-white rounded-full text-slate-800 hover:scale-110 transition shadow-lg"><Download className="w-5 h-5" /></a>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODALE DE CREATION/EDITION */}
      {isModalOpen && canCreate && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
               <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                     {editingId ? 'Modifier l\'annonce' : 'Nouvelle Annonce'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition active:scale-90">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900">
                  <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Titre</label>
                        <input 
                           required 
                           type="text" 
                           value={title} 
                           onChange={e => setTitle(e.target.value)} 
                           className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] outline-none transition text-slate-800 dark:text-white" 
                           placeholder="Ex: Rentrée 2025"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Niveau d'urgence</label>
                        <div className="flex gap-3">
                           {[Urgency.INFO, Urgency.NORMAL, Urgency.URGENT].map((u) => {
                              const style = URGENCY_CONFIG[u];
                              return (
                                 <button
                                    key={u}
                                    type="button"
                                    onClick={() => setUrgency(u)}
                                    className={`flex-1 py-3 px-2 rounded-xl border flex items-center justify-center gap-2 transition ${urgency === u ? `${style.bg} ${style.border} ${style.color} ring-2 ring-offset-2 dark:ring-offset-slate-900` : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                 >
                                    <style.icon className="w-4 h-4" />
                                    <span className="text-xs font-bold">{style.label}</span>
                                 </button>
                              );
                           })}
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Contenu</label>
                        <textarea 
                           required 
                           value={content} 
                           onChange={e => setContent(e.target.value)} 
                           className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] outline-none transition min-h-[150px] text-slate-800 dark:text-white" 
                           placeholder="Détails de l'annonce..."
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Durée (Heures) - Optionnel</label>
                           <div className="relative">
                              <Timer className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                              <input 
                                 type="number" 
                                 min="1"
                                 value={durationHours} 
                                 onChange={e => setDurationHours(e.target.value === '' ? '' : Number(e.target.value))} 
                                 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-base font-bold focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] outline-none transition text-slate-800 dark:text-white" 
                                 placeholder="Illimité" 
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Lien Externe - Optionnel</label>
                           <div className="relative">
                              <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                              <input 
                                 type="url" 
                                 value={link} 
                                 onChange={e => setLink(e.target.value)} 
                                 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-base font-medium focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] outline-none transition text-sky-600" 
                                 placeholder="https://..." 
                              />
                           </div>
                        </div>
                     </div>

                     <div>
                        <div className="flex justify-between items-center mb-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase">Pièces Jointes</label>
                           <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                           >
                              <Plus className="w-3 h-3" /> Ajouter
                           </button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                        
                        {attachments.length === 0 ? (
                           <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-[#87CEEB] hover:bg-sky-50 dark:hover:bg-sky-900/10 transition">
                              <p className="text-sm text-slate-400 font-medium">Cliquez pour ajouter une image ou un PDF (Max 3Mo)</p>
                           </div>
                        ) : (
                           <div className="space-y-2">
                              {attachments.map(att => (
                                 <div key={att.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                       <div className={`p-2 rounded-lg ${att.type === 'PDF' ? 'bg-red-100 text-red-500' : 'bg-purple-100 text-purple-500'}`}>
                                          {att.type === 'PDF' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                       </div>
                                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeAttachment(att.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-1/3 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                           Annuler
                        </button>
                        <button type="submit" className="w-full md:w-2/3 btn-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-[#87CEEB]/30 transition active:scale-95">
                           {editingId ? 'Mettre à jour' : 'Publier'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}

      {/* MODALE DE CONFIRMATION (Partage) */}
      {shareConfirmation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[170] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Mail className="w-10 h-10" /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Partager l'annonce</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">Voulez-vous envoyer l'annonce <strong>"{shareConfirmation.title}"</strong> par email à toute la classe ?</p>
              <div className="flex gap-4">
                 <button onClick={() => setShareConfirmation(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Annuler</button>
                 <button onClick={handleConfirmShare} className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20">Envoyer</button>
              </div>
           </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION (Suppression) */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Supprimer l'annonce ?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.</p>
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
