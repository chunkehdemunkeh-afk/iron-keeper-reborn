import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") || "1";
  const barcode = url.searchParams.get("barcode") || "";

  try {
    let offUrl: string;
    if (barcode) {
      // Barcode endpoint stays unchanged — uk subdomain works well for UK barcodes
      offUrl = `https://uk.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_size,nutriments,image_front_small_url`;
    } else {
      // Upgraded v2 search API: country-filtered to UK, sorted by popularity, brand-aware
      const fields = "code,product_name,brands,brands_tags,categories_tags_en,serving_size,nutriments,image_front_small_url";
      offUrl = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&countries_tags_en=united-kingdom&sort_by=popularity_key&page_size=25&page=${page}&fields=${fields}`;
    }

    const res = await fetch(offUrl, {
      headers: {
        "User-Agent": "IronKeeper/1.0 (https://ironkeeper.lovable.app; contact@ironkeeper.app)",
      },
    });

    if (!res.ok) {
      // Consume the body to avoid resource leaks
      await res.text();
      return new Response(
        JSON.stringify({ products: [], error: "SERVICE_UNAVAILABLE", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.text();
    return new Response(data, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ products: [], error: (error as Error).message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
