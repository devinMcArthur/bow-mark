export type LineItemStatus = "not_started" | "in_progress" | "review" | "approved";

export const LINE_ITEM_STATUSES: LineItemStatus[] = [
  "not_started",
  "in_progress",
  "review",
  "approved",
];

export const STATUS_COLORS: Record<LineItemStatus, string> = {
  not_started: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#ca8a04",
  approved: "#16a34a",
};

export const STATUS_BG: Record<LineItemStatus, string> = {
  not_started: "gray.50",
  in_progress: "blue.50",
  review: "yellow.50",
  approved: "green.50",
};

export const STATUS_LABELS: Record<LineItemStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  review: "Ready for Review",
  approved: "Approved",
};
