"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";

export type Milestone = {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ProjectOption = { projectId: string; title: string };

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
] as const;

function useAuth() {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ? { access_token: session.access_token } : null);
      setLoading(false);
    });
  }, []);
  return { session, loading };
}

function authHeaders(session: { access_token: string } | null): HeadersInit {
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function MilestonesPage() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("project_id");
  const { session, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdFromUrl);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchProjects = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase
      .from("submissions")
      .select("project_id, project_type")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    const byProject = new Map<string, string>();
    (data ?? []).forEach((r: { project_id: string | null; project_type: string | null }) => {
      const id = r.project_id ?? "";
      if (id && !byProject.has(id)) byProject.set(id, r.project_type ?? "Project");
    });
    return Array.from(byProject.entries()).map(([projectId, projectType]) => ({
      projectId,
      title: `${projectType} Project`,
    }));
  }, []);

  const fetchMilestones = useCallback(async (projectId: string) => {
    if (!session) return;
    const res = await fetch(`/api/milestones?project_id=${encodeURIComponent(projectId)}`, {
      headers: authHeaders(session),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to load milestones");
    }
    const data = await res.json();
    setMilestones(data.milestones ?? []);
  }, [session]);

  useEffect(() => {
    if (!session && !authLoading) {
      window.location.href = "/signin";
      return;
    }
    if (!session) return;
    (async () => {
      const list = await fetchProjects();
      setProjects(list);
      if (projectIdFromUrl && list.some((p) => p.projectId === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl);
      } else if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].projectId);
      }
    })();
  }, [session, authLoading, projectIdFromUrl, fetchProjects]);

  useEffect(() => {
    if (!session || !selectedProjectId) {
      setLoading(false);
      setMilestones([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchMilestones(selectedProjectId)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [session, selectedProjectId, fetchMilestones]);

  const createMilestone = async (payload: {
    project_id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    status?: string;
    parent_id?: string | null;
  }) => {
    if (!session) return;
    const res = await fetch("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(session) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to create");
    }
    const created = await res.json();
    setMilestones((prev) => [...prev, created]);
    setAdding(false);
    setAddParentId(null);
  };

  const updateMilestone = async (
    id: string,
    updates: { title?: string; description?: string | null; due_date?: string | null; status?: string }
  ) => {
    if (!session) return;
    const res = await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(session) },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to update");
    }
    const updated = await res.json();
    setMilestones((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setEditingId(null);
  };

  const deleteMilestone = async (id: string) => {
    if (!session) return;
    if (!confirm("Delete this milestone and any sub-milestones?")) return;
    const res = await fetch(`/api/milestones/${id}`, {
      method: "DELETE",
      headers: authHeaders(session),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to delete");
    }
    setMilestones((prev) => prev.filter((m) => m.id !== id && m.parent_id !== id));
    setEditingId(null);
    setAddParentId(null);
  };

  const copyShareLink = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/milestones?project_id=${selectedProjectId}`
        : "";
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const topLevel = milestones.filter((m) => !m.parent_id);
  const byParent = milestones.filter((m) => m.parent_id).reduce((acc, m) => {
    const pid = m.parent_id!;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(m);
    return acc;
  }, {} as Record<string, Milestone[]>);

  const selectedProjectTitle = projects.find((p) => p.projectId === selectedProjectId)?.title ?? "Project";

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="milestones-page min-h-[calc(100vh-8rem)] bg-neutral-950 text-white">
      <div className="mx-auto max-w-[800px] px-6 py-8 sm:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Project milestones</h1>
            <p className="mt-1 text-sm text-white/60">
              Track what the contractor promised. Add sub-milestones when unexpected issues come up so you can get back on track.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <label htmlFor="milestone-project" className="block text-sm font-medium text-white">
            Project
          </label>
          <select
            id="milestone-project"
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]"
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {!selectedProjectId ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            Select a project above to manage milestones.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                {copySuccess ? "Copied!" : "Copy link to share with contractor"}
              </button>
              <span className="text-xs text-white/50">
                Send this link so your contractor can see the checklist. You can both track progress here.
              </span>
            </div>

            <div className="space-y-4">
              {topLevel.map((m) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  subMilestones={byParent[m.id] ?? []}
                  isEditing={editingId === m.id}
                  onStartEdit={() => setEditingId(m.id)}
                  onSave={(updates) => updateMilestone(m.id, updates)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => deleteMilestone(m.id)}
                  onAddSub={() => setAddParentId(m.id)}
                  onAddSubMilestone={(title, description, dueDate, status) =>
                    createMilestone({
                      project_id: selectedProjectId!,
                      title,
                      description: description || null,
                      due_date: dueDate || null,
                      status: status || "pending",
                      parent_id: m.id,
                    })
                  }
                  addSubOpen={addParentId === m.id}
                  onCloseAddSub={() => setAddParentId(null)}
                  editingSubId={editingId}
                  onEditSub={(id) => setEditingId(id ?? null)}
                  onUpdateSub={updateMilestone}
                  onDeleteSub={deleteMilestone}
                />
              ))}

              {adding && selectedProjectId && (
                <AddMilestoneForm
                  projectId={selectedProjectId}
                  onSave={(title, description, dueDate, status) =>
                    createMilestone({
                      project_id: selectedProjectId,
                      title,
                      description: description || null,
                      due_date: dueDate || null,
                      status: status || "pending",
                    })
                  }
                  onCancel={() => setAdding(false)}
                />
              )}

              {topLevel.length === 0 && !adding && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-white/60">No milestones yet.</p>
                  <p className="mt-1 text-sm text-white/50">
                    Add milestones to track schedule and promises. Add sub-milestones when issues come up.
                  </p>
                </div>
              )}
            </div>

            {selectedProjectId && !adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
              >
                + Add milestone
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MilestoneCard({
  milestone,
  subMilestones,
  isEditing,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onAddSub,
  onAddSubMilestone,
  addSubOpen,
  onCloseAddSub,
  editingSubId,
  onEditSub,
  onUpdateSub,
  onDeleteSub,
}: {
  milestone: Milestone;
  subMilestones: Milestone[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (u: { title?: string; description?: string | null; due_date?: string | null; status?: string }) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onAddSubMilestone: (title: string, description: string, dueDate: string, status: string) => void;
  addSubOpen: boolean;
  onCloseAddSub: () => void;
  editingSubId: string | null;
  onEditSub: (id: string | null) => void;
  onUpdateSub: (id: string, u: { title?: string; description?: string | null; due_date?: string | null; status?: string }) => void;
  onDeleteSub: (id: string) => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [dueDate, setDueDate] = useState(milestone.due_date ?? "");
  const [status, setStatus] = useState(milestone.status);

  const handleSave = () => {
    onSave({
      title: title.trim() || milestone.title,
      description: description.trim() || null,
      due_date: dueDate.trim() || null,
      status,
    });
  };

  const statusColor =
    status === "done"
      ? "bg-emerald-500/20 text-emerald-200"
      : status === "blocked"
        ? "bg-red-500/20 text-red-200"
        : status === "in_progress"
          ? "bg-amber-500/20 text-amber-200"
          : "bg-white/10 text-white/70";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-4 sm:p-5">
        {isEditing ? (
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone title"
              className="w-full rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white placeholder:text-white/70"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white placeholder:text-white/70"
            />
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white [color-scheme:dark]"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white [color-scheme:dark]"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white">{milestone.title}</h3>
                {milestone.description && (
                  <p className="mt-1 text-sm text-white/60">{milestone.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {milestone.due_date && (
                    <span className="text-xs text-white/50">Due: {milestone.due_date}</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                    {STATUS_OPTIONS.find((o) => o.value === milestone.status)?.label ?? milestone.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onAddSub}
                  className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                >
                  + Sub-milestone
                </button>
              </div>
            </div>

            {subMilestones.length > 0 && (
              <div className="mt-4 border-t border-white/5 pt-4 space-y-2">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Sub-milestones (get back on track)</p>
                {subMilestones.map((sub) => (
                  <SubMilestoneRow
                    key={sub.id}
                    milestone={sub}
                    isEditing={editingSubId === sub.id}
                    onStartEdit={() => onEditSub(sub.id)}
                    onSave={(u) => onUpdateSub(sub.id, u)}
                    onCancelEdit={() => onEditSub(null)}
                    onDelete={() => onDeleteSub(sub.id)}
                  />
                ))}
              </div>
            )}

            {addSubOpen && (
              <AddMilestoneForm
                projectId={milestone.project_id}
                parentLabel="Sub-milestone (e.g. fix unexpected issue)"
                onSave={onAddSubMilestone}
                onCancel={onCloseAddSub}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SubMilestoneRow({
  milestone,
  isEditing,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: {
  milestone: Milestone;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (u: { title?: string; description?: string | null; due_date?: string | null; status?: string }) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [dueDate, setDueDate] = useState(milestone.due_date ?? "");
  const [status, setStatus] = useState(milestone.status);

  const statusColor =
    milestone.status === "done"
      ? "bg-emerald-500/20 text-emerald-200"
      : milestone.status === "blocked"
        ? "bg-red-500/20 text-red-200"
        : "bg-white/10 text-white/70";

  if (isEditing) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-white/20 bg-neutral-900 px-2 py-1.5 text-sm text-white placeholder:text-white/70"
          placeholder="Sub-milestone title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={1}
          className="w-full rounded border border-white/20 bg-neutral-900 px-2 py-1.5 text-sm text-white placeholder:text-white/70"
          placeholder="Description (optional)"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-white/20 bg-neutral-900 px-2 py-1.5 text-sm text-white [color-scheme:dark]"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-white/20 bg-neutral-900 px-2 py-1.5 text-sm text-white [color-scheme:dark]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => onSave({ title: title.trim(), description: description.trim() || null, due_date: dueDate.trim() || null, status })} className="text-xs font-medium text-white hover:text-white/80">Save</button>
          <button type="button" onClick={onCancelEdit} className="text-xs text-white hover:text-white/90">Cancel</button>
          <button type="button" onClick={onDelete} className="text-xs text-red-300 hover:text-red-200">Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <div>
        <span className="text-sm font-medium text-white/90">{milestone.title}</span>
        {milestone.due_date && (
          <span className="ml-2 text-xs text-white/50">Due: {milestone.due_date}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor}`}>
          {STATUS_OPTIONS.find((o) => o.value === milestone.status)?.label ?? milestone.status}
        </span>
        <button type="button" onClick={onStartEdit} className="text-xs text-white/60 hover:text-white">Edit</button>
        <button type="button" onClick={onDelete} className="text-xs text-red-300 hover:text-red-200">Delete</button>
      </div>
    </div>
  );
}

function AddMilestoneForm({
  projectId,
  parentLabel,
  onSave,
  onCancel,
}: {
  projectId: string;
  parentLabel?: string;
  onSave: (title: string, description: string, dueDate: string, status: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("pending");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), description.trim(), dueDate.trim(), status);
    setTitle("");
    setDescription("");
    setDueDate("");
    setStatus("pending");
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p className="text-sm font-medium text-white">{parentLabel ?? "New milestone"}</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Tear-off complete, inspection scheduled"
        className="w-full rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white placeholder:text-white/70"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description or contractor promise (optional)"
        rows={2}
        className="w-full rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white placeholder:text-white/70"
      />
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white [color-scheme:dark]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white [color-scheme:dark]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          Add
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20">
          Cancel
        </button>
      </div>
    </form>
  );
}
