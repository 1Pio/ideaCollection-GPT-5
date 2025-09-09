"use client";

import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-lg font-bold">Idea Collection</h1>
        <SignOutButton />
      </header>
      <main className="h-[calc(100dvh-64px)] flex">
        <Authenticated>
          <Content />
        </Authenticated>
        <Unauthenticated>
          <div className="w-full flex items-center justify-center p-8">
            <SignInForm />
          </div>
        </Unauthenticated>
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  if (!isAuthenticated) return null;
  return (
    <button
      className="bg-slate-200 dark:bg-slate-800 text-dark dark:text-light rounded-md px-3 py-1 text-sm"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <h2 className="text-2xl font-semibold text-center">Welcome</h2>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            setError(error.message);
          });
        }}
      >
        <input
          className="bg-light dark:bg-dark text-dark dark:text-light rounded-md p-2 border border-slate-200 dark:border-slate-800"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="bg-light dark:bg-dark text-dark dark:text-light rounded-md p-2 border border-slate-200 dark:border-slate-800"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button
          className="bg-dark dark:bg-light text-light dark:text-dark rounded-md py-2"
          type="submit"
        >
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <div className="flex flex-row gap-2 text-sm justify-center">
          <span>
            {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            type="button"
            className="text-dark dark:text-light underline hover:no-underline"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-md p-2">
            <p className="text-dark dark:text-light font-mono text-xs">Error: {error}</p>
          </div>
        )}
      </form>
    </div>
  );
}

function Content() {
  const workspaces = useQuery(api.myFunctions.listWorkspaces) ?? [];
  const createWorkspace = useMutation(api.myFunctions.createWorkspace);
  const renameWorkspace = useMutation(api.myFunctions.renameWorkspace);
  const deleteWorkspace = useMutation(api.myFunctions.deleteWorkspace);

  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [wsName, setWsName] = useState("");

  // Select first workspace by default
  useEffect(() => {
    if (!selected && workspaces && workspaces[0]) {
      setSelected(workspaces[0]._id);
    }
  }, [workspaces, selected]);

  const onCreate = async () => {
    if (!wsName.trim()) return;
    const id = await createWorkspace({ name: wsName.trim() });
    setWsName("");
    setCreating(false);
    setSelected(String(id));
  };

  const current = workspaces.find((w) => String(w._id) === selected) ?? null;

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-72 border-r border-slate-200 dark:border-slate-800 flex-col p-3 gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Workspaces</h2>
          <button
            className="px-2 py-1 text-sm rounded bg-slate-200 dark:bg-slate-800"
            onClick={() => setCreating(true)}
          >
            New
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {workspaces.map((w) => (
            <button
              key={String(w._id)}
              onClick={() => setSelected(String(w._id))}
              className={`text-left px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 ${
                String(w._id) === selected ? "bg-slate-100 dark:bg-slate-900" : ""
              }`}
            >
              {w.name}
            </button>
          ))}
          {workspaces.length === 0 && (
            <p className="text-sm opacity-70">No workspaces yet.</p>
          )}
        </div>
        {current && (
          <div className="mt-auto flex gap-2">
            <button
              className="flex-1 px-2 py-1 text-sm rounded bg-slate-200 dark:bg-slate-800"
              onClick={() => {
                const name = prompt("Rename workspace", current.name);
                if (name && name.trim()) {
                  void renameWorkspace({ workspaceId: current._id, name: name.trim() });
                }
              }}
            >
              Rename
            </button>
            <button
              className="px-2 py-1 text-sm rounded bg-red-600 text-white"
              onClick={() => {
                if (confirm("Delete workspace and all ideas?")) {
                  void deleteWorkspace({ workspaceId: current._id });
                  setSelected(null);
                }
              }}
            >
              Delete
            </button>
          </div>
        )}
      </aside>

      {/* Main area */}
      <section className="flex-1 flex flex-col h-full">
        {/* Mobile workspace switcher */}
        <div className="md:hidden p-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 items-center">
          <select
            className="flex-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded p-2"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="" disabled>
              Select workspace
            </option>
            {workspaces.map((w) => (
              <option key={String(w._id)} value={String(w._id)}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            className="px-2 py-1 text-sm rounded bg-slate-200 dark:bg-slate-800"
            onClick={() => setCreating(true)}
          >
            New
          </button>
        </div>

        {/* Workspace content */}
        {current ? (
          <WorkspaceView workspaceId={current._id} workspaceName={current.name} />
        ) : (
          <div className="flex-1 grid place-items-center p-6">
            <div className="max-w-md text-center">
              <h2 className="text-xl font-semibold mb-2">Get started</h2>
              <p className="opacity-80 mb-4">Create your first workspace to collect ideas.</p>
              <button
                className="px-4 py-2 rounded bg-dark dark:bg-light text-light dark:text-dark"
                onClick={() => setCreating(true)}
              >
                Create workspace
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Create workspace modal (simple) */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="bg-light dark:bg-dark rounded-lg p-4 w-full max-w-sm border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold mb-2">New workspace</h3>
            <input
              className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-transparent"
              placeholder="Workspace name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onCreate();
              }}
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1 rounded" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded bg-dark dark:bg-light text-light dark:text-dark"
                onClick={() => void onCreate()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkspaceView({
  workspaceId,
  workspaceName,
}: {
  workspaceId: any;
  workspaceName: string;
}) {
  const ideas = useQuery(api.myFunctions.listIdeas, { workspaceId }) ?? undefined;
  const addIdea = useMutation(api.myFunctions.addIdea);
  const updateIdea = useMutation(api.myFunctions.updateIdea);
  const deleteIdea = useMutation(api.myFunctions.deleteIdea);

  const [draft, setDraft] = useState<string>("");
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      await addIdea({ workspaceId, contentHTML: content });
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="font-semibold">{workspaceName}</h2>
      </div>

      {/* Ideas feed */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {ideas === undefined ? (
          <p className="opacity-70 text-sm">Loading...</p>
        ) : ideas.length === 0 ? (
          <p className="opacity-70 text-sm">No ideas yet. Start the conversation!</p>
        ) : (
          ideas.map((idea) => (
            <IdeaBubble
              key={String(idea._id)}
              html={idea.contentHTML}
              updatedAt={idea.updatedAt}
              onEdit={async (html) => {
                await updateIdea({ ideaId: idea._id, contentHTML: html });
              }}
              onDelete={async () => {
                await deleteIdea({ ideaId: idea._id });
              }}
              />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto">
          <RichTextEditor
            value={draft}
            onChange={setDraft}
            placeholder="Write an idea... Use bold, italics, lists, and headings."
          />
          <div className="mt-2 flex justify-end">
            <button
              disabled={sending}
              className="px-4 py-2 rounded bg-dark dark:bg-light text-light dark:text-dark disabled:opacity-60"
              onClick={() => void onSend()}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdeaBubble({
  html,
  updatedAt,
  onEdit,
  onDelete,
}: {
  html: string;
  updatedAt: number;
  onEdit: (html: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(html);

  useEffect(() => setValue(html), [html]);

  return (
    <div className="self-start max-w-3xl w-full">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
        {!editing ? (
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div>
            <RichTextEditor value={value} onChange={setValue} />
            <div className="mt-2 flex gap-2 justify-end">
              <button className="px-3 py-1 rounded" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded bg-dark dark:bg-light text-light dark:text-dark"
                onClick={async () => {
                  await onEdit(value);
                  setEditing(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs opacity-70">
        <span>{new Date(updatedAt).toLocaleString()}</span>
        {!editing && (
          <>
            <button className="underline" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="underline text-red-600" onClick={() => void onDelete()}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    const el = ref.current;
    if (el) onChange(el.innerHTML);
  }, [onChange]);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-md">
      <div className="flex flex-wrap gap-1 p-1 border-b border-slate-200 dark:border-slate-800">
        <ToolbarButton label="B" title="Bold" onClick={() => exec("bold")} className="font-bold" />
        <ToolbarButton label="I" title="Italic" onClick={() => exec("italic")} className="italic" />
        <ToolbarButton label="U" title="Underline" onClick={() => exec("underline")} className="underline" />
        <div className="w-px bg-slate-200 dark:bg-slate-800 mx-1" />
        <ToolbarButton label="H1" title="Heading 1" onClick={() => exec("formatBlock", "h1")} />
        <ToolbarButton label="H2" title="Heading 2" onClick={() => exec("formatBlock", "h2")} />
        <div className="w-px bg-slate-200 dark:bg-slate-800 mx-1" />
        <ToolbarButton label="• List" title="Bulleted list" onClick={() => exec("insertUnorderedList")} />
      </div>
      <div className="relative">
        {!value && !isFocused && (
          <div className="pointer-events-none absolute inset-0 p-2 text-sm opacity-50">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          className="min-h-24 max-h-64 overflow-auto p-2 outline-none prose prose-sm dark:prose-invert max-w-none"
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
  className,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`px-2 py-1 rounded text-sm bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 ${className ?? ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
