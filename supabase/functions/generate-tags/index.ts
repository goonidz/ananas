import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { videoScript, videoTitle } = await req.json();

    if (!videoScript) {
      return new Response(
        JSON.stringify({ error: "videoScript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating tags for video:", videoTitle);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert en SEO YouTube. Génère exactement 10 mots-clés/tags pertinents pour cette vidéo.

RÈGLES IMPORTANTES:
1. Génère EXACTEMENT 10 tags
2. Les tags doivent être des MOTS-CLÉS GÉNÉRAUX (1-3 mots maximum), PAS des phrases de recherche complètes
3. Génère les tags DANS LA MÊME LANGUE que le script de la vidéo (si le script est en anglais, tags en anglais; si en français, tags en français, etc.)
4. Privilégie des termes larges et génériques qui couvrent le sujet
5. Inclus le sujet principal et des termes connexes populaires
6. Évite les tags trop spécifiques ou trop longs
7. Pense aux catégories et thèmes généraux

EXEMPLES DE BONS TAGS:
- "investing", "ETF", "finance", "stock market", "money"
- "investissement", "bourse", "argent", "épargne", "finances"

EXEMPLES DE MAUVAIS TAGS (trop spécifiques):
- "how to invest in ETF 2024", "best ETF for beginners to buy"

Réponds UNIQUEMENT avec un tableau JSON de 10 strings, sans explication.
Exemple: ["tag1", "tag2", "tag3", ...]`;

    const userContent = `TITRE DE LA VIDÉO: ${videoTitle || "Sans titre"}

SCRIPT DE LA VIDÉO:
${videoScript.substring(0, 4000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response:", content);

    // Parse JSON response
    let tags: string[];
    try {
      // Clean potential markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/```json\n?/, "").replace(/```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```\n?/, "").replace(/```$/, "");
      }
      
      tags = JSON.parse(cleanContent.trim());
      
      if (!Array.isArray(tags)) {
        throw new Error("Response is not an array");
      }
      
      // Ensure we have strings and limit to 10
      tags = tags
        .filter(tag => typeof tag === 'string')
        .slice(0, 10);
        
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse tags from AI response");
    }

    console.log("Generated tags:", tags);

    return new Response(
      JSON.stringify({ tags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-tags:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate tags";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
