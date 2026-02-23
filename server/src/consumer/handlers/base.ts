/**
 * Base Sync Handler
 *
 * Abstract base class for all entity sync handlers. Provides common
 * functionality for logging, error handling, and routing between
 * create/update vs delete actions.
 *
 * Each entity handler extends this class and implements the
 * entity-specific logic.
 */

import type { SyncMessage } from "../../rabbitmq/publisher";

export abstract class SyncHandler<TDocument = unknown> {
  /** Entity name for logging (e.g., "DailyReport", "Employee") */
  abstract readonly entityName: string;

  /**
   * Fetch the document from MongoDB by ID.
   * Should include any necessary .populate() calls.
   * Return null if not found.
   */
  protected abstract fetchFromMongo(mongoId: string): Promise<TDocument | null>;

  /**
   * Validate that the document has all required references/data for sync.
   * Return true if valid, false to skip syncing.
   * Override this if your entity needs validation beyond existence check.
   */
  protected validate(_doc: TDocument): boolean {
    return true;
  }

  /**
   * Sync the document to PostgreSQL.
   * Called for "created" and "updated" actions.
   */
  protected abstract syncToPostgres(doc: TDocument): Promise<void>;

  /**
   * Handle deletion/archival of the entity in PostgreSQL.
   * Called for "deleted" action.
   */
  protected abstract handleDelete(mongoId: string): Promise<void>;

  /**
   * Main entry point - handles a sync message.
   * Provides consistent logging, error handling, and routing.
   */
  async handle(message: SyncMessage): Promise<void> {
    const { mongoId, action } = message;

    console.log(`[${this.entityName}Sync] Processing ${action} for ${mongoId}`);

    try {
      if (action === "deleted") {
        await this.handleDelete(mongoId);
        console.log(`[${this.entityName}Sync] Successfully handled deletion for ${mongoId}`);
        return;
      }

      // Fetch from MongoDB
      const doc = await this.fetchFromMongo(mongoId);

      if (!doc) {
        console.warn(`[${this.entityName}Sync] ${mongoId} not found in MongoDB`);
        return;
      }

      // Validate
      if (!this.validate(doc)) {
        console.warn(`[${this.entityName}Sync] ${mongoId} failed validation, skipping`);
        return;
      }

      // Sync to PostgreSQL
      await this.syncToPostgres(doc);
      console.log(`[${this.entityName}Sync] Successfully synced ${mongoId}`);
    } catch (error) {
      console.error(`[${this.entityName}Sync] Failed to process ${mongoId}:`, error);
      throw error; // Re-throw for consumer retry logic
    }
  }
}
