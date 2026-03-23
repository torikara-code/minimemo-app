import { text } from "../store/appStore";
import { Component } from "solid-js";

const StatusBar: Component = () => {
  const lineCount = () => text().split("\n").length;
  const charCount = () => text().length;

  return (
    <footer class="status-bar">
      <div class="status-bar-left">
        <span>{charCount()} chars</span>
        <span style={{ "margin-left": "12px" }}>{lineCount()} lines</span>
      </div>
      <div class="status-bar-right">
        <span class="badge">Ctrl + M: toggle</span>
        <span class="badge">Ctrl + K: history</span>
      </div>
    </footer>
  );
};

export default StatusBar;
