import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { searchSuggestions } from "@/services/products";

export const GET = api(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: await searchSuggestions(q.slice(0, 80)) });
});
