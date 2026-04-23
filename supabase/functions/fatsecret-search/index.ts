import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OAuth 1.0 HMAC-SHA1 signing (no IP whitelisting required)
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildOAuthUrl(baseUrl: string, params: Record<string, string>): Promise<string> {
  const consumerKey = Deno.env.get("FATSECRET_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("FATSECRET_CONSUMER_SECRET");
  if (!consumerKey || !consumerSecret) throw new Error("FatSecret credentials not configured");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };

  // Combine all params
  const allParams = { ...params, ...oauthParams };

  // Sort and encode
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");

  // Signature base string
  const signatureBase = `GET&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&`;

  const signature = await hmacSha1(signingKey, signatureBase);
  allParams["oauth_signature"] = signature;

  const qs = Object.entries(allParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  return `${baseUrl}?${qs}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth gate: validate JWT before consuming paid FatSecret quota ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(
      JSON.stringify({ foods: null, error: "UNAUTHORIZED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables not configured");
      return new Response(
        JSON.stringify({ foods: null, error: "SERVER_MISCONFIGURED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ foods: null, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("Auth verification failed:", e);
    return new Response(
      JSON.stringify({ foods: null, error: "UNAUTHORIZED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "0");
  const barcode = url.searchParams.get("barcode") || "";
  const foodId = url.searchParams.get("food_id") || "";
  const region = url.searchParams.get("region") || "GB";
  const language = url.searchParams.get("language") || "en";

  try {
    const baseUrl = "https://platform.fatsecret.com/rest/server.api";
    let params: Record<string, string>;

    if (foodId) {
      // Direct food detail lookup by ID — returns full nutrition profile
      params = {
        method: "food.get",
        food_id: foodId,
        format: "json",
        region,
        language,
      };
    } else if (barcode) {
      params = {
        method: "food.find_id_for_barcode",
        barcode,
        format: "json",
        region,
        language,
      };
    } else {
      // Upgraded to v3 — better brand-aware ranking, includes food attributes
      params = {
        method: "foods.search.v3",
        search_expression: query,
        format: "json",
        max_results: "20",
        page_number: page.toString(),
        include_food_attributes: "true",
        flag_default_serving: "true",
        region,
        language,
      };
    }

    const signedUrl = await buildOAuthUrl(baseUrl, params);
    const res = await fetch(signedUrl);

    if (!res.ok) {
      const text = await res.text();
      console.error(`FatSecret API error [${res.status}]:`, text);
      return new Response(
        JSON.stringify({ foods: null, error: "API_ERROR" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();

    // For barcode lookup, we need a second call to get the food details
    if (barcode && data.food_id?.value) {
      const detailParams = {
        method: "food.get",
        food_id: data.food_id.value,
        format: "json",
        region,
        language,
      };
      const detailUrl = await buildOAuthUrl(baseUrl, detailParams);
      const detailRes = await fetch(detailUrl);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        return new Response(JSON.stringify(detailData), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("FatSecret edge function error:", error);
    return new Response(
      JSON.stringify({ foods: null, error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
