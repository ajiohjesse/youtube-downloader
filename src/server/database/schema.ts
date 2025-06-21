import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { VIDEO_STATUS } from "../utils";

export const videoTable = sqliteTable("videos", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  url: text().notNull(),
  status: text().notNull().default(VIDEO_STATUS.pending),
  size: text(),
  createdAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
});
