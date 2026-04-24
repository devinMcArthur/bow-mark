import React from "react";
import { gql, useQuery } from "@apollo/client";
import FileBrowser from "./index";
import {
  useEnsureEntityRootMutation,
  UserRoles,
} from "../../generated/graphql";

const ENTITY_ROOT_QUERY = gql`
  query EntityFileBrowserRoot($namespace: String!, $entityId: ID!) {
    entityRoot(namespace: $namespace, entityId: $entityId) {
      _id
    }
  }
`;

export interface EntityFileBrowserProps {
  /** Reserved namespace — "jobsites", "tenders", or "daily-reports". */
  namespace: "jobsites" | "tenders" | "daily-reports";
  /** Entity id that owns the per-entity file root. */
  entityId: string;
  /** Current viewer role — forwarded to FileBrowser. */
  userRole?: UserRoles;
  /** Label for the root breadcrumb. Defaults to "Documents". */
  rootLabel?: string;
  /** Compact chrome in the child browser. */
  compact?: boolean;
  /** Read-only mode in the child browser. */
  readOnly?: boolean;
  /** Custom file-click handler — forwarded to FileBrowser. */
  onFileClick?: React.ComponentProps<typeof FileBrowser>["onFileClick"];
}

/**
 * Thin wrapper around FileBrowser that threads the per-entity root's
 * lifecycle in. Per-entity roots are provisioned lazily on first
 * upload so entities with zero file attachments never pollute the
 * file tree with empty folders. FileBrowser renders its full UI
 * (breadcrumbs, toolbar, drop zone, right-click menus) even before
 * the root exists — any mutation triggers `ensureEntityRoot` first,
 * then proceeds against the freshly-minted root id.
 */
const EntityFileBrowser: React.FC<EntityFileBrowserProps> = ({
  namespace,
  entityId,
  userRole,
  rootLabel = "Documents",
  compact,
  readOnly = false,
  onFileClick,
}) => {
  const rootQuery = useQuery<{ entityRoot: { _id: string } | null }>(
    ENTITY_ROOT_QUERY,
    { variables: { namespace, entityId }, skip: !entityId }
  );
  const [ensureEntityRoot] = useEnsureEntityRootMutation();

  const rootId = rootQuery.data?.entityRoot?._id ?? null;

  // The lazy-provision hook passed to FileBrowser. Called the first
  // time any mutation needs a real parent id. After it resolves, the
  // rootQuery is refetched so future renders skip the ensure path.
  const ensureRoot = React.useCallback(async () => {
    const res = await ensureEntityRoot({
      variables: { namespace, entityId },
    });
    const id = res.data?.ensureEntityRoot._id;
    if (!id) throw new Error("ensureEntityRoot returned no id");
    // Fire-and-forget — FileBrowser's own state already holds the new
    // id via its resolveCurrentId side-effect, so we just keep the
    // wrapper query in sync for remounts / future reads.
    rootQuery.refetch().catch(() => {
      /* swallowed — refetch errors don't block the upload */
    });
    return id;
  }, [ensureEntityRoot, entityId, namespace, rootQuery]);

  return (
    <FileBrowser
      rootId={rootId}
      ensureRoot={readOnly ? undefined : ensureRoot}
      rootLabel={rootLabel}
      userRole={userRole}
      compact={compact}
      readOnly={readOnly}
      onFileClick={onFileClick}
    />
  );
};

export default EntityFileBrowser;
