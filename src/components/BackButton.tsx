import { Component } from "solid-js";
import { t } from "../store/appStore";

interface BackButtonProps {
  onClick: () => void;
  title?: string;
}

const BackButton: Component<BackButtonProps> = (props) => {
  return (
    <button 
      class="back-btn" 
      onClick={props.onClick} 
      title={props.title || `${t("back")} (Esc)`}
    >
      <div class="back-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </div>
    </button>
  );
};

export default BackButton;
