import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Fix: Declare Deno global to avoid TypeScript errors in environments without Deno types
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
}

serve(async (req) => {
  // Gestion des requêtes OPTIONS (CORS Preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Récupération et Validation du Payload
    const { to, subject, html, senderName, senderEmail }: EmailPayload = await req.json();

    if (!to || !to.length || !subject || !html) {
      throw new Error("Champs manquants (to, subject, html)");
    }

    // 2. Récupération de la clé API (Environment Secret)
    // Cette variable doit être définie via : supabase secrets set SENDGRID_API_KEY=votre_clé
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    
    if (!SENDGRID_API_KEY) {
      console.error("Erreur configuration: SENDGRID_API_KEY manquant.");
      throw new Error("Configuration serveur incomplète : Clé API manquante.");
    }

    // 3. Construction de la requête SendGrid
    const payload = {
      personalizations: [{
        to: to.map((email) => ({ email })),
        subject: subject,
      }],
      from: {
        email: senderEmail || "no-reply@sunuclasse.com", // Doit être une identité vérifiée sur SendGrid
        name: senderName || "SunuClasse",
      },
      content: [{
        type: "text/html",
        value: html,
      }],
    };

    // 4. Envoi à SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // 5. Gestion de la réponse
    if (response.ok || response.status === 202) {
      return new Response(JSON.stringify({ message: "Email envoyé avec succès" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      const errorData = await response.text();
      console.error("Erreur SendGrid:", errorData);
      return new Response(JSON.stringify({ error: "Erreur SendGrid", details: errorData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

  } catch (error: any) {
    console.error("Erreur interne:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});