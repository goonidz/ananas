import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      console.error('REPLICATE_API_KEY is not set')
      throw new Error('REPLICATE_API_KEY is not configured')
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    const body = await req.json()

    // If it's a status check request
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId)
      const prediction = await replicate.predictions.get(body.predictionId)
      console.log("Status check response:", prediction.status)
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If it's a generation request
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: prompt is required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log("Generating image with SeedDream 4, prompt:", body.prompt)
    
    const input: any = {
      prompt: body.prompt,
      width: body.width || 1024,
      height: body.height || 1024,
      num_outputs: body.num_outputs || 1,
      output_format: body.output_format || "webp",
      output_quality: body.output_quality || 80,
    }

    // Add optional parameters if provided
    if (body.seed) input.seed = body.seed
    if (body.guidance_scale) input.guidance_scale = body.guidance_scale
    if (body.num_inference_steps) input.num_inference_steps = body.num_inference_steps
    if (body.image_urls && body.image_urls.length > 0) input.image_urls = body.image_urls

    console.log("SeedDream 4 input parameters:", input)

    const output = await replicate.run(
      "bytedance/seedream-4",
      { input }
    )

    console.log("SeedDream 4 generation complete")
    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("Error in generate-image-seedream function:", error)
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
