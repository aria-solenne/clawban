"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import clsx from "clsx";

import type { Assignee, Priority, Status, Task } from "@/lib/types";
import { UnlockEditing } from "@/app/ui/UnlockEditing";
import { ASSIGNEES, PRIORITIES, STATUSES, STATUS_LABEL } from "@/lib/types";

type ApiBoard = {
  tasks: Task[];
  meta?: { storage?: "db" | "json" };
};

function byUpdatedDesc(a: Task, b: Task) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ink" | "warn" | "hot" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide",
        tone === "ink" && "border-white/10 bg-bg1 text-ink/80",
        tone === "warn" && "border-warn/25 bg-warn/10 text-warn",
        tone === "hot" && "border-hot/25 bg-hot/10 text-hot"
      )}
    >
      {children}
    </span>
  );
}

function priorityTone(p: Priority) {
  if (p === "high") return "hot";
  if (p === "med") return "warn";
  return "ink";
}

function AssigneeBadge({ assignee }: { assignee: Assignee }) {
  const src =
    assignee === "rajin"
      ? "/avatars/rajin.png"
      : assignee === "aria"
        ? "/avatars/aria.jpg"
        : null;

  const href =
    assignee === "rajin"
      ? "https://rajinkhan.com"
      : assignee === "aria"
        ? "https://aria-self-site.vercel.app"
        : null;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] tracking-wide",
          "border-white/10 bg-bg1 text-ink/80 hover:border-white/20"
        )}
      >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={assignee}
          className={clsx(
            "h-4 w-4 rounded-full object-cover",
            assignee === "aria" && "ring-1 ring-teal/50",
            assignee === "rajin" && "ring-1 ring-gold/45"
          )}
          loading="lazy"
        />
      ) : (
        <span className="h-4 w-4 rounded-full border border-white/10 bg-bg2" />
      )}
        <span>{assignee.toUpperCase()}</span>
      </a>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] tracking-wide",
        "border-white/10 bg-bg1 text-ink/80"
      )}
    >
      <span className="h-4 w-4 rounded-full border border-white/10 bg-bg2" />
      <span>{assignee.toUpperCase()}</span>
    </span>
  );
}

function Card({ task, active }: { task: Task; active?: boolean }) {
  return (
    <article
      className={clsx(
        "group relative rounded-2xl border p-3 shadow-sm",
        "bg-bg2 border-white/10",
        "transition-transform duration-200 hover:-translate-y-0.5",
        "hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)]",
        active && "border-white/20"
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 aurora" aria-hidden>
        <div
          className={clsx(
            "absolute -inset-[2px] rounded-2xl",
            task.assignee === "aria" &&
              "bg-[radial-gradient(circle_at_15%_20%,rgba(98,230,255,0.18),transparent_58%),radial-gradient(circle_at_85%_70%,rgba(255,61,126,0.10),transparent_62%)]",
            task.assignee === "rajin" &&
              "bg-[radial-gradient(circle_at_20%_25%,rgba(255,126,68,0.18),transparent_60%),radial-gradient(circle_at_80%_75%,rgba(255,186,77,0.10),transparent_62%)]",
            (task.assignee === "both" || task.assignee === "unassigned") &&
              "bg-[radial-gradient(circle_at_20%_25%,rgba(255,126,68,0.12),transparent_62%),radial-gradient(circle_at_80%_70%,rgba(98,230,255,0.12),transparent_62%)]"
          )}
        />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-[15px] leading-snug text-ink">{task.title}</div>
          {task.description ? (
            <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{task.description}</div>
          ) : null}
        </div>
        <div className="shrink-0 text-[10px] text-muted">{new Date(task.updatedAt).toLocaleDateString()}</div>
      </div>

      <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
        <Pill tone={priorityTone(task.priority)}>{task.priority.toUpperCase()}</Pill>
        <AssigneeBadge assignee={task.assignee} />
        {task.status === "blocked" ? <Pill tone="warn">BLOCKED</Pill> : null}
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-hot/25 transition group-hover:opacity-100" />
    </article>
  );
}

function ColumnShell({
  status,
  children,
  count,
}: {
  status: Status;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/40 floaty" />
          <div className="font-display text-[14px] tracking-wide text-ink">{STATUS_LABEL[status]}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-bg1 px-2 py-0.5 text-[11px] text-muted">
          {count}
        </div>
      </header>
      <div className="min-h-0 flex-1 rounded-3xl border border-white/10 bg-bg1 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {children}
      </div>
    </section>
  );
}

function ColumnDropTarget({ status }: { status: Status }) {
  const id = `col:${status}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "rounded-2xl border border-dashed px-3 py-3 text-center text-[12px]",
        isOver ? "border-hot/50 bg-hot/10 text-hot" : "border-white/10 bg-bg0/30 text-muted"
      )}
    >
      Drop to move
    </div>
  );
}

function NewTask({ onCreate }: { onCreate: (task: Task) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState<Assignee>("unassigned");
  const [priority, setPriority] = React.useState<Priority>("med");
  const [status, setStatus] = React.useState<Status>("backlog");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : undefined,
          assignee,
          priority,
          status,
        }),
      });
      onCreate(res.task);
      setTitle("");
      setDescription("");
      setAssignee("unassigned");
      setPriority("med");
      setStatus("backlog");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "rounded-full border px-3 py-1.5 text-[13px]",
          "border-white/10 bg-bg1 text-ink hover:border-white/20",
          "shadow-sm"
        )}
      >
        + New task
      </button>

      {open ? (
        <div className="w-full rounded-3xl border border-white/10 bg-bg1 p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="md:col-span-2">
              <div className="mb-1 text-[11px] tracking-wide text-ink/60">Title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ship the thing"
                className="w-full rounded-2xl border border-white/10 bg-bg2 px-3 py-2 text-[13px] text-ink placeholder:text-muted/60 outline-none focus:border-white/20"
              />
            </label>

            <label>
              <div className="mb-1 text-[11px] tracking-wide text-ink/60">Assignee</div>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value as Assignee)}
                className="w-full rounded-2xl border border-white/10 bg-bg2 px-3 py-2 text-[13px] text-ink outline-none focus:border-white/20"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <div className="mb-1 text-[11px] tracking-wide text-ink/60">Description</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tiny context so future-us doesn't suffer"
                className="min-h-[72px] w-full resize-none rounded-2xl border border-white/10 bg-bg2 px-3 py-2 text-[13px] text-ink placeholder:text-muted/60 outline-none focus:border-white/20"
              />
            </label>

            <label>
              <div className="mb-1 text-[11px] tracking-wide text-ink/60">Priority</div>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-2xl border border-white/10 bg-bg2 px-3 py-2 text-[13px] text-ink outline-none focus:border-white/20"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="mb-1 text-[11px] tracking-wide text-ink/60">Column</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full rounded-2xl border border-white/10 bg-bg2 px-3 py-2 text-[13px] text-ink outline-none focus:border-white/20"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end justify-end gap-2 md:col-span-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-ink/80 hover:border-white/20"
              >
                Cancel
              </button>
              <button
                disabled={busy || !title.trim()}
                onClick={submit}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-[13px]",
                  "border-hot/35 bg-hot/10 text-hot hover:bg-hot/15",
                  (busy || !title.trim()) && "opacity-50"
                )}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DraggableCard({
  task,
  onQuickPatch,
  onDelete,
  canEdit,
}: {
  task: Task;
  onQuickPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canEdit,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card task={task} />
      {canEdit ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() =>
                onQuickPatch(task.id, {
                  priority:
                    task.priority === "high" ? "med" : task.priority === "med" ? "low" : "high",
                })
              }
              className="rounded-full border border-white/10 bg-bg1 px-2 py-1 text-[11px] text-muted hover:border-white/20"
            >
              priority ↻
            </button>
            <button
              onClick={() =>
                onQuickPatch(task.id, {
                  assignee:
                    task.assignee === "unassigned"
                      ? "rajin"
                      : task.assignee === "rajin"
                        ? "aria"
                        : task.assignee === "aria"
                          ? "both"
                          : "unassigned",
                })
              }
              className="rounded-full border border-white/10 bg-bg1 px-2 py-1 text-[11px] text-muted hover:border-white/20"
            >
              assignee ↻
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this task?")) onDelete(task.id);
              }}
              className="rounded-full border border-hot/25 bg-hot/10 px-2 py-1 text-[11px] text-hot hover:bg-hot/15"
            >
              delete
            </button>
          </div>

          <span className="text-[10px] text-ink/40">drag me</span>
        </div>
      ) : null}
    </div>
  );
}

export function Board() {
  const [board, setBoard] = React.useState<ApiBoard | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  React.useEffect(() => {
    let alive = true;
    Promise.all([api<ApiBoard>("/api/tasks"), api<{ canEdit: boolean }>("/api/auth")])
      .then(([b, a]) => {
        if (!alive) return;
        b.tasks.sort(byUpdatedDesc);
        setBoard(b);
        setCanEdit(a.canEdit);
      })
      .catch((e) => setErr(e?.message ?? "Failed to load"));
    return () => {
      alive = false;
    };
  }, []);

  const tasks = React.useMemo(() => board?.tasks ?? [], [board]);
  const storage = board?.meta?.storage ?? "json";
  const byStatus: Record<Status, Task[]> = React.useMemo(() => {
    const init = STATUSES.reduce((acc, s) => {
      acc[s] = [];
      return acc;
    }, {} as Record<Status, Task[]>);

    for (const t of tasks) init[t.status].push(t);
    for (const s of STATUSES) init[s].sort(byUpdatedDesc);
    return init;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  async function removeTask(id: string) {
    const prev = board;
    if (!prev) return;

    setBoard({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) });

    try {
      await api<{ ok: true }>(`/api/tasks/${id}`, { method: "DELETE" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setBoard(prev);
    }
  }

  async function patchTask(id: string, patch: Partial<Task>) {
    const prev = board;
    if (!prev) return;
    setBoard({
      ...prev,
      tasks: prev.tasks
        .map((t) => (t.id === id ? ({ ...t, ...patch, updatedAt: new Date().toISOString() } as Task) : t))
        .sort(byUpdatedDesc),
    });
    try {
      const res = await api<{ task: Task }>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setBoard((cur) => {
        if (!cur) return cur;
        return { ...cur, tasks: cur.tasks.map((t) => (t.id === id ? res.task : t)).sort(byUpdatedDesc) };
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
      setBoard(prev);
    }
  }

  async function refresh() {
    try {
      const [b, a] = await Promise.all([api<ApiBoard>("/api/tasks"), api<{ canEdit: boolean }>("/api/auth")]);
      b.tasks.sort(byUpdatedDesc);
      setBoard(b);
      setCanEdit(a.canEdit);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refresh failed");
    }
  }

  async function lockEdits() {
    try {
      await api("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setCanEdit(false);
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    setActiveId(null);

    if (!overId) return;

    if (overId.startsWith("col:")) {
      const status = overId.replace("col:", "") as Status;
      patchTask(id, { status });
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;
    patchTask(id, { status: overTask.status });
  }

  if (err) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border border-warn/30 bg-warn/10 p-4 text-warn">{err}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-8">
        <header className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-bg1 shadow-sm">
                  <div className="absolute inset-0 rounded-2xl aurora bg-[radial-gradient(circle_at_30%_20%,rgba(98,230,255,0.20),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(255,126,68,0.20),transparent_58%)]" />
                  <div className="relative font-display text-lg text-ink">C</div>
                </div>
                <div>
                  <h1 className="font-display text-3xl tracking-tight text-ink">Clawban</h1>
                  <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-muted">
                    A shared work ledger for{" "}
                    <a
                      href="https://rajinkhan.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-white/20 underline-offset-4 hover:decoration-gold/60"
                    >
                      Rajin
                    </a>{" "}
                    ↔{" "}
                    <a
                      href="https://aria-self-site.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-white/20 underline-offset-4 hover:decoration-teal/60"
                    >
                      Aria
                    </a>
                    . Public view. Private edits.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/60">
                    <span className="rounded-full border border-white/10 bg-bg1 px-2 py-0.5">
                      storage: <span className="font-mono text-ink">{storage === "db" ? "neon" : "json"}</span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-bg1 px-2 py-0.5">
                      tasks: <span className="font-mono text-ink">{tasks.length}</span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-bg1 px-2 py-0.5">
                      mode:{" "}
                      <span className={clsx("font-mono", canEdit ? "text-hot" : "text-ink")}>{canEdit ? "edit" : "view"}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={refresh}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-[13px]",
                  "border-white/10 bg-bg1 text-ink hover:border-white/20",
                  "shadow-sm"
                )}
              >
                Refresh
              </button>

              {canEdit ? (
                <button
                  onClick={lockEdits}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-[13px]",
                    "border-warn/30 bg-warn/10 text-warn hover:bg-warn/15",
                    "shadow-sm"
                  )}
                >
                  Lock
                </button>
              ) : null}

              {canEdit ? (
                <NewTask
                  onCreate={(task) =>
                    setBoard((cur) => ({
                      ...(cur ?? { tasks: [], meta: { storage } }),
                      tasks: [task, ...(cur?.tasks ?? [])].sort(byUpdatedDesc),
                    }))
                  }
                />
              ) : (
                <UnlockEditing onUnlock={() => setCanEdit(true)} />
              )}
            </div>
          </div>
        </header>

        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <div className="grid min-h-[70vh] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {STATUSES.map((status) => {
              const items = byStatus[status];
              return (
                <div key={status}>
                  <ColumnShell status={status} count={items.length}>
                    <div className="flex h-full flex-col gap-2">
                      <ColumnDropTarget status={status} />
                      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                        {items.map((t) => (
                          <DraggableCard
                            key={t.id}
                            task={t}
                            onQuickPatch={patchTask}
                            onDelete={removeTask}
                            canEdit={canEdit}
                          />
                        ))}
                      </SortableContext>
                      {items.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-bg0/20 px-3 py-4 text-center text-[12px] text-muted">
                          Empty.
                        </div>
                      ) : null}
                    </div>
                  </ColumnShell>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-[320px] rotate-1">
                <Card task={activeTask} active />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <footer className="mt-8 text-[12px] text-muted">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-bg1 px-2 py-0.5">
                storage: <span className="font-mono text-ink">{storage === "db" ? "neon (postgres)" : "local json"}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-bg1 px-2 py-0.5">
                api: <span className="font-mono text-ink">/api/tasks</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              <span>Public view · Private edits (password unlock or agent token)</span>
              <span className="opacity-60">·</span>
              <a
                href="https://rajinkhan.com"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/15 underline-offset-4 hover:decoration-gold/60"
              >
                rajinkhan.com
              </a>
              <span className="opacity-60">·</span>
              <a
                href="https://aria-self-site.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/15 underline-offset-4 hover:decoration-teal/60"
              >
                aria-self-site
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
