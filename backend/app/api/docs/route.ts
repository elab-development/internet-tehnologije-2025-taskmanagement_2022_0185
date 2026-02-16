import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const specUrl = "/api/openapi";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Task Management API Docs</title>
    <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; }
      body { background: #f7f9fc; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/assets/swagger-ui-bundle.js" crossorigin></script>
    <script src="/api/docs/assets/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.addEventListener("load", function () {
        window.ui = SwaggerUIBundle({
          url: ${JSON.stringify(specUrl)},
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          persistAuthorization: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout"
        });
      });
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
