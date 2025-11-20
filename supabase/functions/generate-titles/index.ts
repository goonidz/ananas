import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoScript, exampleTitles } = await req.json();

    if (!videoScript) {
      return new Response(
        JSON.stringify({ error: "Le script vidéo est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!exampleTitles || !Array.isArray(exampleTitles) || exampleTitles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Les exemples de titres sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu es un expert en optimisation de titres YouTube pour maximiser le CTR (taux de clic).

Ton rôle est d'ANALYSER les exemples de titres fournis et de générer 5 titres SIMILAIRES mais UNIQUES pour une nouvelle vidéo.

CONTEXTE IMPORTANT:
- Tu vas recevoir des exemples de titres qui ont bien fonctionné
- Tu dois ANALYSER leur structure, leur style, leurs patterns, leur longueur
- Tu dois créer des titres qui SUIVENT CES MÊMES PATTERNS tout en étant adaptés au nouveau contenu

RÈGLES STRICTES:
1. OBSERVE ATTENTIVEMENT les patterns des exemples:
   - Structure (questions, affirmations, promesses, etc.)
   - Utilisation des émojis
   - Capitalisation et ponctuation
   - Longueur approximative (YouTube recommande 60-70 caractères)
   - Mots-clés accrocheurs
   - Utilisation de chiffres, parenthèses, crochets

2. Tes 5 titres doivent:
   - REPRODUIRE le style et les patterns des exemples
   - Être optimisés pour le CTR YouTube
   - Être adaptés au contenu du script fourni
   - Rester uniques et ne pas copier exactement les exemples
   - Utiliser des mots puissants et émotionnels
   - Créer de la curiosité ou promettre de la valeur

3. LONGUEUR: Vise 50-70 caractères pour une visibilité optimale sur mobile

4. Format de sortie: Retourne UNIQUEMENT un JSON avec ce format exact:
{
  "titles": [
    "Titre 1 optimisé...",
    "Titre 2 avec variation...",
    "Titre 3 différent...",
    "Titre 4 unique...",
    "Titre 5 créatif..."
  ]
}`;

    const examplesList = exampleTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const userMessage = `EXEMPLES DE TITRES À REPRODUIRE (analyse leur structure et style):\n\n${examplesList}\n\nSCRIPT DE LA VIDÉO:\n${videoScript}\n\nGénère 5 titres YouTube optimisés en REPRODUISANT le style et les patterns des exemples ci-dessus, adaptés au contenu du script.`;

    console.log("Generating titles with Gemini...");
    console.log(`Analyzing ${exampleTitles.length} example titles`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes dépassée, veuillez réessayer plus tard" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédit insuffisant, veuillez ajouter des crédits à votre workspace" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération des titres" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Réponse invalide de l'IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    let titles;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        titles = parsed.titles;
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      console.log("Raw content:", content);
      return new Response(
        JSON.stringify({ error: "Erreur lors du parsing de la réponse" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(titles) || titles.length === 0) {
      console.error("Invalid titles array:", titles);
      return new Response(
        JSON.stringify({ error: "Format de réponse invalide" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully generated ${titles.length} titles`);

    return new Response(
      JSON.stringify({ titles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-titles function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
