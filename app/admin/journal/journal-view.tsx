"use client";

import { useState, useActionState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, Trash2, AlertCircle, Save,
  BookOpen, Eye, EyeOff, ExternalLink,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import type { SiteConfig } from "@/lib/types";
import {
  createJournalPost, updateJournalPost, deleteJournalPost, toggleJournalPublished,
  type ActionResult,
} from "../_actions/journal";

export type AdminPost = {
  id:           string;
  slug:         string;
  title:        string;
  excerpt:      string;
  content:      string;
  image_url:    string;
  author_name:  string;
  published_at: string;
  is_published: boolean;
  created_at:   string;
};

// ── toggle publish inline ───────────────────────────────

function TogglePublishedButton({ post, s }: { post: AdminPost; s: ReturnType<typeof getAdminStyles> }) {
  const [pending, startTransition] = useTransition();
  function handleToggle() {
    startTransition(() => {
      toggleJournalPublished(post.id, !post.is_published);
    });
  }
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className={`p-2 rounded-lg ${s.hoverBg} disabled:opacity-50`}
      title={post.is_published ? "Unpublish" : "Publish"}
    >
      {post.is_published
        ? <Eye className={`w-4 h-4 ${s.textSecondary}`} />
        : <EyeOff className="w-4 h-4 text-amber-500" />}
    </button>
  );
}

// ── delete inline ───────────────────────────────────────

function DeleteButton({ id, onDelete, s }: { id: string; onDelete: () => void; s: ReturnType<typeof getAdminStyles> }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => startTransition(async () => { await deleteJournalPost(id); onDelete(); })}
          disabled={pending}
          className="px-2 py-1 text-xs font-bold rounded-lg bg-red-600 text-white disabled:opacity-50"
        >
          {pending ? "…" : "Delete"}
        </button>
        <button type="button" onClick={() => setConfirm(false)} className={`p-1 rounded-lg ${s.hoverBg}`}>
          <X className={`w-3.5 h-3.5 ${s.textMuted}`} />
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setConfirm(true)} className={`p-2 rounded-lg ${s.hoverBg}`}>
      <Trash2 className="w-4 h-4 text-red-500" />
    </button>
  );
}

// ── post form (create / edit) ───────────────────────────

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type PostFormProps = {
  post?: AdminPost;
  onClose: () => void;
  s: ReturnType<typeof getAdminStyles>;
};

function PostForm({ post, onClose, s }: PostFormProps) {
  const isEdit = Boolean(post);
  const action = isEdit ? updateJournalPost : createJournalPost;
  const [result, dispatch, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const [title, setTitle]     = useState(post?.title        ?? "");
  const [slug, setSlug]       = useState(post?.slug         ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  useEffect(() => {
    if (result?.ok) onClose();
  }, [result]);

  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 transition ${s.inputBg} ${s.inputRing}`;
  const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${s.textLabel}`;

  return (
    <form action={dispatch} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>Title *</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="How to wash linen properly"
            required
          />
        </label>
        <label className="block">
          <span className={labelCls}>Slug *</span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
            className={inputCls}
            placeholder="how-to-wash-linen-properly"
            required
          />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Excerpt</span>
        <textarea
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          rows={2}
          className={`${inputCls} resize-y`}
          placeholder="Short summary shown in journal listing"
        />
      </label>

      <label className="block">
        <span className={labelCls}>Content (HTML or plain text)</span>
        <textarea
          name="content"
          defaultValue={post?.content ?? ""}
          rows={10}
          className={`${inputCls} resize-y font-mono text-xs`}
          placeholder="<p>Full article body…</p>"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>Cover image URL</span>
          <input
            name="image_url"
            defaultValue={post?.image_url ?? ""}
            className={inputCls}
            placeholder="/service-journal-washing.jpg"
          />
        </label>
        <label className="block">
          <span className={labelCls}>Author name</span>
          <input
            name="author_name"
            defaultValue={post?.author_name ?? ""}
            className={inputCls}
            placeholder="Sofia"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>Publish date</span>
          <input
            name="published_at"
            type="datetime-local"
            defaultValue={post?.published_at ? post.published_at.slice(0, 16) : new Date().toISOString().slice(0, 16)}
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-3 mt-6">
          <input
            type="checkbox"
            name="is_published"
            value="true"
            defaultChecked={post?.is_published ?? true}
            className="w-4 h-4 rounded"
          />
          <span className={`text-sm font-medium ${s.textPrimary}`}>Published (visible on site)</span>
        </label>
      </div>

      {result && !result.ok && (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {result.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-semibold ${s.hoverBg} ${s.textSecondary}`}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))" }}
        >
          <Save className="w-4 h-4" />
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
        </button>
      </div>
    </form>
  );
}

// ── main view ───────────────────────────────────────────

export default function JournalView({
  posts: initialPosts,
  config,
  counts,
}: {
  posts: AdminPost[];
  config: SiteConfig;
  counts?: { bookings: number; inquiries: number };
}) {
  const { theme }    = useAdminTheme();
  const dark         = theme === "dark";
  const s            = getAdminStyles(dark);
  const [posts, setPosts]       = useState<AdminPost[]>(initialPosts);
  const [panel, setPanel]       = useState<"none" | "create" | AdminPost>("none");

  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setPanel("none");
  }

  return (
    <AdminShell config={config} counts={counts}>
      <div className="p-5 sm:p-6 lg:p-8 space-y-8 max-w-5xl">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${s.textMuted}`}>
              <BookOpen className="h-3.5 w-3.5" /> Journal
            </div>
            <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Journal Posts</h1>
            <p className={`text-sm mt-1 ${s.textSecondary}`}>
              Write and manage blog posts. Published posts appear on the public Journal page and in the sitemap.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPanel("create")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))" }}
          >
            <Plus className="w-4 h-4" /> New post
          </button>
        </div>

        {/* create / edit slide-in panel */}
        <AnimatePresence>
          {panel !== "none" && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-bold ${s.textPrimary}`}>
                  {panel === "create" ? "New post" : "Edit post"}
                </h2>
                <button type="button" onClick={() => setPanel("none")} className={`p-2 rounded-xl ${s.hoverBg}`}>
                  <X className={`w-5 h-5 ${s.textMuted}`} />
                </button>
              </div>
              <PostForm
                post={panel === "create" ? undefined : (panel as AdminPost)}
                onClose={() => setPanel("none")}
                s={s}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* post list */}
        {posts.length === 0 ? (
          <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
            <BookOpen className={`w-10 h-10 mx-auto mb-4 ${s.textMuted}`} />
            <p className={`font-semibold ${s.textPrimary}`}>No posts yet</p>
            <p className={`text-sm mt-1 ${s.textSecondary}`}>Create your first journal post to have it appear on the site.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 sm:p-5`}
              >
                <div className="flex items-start gap-4">
                  {post.image_url && (
                    <div className="hidden sm:block w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-linen">
                      <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={`font-semibold ${s.textPrimary} leading-snug`}>{post.title}</h3>
                        <p className={`text-xs mt-0.5 font-mono ${s.textMuted}`}>/{post.slug}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        post.is_published
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {post.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    {post.excerpt && (
                      <p className={`text-sm mt-2 line-clamp-2 ${s.textSecondary}`}>{post.excerpt}</p>
                    )}
                    <p className={`text-xs mt-2 ${s.textMuted}`}>
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                        : "No date"}
                      {post.author_name && ` · ${post.author_name}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-dashed ${s.cardBorder}">
                  <a
                    href={`/journal/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-lg ${s.hoverBg}`}
                    title="View on site"
                  >
                    <ExternalLink className={`w-4 h-4 ${s.textSecondary}`} />
                  </a>
                  <TogglePublishedButton post={post} s={s} />
                  <button
                    type="button"
                    onClick={() => setPanel(post)}
                    className={`p-2 rounded-lg ${s.hoverBg}`}
                    title="Edit"
                  >
                    <Edit2 className={`w-4 h-4 ${s.textSecondary}`} />
                  </button>
                  <DeleteButton id={post.id} onDelete={() => removePost(post.id)} s={s} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
