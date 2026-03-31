import { pgTableCreator, uuid } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `ai-app-template_${name}`);

/**
 * Reusable UUID primary key column backed by PostgreSQL's gen_random_uuid().
 */
export const primaryId = (columnName = "id") =>
  uuid(columnName).primaryKey().defaultRandom();
