import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MiniMax voice IDs
const MINIMAX_VOICES: Record<string, string> = {
  // English voices
  "english_narrator": "English_expressive_narrator",
  "english_male": "Calm_American_Man",
  "english_female": "Warm_American_Woman",
  "english_british": "British_Gentleman",
  // French voices
  "french_male": "French_Male",
  "french_female": "French_Female",
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

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { script, voice = 'english_narrator', model = 'speech-2.6-hd', projectId } = await req.json();

    if (!script) {
      throw new Error("Script is required");
    }

    console.log("Generating audio with MiniMax, script length:", script.length, "model:", model);

    // Get user's MiniMax API key from Vault
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin.rpc(
      'get_user_api_key_for_service',
      { target_user_id: user.id, key_name: 'minimax' }
    );

    if (apiKeyError || !apiKeyData) {
      console.error("Error fetching MiniMax API key:", apiKeyError);
      return new Response(
        JSON.stringify({ error: "MiniMax API key not configured. Please add it in your profile." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const voiceId = MINIMAX_VOICES[voice.toLowerCase()] || MINIMAX_VOICES.english_narrator;

    console.log("Calling MiniMax TTS with voice:", voice, "voiceId:", voiceId, "model:", model);

    // Call MiniMax TTS API
    const ttsResponse = await fetch(
      'https://api.minimax.io/v1/t2a_v2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKeyData}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model, // 'speech-2.6-hd' or 'speech-2.6-turbo'
          text: script,
          stream: false,
          language_boost: "auto",
          output_format: "hex",
          voice_setting: {
            voice_id: voiceId,
            speed: 1,
            vol: 1,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: "mp3",
            channel: 1,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("MiniMax API error:", ttsResponse.status, errorText);
      throw new Error(`MiniMax API error: ${ttsResponse.status}`);
    }

    const result = await ttsResponse.json();
    
    if (result.base_resp?.status_code !== 0) {
      console.error("MiniMax API error:", result.base_resp);
      throw new Error(`MiniMax API error: ${result.base_resp?.status_msg || 'Unknown error'}`);
    }

    console.log("Audio generated, uploading to storage...");

    // Decode hex audio to binary
    const hexAudio = result.data?.audio;
    if (!hexAudio) {
      throw new Error("No audio data in response");
    }

    // Convert hex string to Uint8Array
    const audioBytes = new Uint8Array(hexAudio.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${user.id}/${projectId || 'temp'}/${timestamp}_minimax_generated.mp3`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('audio-files')
      .upload(filename, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio-files')
      .getPublicUrl(filename);

    console.log("Audio uploaded to:", publicUrl);

    // Calculate duration from API response
    const audioDuration = result.extra_info?.audio_length 
      ? Math.round(result.extra_info.audio_length / 1000) 
      : Math.round(script.split(/\s+/).length / 2.5);

    return new Response(
      JSON.stringify({ 
        audioUrl: publicUrl,
        duration: audioDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Audio generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
