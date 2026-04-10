export type TenderReviewStatus = "draft" | "in_review" | "approved";

export type TenderAuditAction = "row_added" | "row_deleted" | "row_updated";

export const TRACKED_ROW_FIELDS: string[] = [
  "quantity",
  "unit",
  "unitPrice",
  "markupOverride",
  "rateBuildupSnapshot",
  "extraUnitPrice",
  "extraUnitPriceMemo",
  "description",
  "itemNumber",
  "notes",
  "status",
];

export interface ITenderAuditEventCreate {
  rowId: string;
  rowDescription: string;
  action: TenderAuditAction;
  changedFields: string[];
  changedBy: string; // User _id as string
  statusTo?: string;
}
