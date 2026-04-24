import type { ResolvedDocument } from "./fileDocuments/types";

export function buildFileEntry(f: ResolvedDocument, serverBase: string, token: string): string {
  // Cast enrichmentSummary to any to read into the known summary shape:
  // { overview, documentType, keyTopics, chunks? }
  const summary = f.enrichmentSummary as any;
  const pageIndex = f.enrichmentPageIndex as Array<{ page: number; summary: string }> | undefined;
  const chunks = summary?.chunks as Array<{
    startPage: number;
    endPage: number;
    overview: string;
    keyTopics: string[];
  }> | undefined;

  // Docs with a page index: lean entry — the detail is available via list_document_pages
  const navigationHint =
    pageIndex && pageIndex.length > 0
      ? `\nNavigation: ${pageIndex.length}-page index available — call list_document_pages to see page-by-page breakdown before loading`
      : chunks && chunks.length > 1
      ? `\nPage Sections:\n${chunks
          .map((c) => `  Pages ${c.startPage}–${c.endPage}: ${c.keyTopics.slice(0, 6).join(", ")}`)
          .join("\n")}`
      : "";

  const filename = f.originalFilename ?? "Untitled";
  const docType = summary?.documentType || "Unknown";
  const url = `${serverBase}/api/documents/${f.documentId.toString()}`;
  // Header leads with the filename (what Claude should refer to when
  // talking about this file). The URL is given directly below with a
  // citation template so Claude sees the exact markdown to emit — avoids
  // falling back to raw "File ID: xxx" prose when it can't cite a page.
  // folderPath ("/" means scope root) is shown when non-root so the bot
  // can use it as a soft signal about how the user has organized things.
  const folderHint =
    f.folderPath && f.folderPath !== "/" ? ` · in ${f.folderPath}` : "";
  return [
    `**${filename}** (${docType})${folderHint}`,
    `Link: [[${filename}]](${url}) · Page cite: [[${docType}, p.N]](${url}#page=N)`,
    summary
      ? `Overview: ${summary.overview}\nKey Topics: ${(summary.keyTopics as string[]).join(", ")}${navigationHint}`
      : "Summary: not yet available",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface FileIndexResult {
  fileIndex: string;
  specFileIndex: string;
  pendingNotice: string;
}

export function buildFileIndex(
  jobsiteFiles: ResolvedDocument[],
  specFiles: ResolvedDocument[],
  serverBase: string,
  token: string
): FileIndexResult {
  const readyFiles = jobsiteFiles.filter((f) => f.enrichmentStatus === "ready");
  const pendingFiles = jobsiteFiles.filter(
    (f) => f.enrichmentStatus === "pending" || f.enrichmentStatus === "processing"
  );
  const readySpecFiles = specFiles.filter((f) => f.enrichmentStatus === "ready");

  const fileIndex = readyFiles
    .map((f) => buildFileEntry(f, serverBase, token))
    .join("\n\n---\n\n");
  const specFileIndex = readySpecFiles
    .map((f) => buildFileEntry(f, serverBase, token))
    .join("\n\n---\n\n");
  const pendingNotice =
    pendingFiles.length > 0
      ? `\n\nNOTE: ${pendingFiles.length} document(s) are still being processed.`
      : "";

  return { fileIndex, specFileIndex, pendingNotice };
}
