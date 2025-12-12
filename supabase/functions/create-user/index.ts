
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Fix: Declare Deno global to avoid TypeScript errors in environments without Deno types
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Gestion des requêtes OPTIONS (CORS Preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialisation du client Supabase avec la clé Service Role pour avoir les droits Admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, name, role, class_id } = await req.json();

    if (!email || !password || !name) {
      throw new Error("Email, mot de passe et nom sont requis.");
    }

    // 1. Création de l'utilisateur dans Supabase Auth
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm l'email
      user_metadata: { name, role, class_id }
    });

    if (createError) throw createError;

    // 2. Création/Vérification du profil dans public.users
    if (user) {
        const { error: insertError } = await supabaseAdmin.from('users').upsert({
            id: user.id,
            email,
            name,
            role: role || 'STUDENT',
            class_id: class_id || null
        });

        if (insertError) {
             console.error("Erreur insertion public.users:", insertError);
        }
    }

    return new Response(JSON.stringify({ user, message: "Utilisateur créé avec succès" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erreur create-user:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
