
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Mail, Lock, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, addNotification } = useApp();
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  useEffect(() => {
    // Check if user was logged out due to inactivity
    const reason = sessionStorage.getItem('logout_reason');
    if (reason === 'inactivity') {
        setLogoutReason("Vous avez été déconnecté par sécurité après 15 minutes d'inactivité.");
        sessionStorage.removeItem('logout_reason');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLogoutReason(null);
    setIsLoading(true);
    try {
      // On passe maintenant password et rememberMe
      const success = await login(email, password, rememberMe);
      if (!success) {
          setError("Identifiants incorrects ou mot de passe invalide.");
      }
    } catch {
      setError("Erreur technique lors de la connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    addNotification("Veuillez contacter l'administrateur pour réinitialiser votre mot de passe.", "INFO");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 md:p-6 font-sans transition-colors duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-fit md:h-[750px] border border-white dark:border-slate-800 relative">
        
        {/* Visual Side (Sky Blue Theme) */}
        <div className="md:w-1/2 bg-[#87CEEB] relative p-8 md:p-12 text-white flex flex-col justify-between overflow-hidden shrink-0">
           {/* Decorative Blobs */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#0EA5E9] rounded-full blur-[100px] opacity-30 -ml-20 -mb-20"></div>
           
           <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-sm">
                 <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-lg tracking-wide text-white drop-shadow-sm">Class Connect</span>
           </div>

           <div className="relative z-10 my-8 md:my-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 md:mb-6 tracking-tight text-white drop-shadow-sm">
                 Le futur de<br/><span className="text-[#0C4A6E]">l'éducation.</span>
              </h1>
              <p className="text-[#0C4A6E]/80 text-base md:text-lg max-w-sm leading-relaxed font-medium">
                 Organisez, Connectez, Partagez. Une plateforme unifiée pour votre réussite.
              </p>
           </div>

           <div className="relative z-10 flex flex-wrap gap-3 md:gap-4 text-[#0C4A6E] text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/20 inline-block self-start p-3 rounded-xl backdrop-blur-sm border border-white/20">
              <span>Sécurisé</span> • <span>Rapide</span> • <span>Intuitif</span>
           </div>
        </div>

        {/* Form Side */}
        <div className="md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white dark:bg-slate-900 relative transition-colors duration-500 overflow-y-auto">
           <div className="max-w-sm mx-auto w-full">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Bienvenue</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm md:text-base">Entrez vos accès pour continuer.</p>
              
              {logoutReason && (
                  <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-4 rounded-xl text-sm font-bold flex items-start gap-2 border border-orange-100 dark:border-orange-800 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      {logoutReason}
                  </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Email</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-4 w-5 h-5 text-[#87CEEB]" />
                       <input 
                         type="email" 
                         required
                         value={email}
                         onChange={e => setEmail(e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-[#87CEEB] focus:ring-4 focus:ring-[#87CEEB]/20 rounded-2xl py-4 pl-12 pr-4 font-medium outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                         placeholder="nom@ecole.com"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Mot de passe</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-4 w-5 h-5 text-[#87CEEB]" />
                       <input 
                         type={showPassword ? "text" : "password"} 
                         value={password}
                         onChange={e => setPassword(e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-[#87CEEB] focus:ring-4 focus:ring-[#87CEEB]/20 rounded-2xl py-4 pl-12 pr-12 font-medium outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                         placeholder="••••••••"
                         required
                       />
                       <button 
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-4 top-4 text-slate-400 dark:text-slate-500 hover:text-[#87CEEB] transition"
                         title={showPassword ? "Masquer" : "Afficher"}
                       >
                         {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                       </button>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                       <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${rememberMe ? 'bg-[#87CEEB] border-[#87CEEB]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-[#87CEEB]'}`}>
                          {rememberMe && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                       </div>
                       <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="hidden" />
                       <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">Rester connecté</span>
                    </label>

                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className="text-sm font-bold text-[#0284C7] dark:text-[#38BDF8] hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                 </div>

                 {error && (
                   <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
                      <ShieldCheck className="w-5 h-5" /> {error}
                   </div>
                 )}

                 <button 
                   type="submit"
                   disabled={isLoading}
                   className="w-full btn-primary font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                 >
                   {isLoading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight className="w-5 h-5" /></>}
                 </button>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};
