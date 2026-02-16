import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const docsAssets = {
  "swagger-ui.css": {
    fileName: "swagger-ui.css",
    contentType: "text/css; charset=utf-8"
  },
  "swagger-ui-bundle.js": {
    fileName: "swagger-ui-bundle.js",
    contentType: "application/javascript; charset=utf-8"
  },
  "swagger-ui-standalone-preset.js": {
    fileName: "swagger-ui-standalone-preset.js",
    contentType: "application/javascript; charset=utf-8"
  },
  "favicon-16x16.png": {
    fileName: "favicon-16x16.png",
    contentType: "image/png"
  },
  "favicon-32x32.png": {
    fileName: "favicon-32x32.png",
    contentType: "image/png"
  }
} as const;

type DocsAssetName = keyof typeof docsAssets;

function isDocsAssetName(value: string): value is DocsAssetName {
  return value in docsAssets;
}

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: { file: string } }
) {
  if (!isDocsAssetName(params.file)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const asset = docsAssets[params.file];
  const assetPath = path.join(
    process.cwd(),
    "node_modules",
    "swagger-ui-dist",
    asset.fileName
  );

  let data: Buffer;
  try {
    data = await readFile(assetPath);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=86400"
    }
  });
}
