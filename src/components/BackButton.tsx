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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      {t("back")}
    </button>
  );
};

export default BackButton;
