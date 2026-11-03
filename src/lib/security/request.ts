export function refuseAiPost(request: { headers: Headers }): Response | null {
  const site = request.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  if (site === "cross-site") {
    return Response.json(
      { error: "This request was refused." },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }
  const media = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (media !== "application/json") {
    return Response.json(
      { error: "Send the request as JSON." },
      { status: 415, headers: { "cache-control": "no-store" } },
    );
  }
  return null;
}
