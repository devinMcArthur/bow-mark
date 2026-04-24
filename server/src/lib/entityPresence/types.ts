export type PresenceActivity = "viewing" | "editing";

export interface PresenceEntry {
  userId: string;
  activity: PresenceActivity;
  lastSeen: number; // epoch ms
}

export interface PresenceScope {
  entityType: string;
  entityId: string;
}

export interface PresenceHeartbeat extends PresenceScope {
  userId: string;
  activity: PresenceActivity;
}
