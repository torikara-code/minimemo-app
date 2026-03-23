import { Component, createSignal, For, onMount, onCleanup, createEffect } from "solid-js";
import BackButton from "./BackButton";
import { 
  todos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos, 
  isTodoOpen, closeTodo, t 
} from "../store/appStore";

const Todo: Component = () => {
  const [newTodoText, setNewTodoText] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isTodoOpen()) return;

    if (e.key === "Enter") {
      if (document.activeElement === inputRef) {
        if (newTodoText().trim()) {
          addTodo(newTodoText());
          setNewTodoText("");
        } else if (todos.length > 0) {
          toggleTodo(todos[selectedIndex()].id);
        }
      } else if (todos.length > 0) {
        toggleTodo(todos[selectedIndex()].id);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, todos.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Delete") {
      if (todos.length > 0) {
        deleteTodo(todos[selectedIndex()].id);
        setSelectedIndex((prev) => Math.min(prev, todos.length - 1));
      }
    } else if (e.key === "Escape") {
      closeTodo();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  createEffect(() => {
    if (isTodoOpen()) {
      setTimeout(() => inputRef?.focus(), 10);
      setSelectedIndex(0);
    }
  });

  return (
    <div class="view todo-view">
      <div class="settings-header">
        <BackButton onClick={closeTodo} />
        <div class="history-search-container">
          <input 
            ref={inputRef}
            type="text" 
            class="history-search-input" 
            placeholder={t("add_todo")} 
            value={newTodoText()}
            onInput={(e) => setNewTodoText(e.currentTarget.value)}
          />
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button 
            class="icon-btn" 
            onClick={clearCompletedTodos} 
            title={t("t_todo_cleared")}
            style="color: var(--text-muted);"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="settings-content">
        <div class="todo-list">
          <For each={todos} fallback={
            <div class="todo-empty-state">
              <div class="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </div>
              <div class="empty-text">{t("no_todos")}</div>
            </div>
          }>
            {(todo, index) => (
              <div 
                class={`history-item-row ${index() === selectedIndex() ? 'active' : ''} ${todo.completed ? 'completed' : ''}`}
                onClick={() => toggleTodo(todo.id)}
                onMouseEnter={() => setSelectedIndex(index())}
              >
                <div class="item-info" style="flex-direction: row; align-items: center; gap: 12px; justify-content: flex-start; height: 44px;">
                  <div class={`todo-checkbox ${todo.completed ? 'checked' : ''}`}>
                    {todo.completed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <div class="item-preview-text" style={{ 
                    "text-decoration": todo.completed ? "line-through" : "none",
                    "opacity": todo.completed ? "0.5" : "1"
                  }}>
                    {todo.text}
                  </div>
                </div>
                <div class="item-actions">
                  <button class="item-action-btn delete" onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} title={t("delete")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

export default Todo;
