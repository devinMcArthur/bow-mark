export function buildFileEntry(f: any, serverBase: string, token: string): string {
  const summary = f.summary as any;
  const chunks = summary?.chunks as Array<{ startPage: number; endPage: number; overview: string; keyTopics: string[] }> | undefined;
  const chunkIndex =
    chunks && chunks.length > 1
      ? `\nPage Sections:\n${chunks.map((c) => `  Pages ${c.startPage}–${c.endPage}: ${c.keyTopics.slice(0, 6).join(", ")}`).join("\n")}`
      : "";
  const filename = f.file?.description;
  return [
    `**File ID: ${f._id}**`,
    filename ? `Filename: ${filename}` : null,
    `Type: ${summary?.documentType || f.documentType || "Unknown"}`,
    `URL: ${serverBase}/api/enriched-files/${f._id}?token=${token}`,
    summary
      ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}${chunkIndex}`
      : "Summary: not yet available",
  ].filter(Boolean).join("\n");
}

export interface FileIndexResult {
  fileIndex: string;
  specFileIndex: string;
  pendingNotice: string;
}

export function buildFileIndex(
  jobsiteFiles: any[],
  specFiles: any[],
  serverBase: string,
  token: string
): FileIndexResult {
  const readyFiles = jobsiteFiles.filter((f: any) => f.summaryStatus === "ready");
  const pendingFiles = jobsiteFiles.filter(
    (f: any) => f.summaryStatus === "pending" || f.summaryStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f: any) => f.summaryStatus === "ready");

  const fileIndex = readyFiles.map((f) => buildFileEntry(f, serverBase, token)).join("\n\n---\n\n");
  const specFileIndex = readySpecFiles.map((f) => buildFileEntry(f, serverBase, token)).join("\n\n---\n\n");
  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed.`
      : "";

  return { fileIndex, specFileIndex, pendingNotice };
}
