
import { EmailConfig } from '../types';
import { supabase } from './supabaseClient';

/**
 * Service pour gérer l'envoi d'emails de manière sécurisée.
 * 
 * MAILTO: Ouvre le client mail par défaut.
 * SENDGRID: Appelle une Supabase Edge Function ('send-email') pour masquer la clé API et éviter les erreurs CORS.
 */
export const sendEmail = async (
  config: EmailConfig,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> => {
  
  // 1. Méthode Client-side (Mailto)
  if (config.provider === 'MAILTO') {
    const bodyText = htmlContent.replace(/<br\s*\/?>/gi, '\r\n').replace(/<[^>]+>/g, '');
    // Limitation de longueur pour mailto pour éviter les erreurs de navigateur
    const truncatedBody = bodyText.length > 1500 ? bodyText.substring(0, 1500) + '...' : bodyText;
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(truncatedBody)}`;
    window.location.href = mailtoLink;
    return { success: true };
  }

  // 2. Méthode Server-side (SendGrid via Edge Function)
  if (config.provider === 'SENDGRID') {
    try {
      // On appelle la fonction "send-email" déployée sur Supabase
      // La clé API SendGrid doit être stockée dans les secrets Supabase (SENDGRID_API_KEY)
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: to.split(',').map(e => e.trim()), // Transforme en tableau
          subject: subject,
          html: htmlContent,
          senderName: config.senderName || 'SunuClasse',
          senderEmail: config.senderEmail // Optionnel si défini par défaut dans la fonction
        }
      });

      if (error) {
        console.error("Erreur Edge Function:", error);
        // Si la fonction n'existe pas (404), on renvoie un message clair
        if (error.code === 'not_found' || error.status === 404) {
             return { success: false, error: "La fonction 'send-email' n'est pas déployée sur Supabase." };
        }
        return { success: false, error: `Erreur serveur: ${error.message}` };
      }

      return { success: true };

    } catch (err: any) {
      console.error("Erreur d'appel:", err);
      return { success: false, error: "Impossible de contacter le serveur d'envoi." };
    }
  }

  return { success: false, error: "Fournisseur d'email non supporté." };
};
