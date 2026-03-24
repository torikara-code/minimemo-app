import { Component, createSignal, createMemo, For, onMount, onCleanup, Show, createEffect } from "solid-js";
import { 
  isCommandMenuOpen, setIsCommandMenuOpen, commandMenuQuery, setCommandMenuQuery,
  commandMenuPosition, setText,
  setFocusTrigger
} from "../store/appStore";

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  action: (query: string) => void;
  keywords: string[];
}

const CommandMenu: Component = () => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let menuRef: HTMLDivElement | undefined;
  const [adjustedPos, setAdjustedPos] = createSignal({ x: 0, y: 0 });

  const commands: CommandItem[] = [
    { 
      id: "date", label: "Date (YYYY-MM-DD)", icon: "📅", 
      action: () => insertText(new Date().toISOString().split('T')[0]),
      keywords: ["date", "kyou", "hizuke", "日付"]
    },
    { 
      id: "time", label: "Time (HH:mm)", icon: "🕒", 
      action: () => insertText(new Date().toTimeString().slice(0, 5)),
      keywords: ["time", "jikan", "時刻"]
    },
    { 
      id: "clear", label: "Clear Editor", icon: "🗑️", 
      action: () => { setText(""); clearSlashCommand(); },
      keywords: ["clear", "kesu", "shoukyo", "消去"]
    }
  ];

  const filteredCommands = createMemo(() => {
    const q = commandMenuQuery().toLowerCase();
    
    // If it's a template search, we might want to handle it differently, 
    // but for now let's just combine everything.
    const base = commands.filter(c => 
      c.label.toLowerCase().includes(q) || 
      c.keywords.some(k => k.includes(q))
    );

    return base;
  });

  const insertText = (insert: string) => {
    // Reconstruct text: before '/' + insert + after query
    // This logic is actually handled better in Editor.tsx because of selection range,
    // but we can trigger a custom event or just update signal if we know the range.
    // For simplicity, let's just append for now, but we'll improve it.
    window.dispatchEvent(new CustomEvent("apply-slash-command", { 
      detail: { insert } 
    }));
    clearSlashCommand();
  };

  const clearSlashCommand = () => {
    setIsCommandMenuOpen(false);
    setCommandMenuQuery("");
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isCommandMenuOpen()) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((selectedIndex() + 1) % filteredCommands().length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((selectedIndex() - 1 + filteredCommands().length) % filteredCommands().length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filteredCommands()[selectedIndex()];
      if (cmd) cmd.action(commandMenuQuery());
    } else if (e.key === "Escape") {
      e.preventDefault();
      clearSlashCommand();
      setFocusTrigger(t => t + 1);
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  createEffect(() => {
    // Reset selection when query changes
    commandMenuQuery();
    setSelectedIndex(0);
  });

  createEffect(() => {
    if (isCommandMenuOpen() && menuRef) {
      const pos = commandMenuPosition();
      const rect = menuRef.getBoundingClientRect();
      const menuHeight = rect.height || 240; // Fallback to max-height
      const screenHeight = window.innerHeight;
      
      let newY = pos.y;
      if (pos.y + menuHeight > screenHeight - 10) {
        newY = Math.max(10, pos.y - menuHeight - 10);
      }
      setAdjustedPos({ x: pos.x, y: newY });
    }
  });

  return (
    <Show when={isCommandMenuOpen()}>
      <div 
        ref={menuRef}
        class="command-menu"
        style={{
          position: "fixed",
          left: `${adjustedPos().x}px`,
          top: `${adjustedPos().y}px`,
          "z-index": 2000
        }}
      >
        <div class="command-header">
          <span class="command-query-tag">Search</span>
          <span class="command-current-query">/{commandMenuQuery()}</span>
        </div>
        <div class="command-list">
          <For each={filteredCommands()}>
            {(cmd, i) => (
              <div 
                class={`command-item ${i() === selectedIndex() ? 'selected' : ''}`}
                onClick={() => cmd.action(commandMenuQuery())}
                onMouseEnter={() => setSelectedIndex(i())}
              >
                <span class="command-icon">{cmd.icon}</span>
                <span class="command-label">{cmd.label}</span>
              </div>
            )}
          </For>
          <Show when={filteredCommands().length === 0}>
            <div class="command-empty">No commands found</div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default CommandMenu;
