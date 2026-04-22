import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "IronKeeper/1.0 (https://ironkeeper.lovable.app; contact@ironkeeper.app)";

/** Normalise a hit from search.openfoodfacts.org into the same shape the client expects
 *  (matches the legacy world.openfoodfacts.org product structure). */
// deno-lint-ignore no-explicit-any
function normaliseHit(hit: any) {
  const brands = Array.isArray(hit.brands) ? hit.brands.filter(Boolean).join(", ") : hit.brands;
  return {
    code: hit.code,
    product_name: hit.product_name,
    brands,
    brands_tags: hit.brands_tags,
    categories_tags_en: hit.categories_tags_en,
    serving_size: hit.serving_size,
    nutriments: hit.nutriments,
    image_front_small_url: hit.image_front_small_url,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const barcode = url.searchParams.get("barcode") || "";

  try {
    // ---------- Barcode lookup ----------
    if (barcode) {
      const offUrl = `https://uk.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_size,nutriments,image_front_small_url`;
      const res = await fetch(offUrl, { headers: { "User-Agent": UA } });
      if (!res.ok) {
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
    }

    // ---------- Text search ----------
    // Primary: search.openfoodfacts.org (Elasticsearch-backed, fast, reliable)
    // Fallback: world.openfoodfacts.org/api/v2/search (slower, sometimes 503)
    const fields = "code,product_name,brands,brands_tags,categories_tags_en,serving_size,nutriments,image_front_small_url";

    // Country filter via field-style query (Lucene syntax)
    const qExpr = `${query} +countries_tags:"en:united-kingdom"`;
    const primaryUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(qExpr)}&page_size=25&page=${page}&fields=${fields}`;

    let res = await fetch(primaryUrl, { headers: { "User-Agent": UA } });

    if (res.ok) {
      // deno-lint-ignore no-explicit-any
      const data: any = await res.json();
      const hits = Array.isArray(data?.hits) ? data.hits : [];
      const products = hits.map(normaliseHit);
      return new Response(
        JSON.stringify({ count: data.count ?? products.length, page, products }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Primary failed — try the legacy API as a fallback
    await res.text();
    const fallbackUrl = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&countries_tags_en=united-kingdom&sort_by=popularity_key&page_size=25&page=${page}&fields=${fields}`;
    res = await fetch(fallbackUrl, { headers: { "User-Agent": UA } });

    if (!res.ok) {
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
