
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Mail, Lock, Loader2, ShieldCheck, GraduationCap, Eye, EyeOff, AlertTriangle, User, School, BookOpen } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, addNotification } = useApp();
  const [email, setEmail] = useState('faye@ecole.com'); 
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

  const executeLogin = async (emailVal: string, passVal: string) => {
    setError('');
    setLogoutReason(null);
    setIsLoading(true);
    try {
      const success = await login(emailVal, passVal, rememberMe);
      if (!success) {
          setError("Identifiants incorrects ou utilisateur inconnu.");
          setIsLoading(false);
      }
    } catch {
      setError("Erreur technique lors de la connexion.");
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100 dark:border-slate-800">
        
        {/* LEFT SIDE: BRANDING & INFO */}
        <div className="md:w-1/2 bg-[#0EA5E9] dark:bg-slate-800 p-12 text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/30 rounded-full blur-2xl -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/20">
                    <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-black mb-4 tracking-tight">Class Connect+</h1>
                <p className="text-sky-100 text-lg font-medium leading-relaxed">
                    La plateforme éducative tout-en-un pour gérer votre établissement avec simplicité et efficacité.
                </p>
            </div>

            <div className="relative z-10 space-y-4 mt-12">
               <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <ShieldCheck className="w-6 h-6 text-sky-200" />
                  <div>
                      <p className="font-bold text-sm">Sécurisé & Fiable</p>
                      <p className="text-xs text-sky-100 opacity-80">Données chiffrées et protection avancée.</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <User className="w-6 h-6 text-sky-200" />
                  <div>
                      <p className="font-bold text-sm">Multi-Rôles</p>
                      <p className="text-xs text-sky-100 opacity-80">Interface adaptée pour Profs, Élèves et Admin.</p>
                  </div>
               </div>
            </div>

            <p className="text-xs text-sky-200/60 mt-8 relative z-10">© 2025 Serigne Fallou Faye. All rights reserved.</p>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div className="max-w-md mx-auto w-full">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bon retour !</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Connectez-vous pour accéder à votre espace.</p>

                {logoutReason && (
                    <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 text-sm rounded-xl flex items-start gap-3 border border-orange-100 dark:border-orange-800">
                       <AlertTriangle className="w-5 h-5 shrink-0" />
                       <p>{logoutReason}</p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-800 animate-in shake">
                       <AlertTriangle className="w-5 h-5" />
                       <p className="font-bold">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email académique</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#0EA5E9] transition" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0EA5E9] transition font-medium"
                                placeholder="nom@ecole.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Mot de passe</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#0EA5E9] transition" />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-[#0EA5E9] transition font-medium"
                                placeholder="••••••••"
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:border-[#0EA5E9] checked:bg-[#0EA5E9] transition-all"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                            </div>
                            <span className="text-sm text-slate-500 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-300 transition">Se souvenir de moi</span>
                        </label>
                        <a href="#" className="text-sm font-bold text-[#0EA5E9] hover:text-[#0284C7] hover:underline">Mot de passe oublié ?</a>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-sky-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Se connecter <ArrowRight className="w-5 h-5" /></>}
                    </button>
                </form>

            </div>
        </div>
      </div>
    </div>
  );
};
