import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Bot, Sparkles, Send, Trash2, Copy, Check, Wand2, Type, FileText, Briefcase, GraduationCap, Zap, RefreshCw, MessageCircle, Smile, Megaphone } from 'lucide-react';
import { chatWithAssistant, correctTextAdvanced, ChatMessage, CorrectionStyle } from '../services/gemini';
import { supabase } from '../services/supabaseClient';

export const Assistant: React.FC = () => {
  const { user, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'CHAT' | 'CORRECTOR'>('CHAT');

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- CORRECTOR STATE ---
  const [inputCorrection, setInputCorrection] = useState('');
  const [outputCorrection, setOutputCorrection] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionStyle, setCorrectionStyle] = useState<CorrectionStyle>('FIX');

  // --- PERSISTENCE ---
  useEffect(() => {
    if (user && activeTab === 'CHAT') {
      loadChatHistory();
    }
  }, [user, activeTab]);

  const loadChatHistory = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data.map(m => ({ role: m.role as 'user' | 'model', text: m.content })));
    }
  };

  const saveMessageToHistory = async (msg: ChatMessage) => {
    if (!user) return;
    await supabase.from('ai_conversations').insert([{
      user_id: user.id,
      role: msg.role,
      content: msg.text
    }]);
  };

  // --- AUTO SCROLL CHAT ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- CHAT HANDLERS ---
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: inputMessage };
    
    // Optimistic Update
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    
    // Save User Msg async
    saveMessageToHistory(userMsg);

    const aiResponse = await chatWithAssistant(messages, userMsg.text);

    setIsTyping(false);
    const aiMsg: ChatMessage = { role: 'model', text: aiResponse };
    setMessages(prev => [...prev, aiMsg]);
    
    // Save AI Msg async
    saveMessageToHistory(aiMsg);
  };

  const handleClearChat = async () => {
    if (!user) return;
    
    // Optimistic Clear
    setMessages([]);
    
    // DB Clear
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', user.id);

    if (error) {
       addNotification("Erreur lors de la suppression de l'historique", "ERROR");
       loadChatHistory(); // Revert if failed
    } else {
       addNotification("Conversation effacée", "INFO");
    }
  };

  const handleQuickAction = (text: string) => {
    setInputMessage(text);
  };

  // --- CORRECTOR HANDLERS ---
  const handleCorrection = async () => {
    if (!inputCorrection.trim()) return;
    setIsCorrecting(true);
    try {
      const result = await correctTextAdvanced(inputCorrection, correctionStyle);
      setOutputCorrection(result);
      addNotification("Texte traité avec succès !", "SUCCESS");
    } catch (e) {
      addNotification("Erreur lors du traitement.", "ERROR");
    } finally {
      setIsCorrecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification("Texte copié !", "SUCCESS");
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
           <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
             <span className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600">
               {activeTab === 'CHAT' ? <Bot className="w-8 h-8" /> : <Wand2 className="w-8 h-8" />}
             </span>
             {activeTab === 'CHAT' ? 'Assistant Éducatif' : 'Correcteur Pro'}
           </h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
             {activeTab === 'CHAT' ? 'Une question sur vos cours ? Je suis là 24/7.' : 'Reformulez, corrigez et améliorez vos textes instantanément.'}
           </p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto">
           <button 
             onClick={() => setActiveTab('CHAT')}
             className={`flex-1 md:w-32 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'CHAT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
           >
             <MessageCircle className="w-4 h-4" /> Chat
           </button>
           <button 
             onClick={() => setActiveTab('CORRECTOR')}
             className={`flex-1 md:w-32 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'CORRECTOR' ? 'bg-[#87CEEB] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
           >
             <Zap className="w-4 h-4" /> Correcteur
           </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative flex flex-col">
        
        {/* === CHAT INTERFACE === */}
        {activeTab === 'CHAT' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
               {messages.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                      <Bot className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Comment puis-je vous aider ?</h3>
                    <p className="text-slate-500 max-w-md mb-8">Je peux expliquer des cours, résumer des textes, créer des quiz ou simplement discuter.</p>
                    
                    <div className="flex flex-wrap justify-center gap-3">
                       {['Explique-moi le théorème de Pythagore', 'Résume ce texte...', 'Fais un quiz sur la Guerre Froide', 'Corrige ma phrase'].map(action => (
                         <button 
                           key={action}
                           onClick={() => handleQuickAction(action)}
                           className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition"
                         >
                           {action}
                         </button>
                       ))}
                    </div>
                 </div>
               )}

               {messages.map((msg, idx) => (
                 <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                    }`}>
                       {msg.role === 'model' && (
                         <div className="flex items-center gap-2 mb-2 text-indigo-500 font-bold text-xs uppercase tracking-wider">
                           <Sparkles className="w-3 h-3" /> Assistant
                         </div>
                       )}
                       {msg.text}
                    </div>
                 </div>
               ))}
               
               {isTyping && (
                 <div className="flex justify-start w-full">
                   <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                   </div>
                 </div>
               )}
               <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
               <div className="relative flex items-center gap-2">
                  <button 
                    onClick={handleClearChat}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                    title="Effacer la conversation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Posez votre question ici..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition dark:text-white font-medium placeholder:text-slate-400"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </>
        )}

        {/* === CORRECTOR INTERFACE === */}
        {activeTab === 'CORRECTOR' && (
          <div className="flex flex-col h-full overflow-y-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 flex-1 h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
                {/* INPUT SECTION */}
                <div className="p-6 flex flex-col bg-slate-50/30 dark:bg-slate-950/30">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Texte original</span>
                      <button 
                        onClick={() => setInputCorrection('')} 
                        className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                         <Trash2 className="w-3 h-3" /> Effacer
                      </button>
                   </div>
                   <textarea 
                     value={inputCorrection}
                     onChange={e => setInputCorrection(e.target.value)}
                     className="flex-1 w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 text-lg leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-700 font-medium"
                     placeholder="Collez votre texte ici pour le corriger, le reformuler ou l'améliorer..."
                   />
                </div>

                {/* OUTPUT SECTION */}
                <div className="p-6 flex flex-col bg-white dark:bg-slate-900 relative">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold uppercase text-[#87CEEB] tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Résultat IA
                      </span>
                      {outputCorrection && (
                        <button 
                          onClick={() => copyToClipboard(outputCorrection)} 
                          className="text-[#0EA5E9] hover:text-[#0284C7] text-xs font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-sky-50 dark:hover:bg-sky-900/20"
                        >
                           <Copy className="w-3 h-3" /> Copier
                        </button>
                      )}
                   </div>
                   
                   {isCorrecting ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#87CEEB]" />
                        <p className="text-sm font-medium animate-pulse">Traitement linguistique en cours...</p>
                     </div>
                   ) : outputCorrection ? (
                     <div className="flex-1 overflow-y-auto text-slate-800 dark:text-slate-100 text-lg leading-relaxed whitespace-pre-wrap animate-in fade-in">
                        {outputCorrection}
                     </div>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <Type className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Le résultat s'affichera ici</p>
                     </div>
                   )}
                </div>
             </div>

             {/* TOOLBAR */}
             <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 justify-between">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                   {[
                     { id: 'FIX', label: 'Correction Std.', icon: Check },
                     { id: 'PROFESSIONAL', label: 'Professionnel', icon: Briefcase },
                     { id: 'ACADEMIC', label: 'Académique', icon: GraduationCap },
                     { id: 'SIMPLE', label: 'Simplifier', icon: Zap },
                     { id: 'CONCISE', label: 'Concis', icon: FileText },
                     { id: 'CASUAL', label: 'Amical', icon: Smile },
                     { id: 'PERSUASIVE', label: 'Persuasif', icon: Megaphone },
                   ].map((style) => (
                     <button
                       key={style.id}
                       onClick={() => setCorrectionStyle(style.id as CorrectionStyle)}
                       className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
                         correctionStyle === style.id 
                           ? 'bg-[#87CEEB]/10 text-[#0369A1] dark:text-[#7DD3FC] border-[#87CEEB]' 
                           : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                       }`}
                     >
                       <style.icon className="w-4 h-4" /> {style.label}
                     </button>
                   ))}
                </div>

                <button 
                  onClick={handleCorrection}
                  disabled={!inputCorrection.trim() || isCorrecting}
                  className="w-full md:w-auto px-8 py-3 bg-[#0EA5E9] text-white font-bold rounded-xl hover:bg-[#0284C7] shadow-lg shadow-[#87CEEB]/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Wand2 className="w-5 h-5" /> Traiter le texte
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
