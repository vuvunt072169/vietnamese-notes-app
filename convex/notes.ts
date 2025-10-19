import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      notes.map(async (note) => ({
        ...note,
        imageUrl: note.storageId ? await ctx.storage.getUrl(note.storageId) : note.imageUrl,
      }))
    );
  },
});

export const search = query({
  args: { 
    query: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    if (!args.query.trim()) {
      // If no search query, filter by tag if provided
      if (args.tag) {
        const allNotes = await ctx.db
          .query("notes")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .order("desc")
          .collect();
        return allNotes.filter(note => note.tags.includes(args.tag!));
      }
      return await ctx.db
        .query("notes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    // Search in both title and content
    const titleResults = await ctx.db
      .query("notes")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("userId", userId)
      )
      .collect();

    const contentResults = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("userId", userId)
      )
      .collect();

    // Combine and deduplicate results
    const allResults = [...titleResults, ...contentResults];
    const uniqueResults = allResults.filter((note, index, self) =>
      index === self.findIndex((n) => n._id === note._id)
    );

    // Filter by tag if provided
    if (args.tag) {
      return uniqueResults.filter(note => note.tags.includes(args.tag!));
    }

    return uniqueResults;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    storageId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Bạn cần đăng nhập để tạo ghi chú");
    }

    return await ctx.db.insert("notes", {
      title: args.title,
      content: args.content,
      tags: args.tags,
      userId,
      storageId: args.storageId,
      imageUrl: args.imageUrl,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    storageId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Bạn cần đăng nhập để chỉnh sửa ghi chú");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Không tìm thấy ghi chú hoặc bạn không có quyền chỉnh sửa");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      content: args.content,
      tags: args.tags,
      storageId: args.storageId,
      imageUrl: args.imageUrl,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Bạn cần đăng nhập để xóa ghi chú");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Không tìm thấy ghi chú hoặc bạn không có quyền xóa");
    }

    await ctx.db.delete(args.id);
  },
});

export const getAllTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const allTags = notes.flatMap(note => note.tags);
    const uniqueTags = [...new Set(allTags)];
    
    return uniqueTags.sort();
  },
});
