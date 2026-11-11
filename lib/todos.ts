import { useSyncExternalStore } from "react";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

const STORAGE_KEY = "todos";

const listeners = new Set<() => void>();
let cache: Todo[] | null = null;

function isTodo(value: unknown): value is Todo {
  if (typeof value !== "object" || value === null) return false;
  const todo = value as Record<string, unknown>;
  return (
    typeof todo.id === "string" &&
    typeof todo.title === "string" &&
    typeof todo.completed === "boolean"
  );
}

function read(): Todo[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isTodo) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): Todo[] {
  cache ??= read();
  return cache;
}

// サーバーには localStorage がないため、null を「読み込み中」として扱う
function getServerSnapshot(): null {
  return null;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // 別タブでの変更を反映する
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cache = null;
    emit();
  };

  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(change: (todos: Todo[]) => Todo[]) {
  cache = change(getSnapshot());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // 保存できない環境(容量超過など)でも、表示中のセッションでは動作を続ける
  }
  emit();
}

export function useTodos() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addTodo(title: string) {
  const todo: Todo = {
    // crypto.randomUUID は HTTPS / localhost でしか使えないため自前で生成する
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    completed: false,
  };
  update((todos) => [todo, ...todos]);
}

export function toggleTodo(id: string) {
  update((todos) =>
    todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  );
}

export function renameTodo(id: string, title: string) {
  update((todos) =>
    todos.map((todo) => (todo.id === id ? { ...todo, title } : todo)),
  );
}

export function deleteTodo(id: string) {
  update((todos) => todos.filter((todo) => todo.id !== id));
}

export function clearCompleted() {
  update((todos) => todos.filter((todo) => !todo.completed));
}
