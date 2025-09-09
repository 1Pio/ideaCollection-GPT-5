import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helpers
async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function assertWorkspaceOwner(ctx: any, workspaceId: any, userId: any) {
  const ws = await ctx.db.get(workspaceId);
  if (!ws) throw new Error("Workspace not found");
  if (ws.ownerId !== userId) throw new Error("Forbidden");
  return ws;
}

// Workspace queries/mutations
export const listWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", userId))
      .order("asc")
      .collect();
    return workspaces.map((w: any) => ({ _id: w._id, name: w.name }));
  },
});

export const createWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireUserId(ctx);
    const wsId = await ctx.db.insert("workspaces", { name, ownerId: userId });
    return wsId;
  },
});

export const renameWorkspace = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string() },
  handler: async (ctx, { workspaceId, name }) => {
    const userId = await requireUserId(ctx);
    await assertWorkspaceOwner(ctx, workspaceId, userId);
    await ctx.db.patch(workspaceId, { name });
  },
});

export const deleteWorkspace = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUserId(ctx);
    await assertWorkspaceOwner(ctx, workspaceId, userId);
    // Delete all ideas in this workspace
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
      .collect();
    for (const idea of ideas) {
      await ctx.db.delete(idea._id);
    }
    await ctx.db.delete(workspaceId);
  },
});

// Idea queries/mutations
export const listIdeas = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUserId(ctx);
    await assertWorkspaceOwner(ctx, workspaceId, userId);
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
      .order("asc")
      .collect();
    return ideas;
  },
});

export const addIdea = mutation({
  args: { workspaceId: v.id("workspaces"), contentHTML: v.string() },
  handler: async (ctx, { workspaceId, contentHTML }) => {
    const userId = await requireUserId(ctx);
    await assertWorkspaceOwner(ctx, workspaceId, userId);
    const ideaId = await ctx.db.insert("ideas", {
      workspaceId,
      authorId: userId,
      contentHTML,
      updatedAt: Date.now(),
    });
    return ideaId;
  },
});

export const updateIdea = mutation({
  args: { ideaId: v.id("ideas"), contentHTML: v.string() },
  handler: async (ctx, { ideaId, contentHTML }) => {
    const userId = await requireUserId(ctx);
    const idea = await ctx.db.get(ideaId);
    if (!idea) throw new Error("Idea not found");
    // Allow if author or workspace owner
    const ws = await ctx.db.get(idea.workspaceId);
    if (!ws) throw new Error("Workspace not found");
    if (idea.authorId !== userId && ws.ownerId !== userId) {
      throw new Error("Forbidden");
    }
    await ctx.db.patch(ideaId, { contentHTML, updatedAt: Date.now() });
  },
});

export const deleteIdea = mutation({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, { ideaId }) => {
    const userId = await requireUserId(ctx);
    const idea = await ctx.db.get(ideaId);
    if (!idea) return;
    const ws = await ctx.db.get(idea.workspaceId);
    if (!ws) return;
    if (idea.authorId !== userId && ws.ownerId !== userId) {
      throw new Error("Forbidden");
    }
    await ctx.db.delete(ideaId);
  },
});
