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
    const { videoScript } = await req.json();

    if (!videoScript) {
      return new Response(
        JSON.stringify({ error: "Le script vidéo est requis" }),
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

Ton rôle est d'utiliser les 45 STRUCTURES DE TITRES PROUVÉES ci-dessous pour générer 5 titres OPTIMISÉS basés sur le script vidéo fourni.

# 45 STRUCTURES DE TITRES YOUTUBE QUI MARCHENT:

## Structures de Curiosité et Contraste:
1. Voici ce qui arrive TOUJOURS avant (Événement Dramatique)
2. Les (Entités) les plus étranges jamais créées...
3. (Objection). (Objection). Puis (Action)... Vous N'allez Pas le Croire!
4. Quand les "(Faux)" rejoignent la vraie (Entité)
5. (Action) Faite Devant le (Créateur Original)
6. (Activité) en étant (Activité Inattendue ou Opposée)
7. (Personne) Réagit à (Personne Adjacente Faisant une Activité Contrastée)
8. [Personne] Fait [Chose Inattendue] (Tutoriel [Activité])
9. (Personne) essaie (Chose Étrangère) pour la première fois
10. Nous avons mis une (Chose Chère) dans notre (Chose Bon Marché)
11. Que se Passe-t-il Quand Vous (Action Absurde)?

## Structures Autorité et Révélation:
12. Ce que les (Figures d'Autorité) comprenaient à propos du (Problème) que nous avons oublié
13. La VÉRITÉ sur (Activité) que les PROS connaissent
14. Ce que les (Figures d'Autorité) Comprennent et que la Plupart des Gens Ne Comprennent Pas

## Structures Listes et Exhaustivité:
15. J'ai Testé Toutes les (Outils) GRATUITS
16. (Entité) Expliquée en 8 Minutes
17. 5 (Entités Saisonnières) que les (Figures d'Autorité) (Action) Toujours
18. 9 Habitudes Étranges que vous prenez (dans l'Entité)
19. 7 Erreurs de Débutant (Entité) à Éviter
20. 10 Free AI (Outils)
21. 24 HEURES AVEC une [Nouvelle Entité]
22. Notre Routine Quotidienne (En tant que Premiers [Profession])
23. 10 (Entités Désirables)
24. 11 des (Articles) Les Plus Falsifiés Au Monde

## Structures Négativité et Avertissement:
25. Ne Fais JAMAIS ces 4 choses à (Lieu)
26. Oui, Votre (Bien) VOUS (Résultat Indésirable)! 8 Erreurs et comment les corriger
27. (Action) Toujours votre (Bien) (ne le Fais jamais [Action])
28. Le SEUL Signe que (Quelque Chose d'Effrayant est Vrai)
29. Les Difficultés de (Situation Spécifique)
30. Si Vous Faites (Meilleure Pratique), Vous Devez Regarder Ceci
31. La Chasse au Roi de l'(Entité Négative)
32. Le (Principe) Si Vous Ne Changez Pas Ceci, (Entité) Ne Changera Jamais
33. 5 Signes d'Avertissement (Quelque Chose Doit S'Améliorer)
34. Ce que J'aurais Aimé Savoir AVANT (Action)

## Structures Désir et Objectif:
35. La Seule (Entité) qu'ils aient jamais faite qui (Atteint un grand objectif)
36. Le SEUL (Objet) sans AUCUNE LIMITE
37. Comment (Action Simple) (Grand Résultat)
38. 6 (Choses Faciles) qui rendent TOUT (Objectif Difficile)!
39. Top 11 Sans (Chose Difficile) (Choses Désirables) pour (Public)
40. Le Moyen le Plus Rapide d'atteindre [Grand Objectif] (Depuis N'importe Quel Point)
41. Ces PETITS CHANGEMENTS coupent 90% des (Problèmes)

## Structures Actualité et Suivi:
42. Cette (Entité) d'1 Minute Vous Rend (État Désiré)
43. J'ai Créé une (Entité) Anonyme pour "Prouver que ce n'est pas la Chance"
44. J'ai Essayé (Tendance) pendant 3 Mois. Voici ce qui s'est Passé
45. Fuites (Nouveau Produit) - 10 Raisons de Mettre à Jour CETTE année!
46. (Entité Polarisante) a ENFIN un Concurrent

RÈGLES STRICTES:
1. COMBINE les exemples de titres fournis par l'utilisateur ET les 45 structures ci-dessus
2. Identifie les patterns dans les exemples de l'utilisateur qui correspondent aux structures prouvées
3. Tes 5 titres doivent:
   - Utiliser au moins 3 structures différentes parmi les 45
   - REPRODUIRE le style des exemples de l'utilisateur
   - Être optimisés pour le CTR YouTube
   - Être adaptés au contenu du script
   - Rester entre 50-70 caractères
   - Créer de la curiosité ou promettre de la valeur
   - Utiliser des mots puissants et émotionnels

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

    const userMessage = `SCRIPT DE LA VIDÉO:\n${videoScript}\n\nGénère 5 titres YouTube optimisés en utilisant les 45 structures de titres prouvées ci-dessus. Les titres doivent être adaptés au contenu du script et maximiser le taux de clic (CTR).`;

    console.log("Generating titles with Gemini...");
    console.log("Using 45 proven title structures");

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
