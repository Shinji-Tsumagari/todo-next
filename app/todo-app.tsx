"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  addTodo,
  clearCompleted,
  deleteTodo,
  renameTodo,
  toggleTodo,
  useTodos,
  type Todo,
} from "@/lib/todos";

const FILTERS = [
  { value: "all", label: "すべて", empty: "タスクはまだありません" },
  { value: "active", label: "未完了", empty: "未完了のタスクはありません" },
  { value: "completed", label: "完了", empty: "完了したタスクはありません" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export function TodoApp() {
  const todos = useTodos();
  const [filter, setFilter] = useState<Filter>("all");

  const activeFilter = FILTERS.find((item) => item.value === filter)!;
  const visibleTodos = (todos ?? []).filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });
  const remaining = (todos ?? []).filter((todo) => !todo.completed).length;
  const hasCompleted = (todos ?? []).some((todo) => todo.completed);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight">TODO</h1>

      <AddTodoForm />

      <div
        role="group"
        aria-label="表示の絞り込み"
        className="mt-6 flex gap-1 rounded-lg bg-muted p-1"
      >
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-subtle transition-colors aria-pressed:bg-surface aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {item.label}
          </button>
        ))}
      </div>

      {todos === null ? (
        <div className="mt-4 h-40" aria-busy="true" />
      ) : visibleTodos.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line py-12 text-center text-sm text-subtle">
          {activeFilter.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {visibleTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      )}

      {todos !== null && todos.length > 0 && (
        <footer className="mt-4 flex items-center justify-between text-sm text-subtle">
          <span aria-live="polite">残り {remaining} 件</span>
          <button
            type="button"
            onClick={clearCompleted}
            disabled={!hasCompleted}
            className="hover:text-foreground hover:underline disabled:invisible"
          >
            完了済みを削除
          </button>
        </footer>
      )}
    </main>
  );
}

function AddTodoForm() {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addTodo(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="新しいタスクを入力"
        aria-label="新しいタスク"
        className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="shrink-0 rounded-lg bg-accent px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        追加
      </button>
    </form>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);

  function startEditing() {
    cancelled.current = false;
    setDraft(todo.title);
  }

  function commit() {
    if (cancelled.current || draft === null) return;
    const trimmed = draft.trim();
    // 空欄で確定した場合は削除せず、元のタイトルに戻す
    if (trimmed && trimmed !== todo.title) renameTodo(todo.id, trimmed);
    setDraft(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 日本語入力の変換中の Esc は変換の取り消しなので、編集は取り消さない
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
    cancelled.current = true;
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <li className="px-3 py-2">
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            aria-label={`「${todo.title}」を編集`}
            className="w-full rounded-md border border-accent bg-surface px-2 py-1 outline-none ring-2 ring-accent/25"
          />
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
        aria-label={`「${todo.title}」を完了にする`}
        className="size-4.5 shrink-0 accent-(--accent)"
      />
      <span
        onDoubleClick={startEditing}
        className={`min-w-0 flex-1 wrap-anywhere ${
          todo.completed ? "text-subtle line-through" : ""
        }`}
      >
        {todo.title}
      </span>
      <div className="flex shrink-0 gap-3 text-sm text-subtle">
        <button
          type="button"
          onClick={startEditing}
          aria-label={`「${todo.title}」を編集`}
          className="hover:text-foreground"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => deleteTodo(todo.id)}
          aria-label={`「${todo.title}」を削除`}
          className="hover:text-danger"
        >
          削除
        </button>
      </div>
    </li>
  );
}
