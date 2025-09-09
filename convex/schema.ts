import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
  })
    .index("by_owner", ["ownerId"]) // list a user's workspaces
    .searchIndex("search_name", { searchField: "name" }),

  ideas: defineTable({
    workspaceId: v.id("workspaces"),
    authorId: v.id("users"),
    contentHTML: v.string(),
    updatedAt: v.number(), // ms since epoch for easy sorting
  })
    .index("by_workspace", ["workspaceId"]) // fetch ideas for a workspace
    .index("by_author", ["authorId"]),
});
