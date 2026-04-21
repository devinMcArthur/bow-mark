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

  const filename = f.originalFilename;
  return [
    `**File ID: ${f.documentId}**`,
    filename ? `Filename: ${filename}` : null,
    `Type: ${summary?.documentType || "Unknown"}`,
    `URL: ${serverBase}/api/enriched-files/${f.documentId.toString()}`,
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
