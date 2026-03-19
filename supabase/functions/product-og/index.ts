import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bot user agents that need OG meta tags
const BOT_UA_PATTERN = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot|yandex|baiduspider|duckduckbot|ia_archiver|semrush|ahrefsbot|mj12bot|preview/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("id");
    const siteUrl = url.searchParams.get("site_url") || "https://pennyekart.com";
    const coupon = url.searchParams.get("coupon");

    if (!productId) {
      return new Response("Missing product id", { status: 400 });
    }

    const couponParam = coupon ? `?coupon=${encodeURIComponent(coupon)}` : "";
    const productUrl = `${siteUrl}/product/${productId}${couponParam}`;

    // Check if request is from a bot/crawler
    const userAgent = req.headers.get("user-agent") || "";
    const isBot = BOT_UA_PATTERN.test(userAgent);

    // For real users, redirect immediately with 302 — no need to fetch product data
    if (!isBot) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: productUrl },
      });
    }

    // For bots, fetch product data and serve OG meta tags
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let product: any = null;

    const { data } = await supabase
      .from("products")
      .select("id, name, price, mrp, description, image_url, category")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      product = data;
    } else {
      const { data: sellerData } = await supabase
        .from("seller_products")
        .select("id, name, price, mrp, description, image_url, category")
        .eq("id", productId)
        .eq("is_active", true)
        .eq("is_approved", true)
        .maybeSingle();
      if (sellerData) {
        product = sellerData;
      }
    }

    if (!product) {
      return new Response(null, {
        status: 302,
        headers: { Location: siteUrl },
      });
    }

    const title = product.name || "Product";
    const description = product.description
      ? product.description.substring(0, 160)
      : `Buy ${product.name} at ₹${product.price}${product.mrp > product.price ? ` (MRP: ₹${product.mrp})` : ""} on Pennyekart`;
    const image = product.image_url || `${siteUrl}/placeholder.svg`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - Pennyekart</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:url" content="${escapeHtml(productUrl)}" />
  <meta property="og:site_name" content="Pennyekart" />
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="INR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- WhatsApp -->
  <meta property="og:image:type" content="image/jpeg" />

  <!-- Redirect to actual product page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(productUrl)}">${escapeHtml(title)}</a>...</p>
  <script>window.location.href="${escapeJs(productUrl)}";</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal error", { status: 500 });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
