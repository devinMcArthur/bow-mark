import type { CrewKindDocument } from "@models";

/**
 * CrewKind has no hard foreign-key references yet (Output nodes store
 * `crewKindId` as a loose ObjectId ref on a JSON blob inside a rate buildup
 * snapshot — no index or constraint). Deletion is always permitted; the
 * snapshot just ends up pointing at a missing id, which the UI handles.
 *
 * Archive is preferred for soft-deletion. Hard remove is kept for symmetry
 * with Material.removeIfPossible but is unlikely to be used in the admin UI.
 */
const canRemove = async (_crewKind: CrewKindDocument): Promise<boolean> => {
  return true;
};

const ifPossible = async (crewKind: CrewKindDocument) => {
  await crewKind.remove();
  return;
};

export default {
  canRemove,
  ifPossible,
};
