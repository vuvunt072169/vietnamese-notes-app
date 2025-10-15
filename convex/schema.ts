import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  notes: defineTable({
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    })
    .searchIndex("search_title", {
      searchField: "title", 
      filterFields: ["userId"],
    }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
