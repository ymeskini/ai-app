import { pgTableCreator, varchar } from "drizzle-orm/pg-core";
import { ulid } from "ulid";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `ai-app-template_${name}`);

/**
 * Reusable ULID primary key column. ULIDs are always 26 chars so varchar(26) is exact.
 * The value is auto-generated on insert if not provided.
 */
export const ulidPrimaryKey = (columnName = "id") =>
  varchar(columnName, { length: 26 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => ulid());
