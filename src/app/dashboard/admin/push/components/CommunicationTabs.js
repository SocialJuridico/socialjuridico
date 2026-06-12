import { Bell, Mail } from "lucide-react";
import { COMMUNICATION_CHANNELS } from "../config/communicationOptions";
import styles from "../Push.module.css";

const tabs = [
  { value: COMMUNICATION_CHANNELS.PUSH, label: "Push notification", icon: Bell },
  { value: COMMUNICATION_CHANNELS.EMAIL, label: "E-mail", icon: Mail },
];

export default function CommunicationTabs({ activeChannel, onChange }) {
  return (
    <nav className={styles.tabs} aria-label="Canais de comunicação">
      {tabs.map(({ value, label, icon: Icon }) => {
        const active = activeChannel === value;
        return (
          <button
            key={value}
            type="button"
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            onClick={() => onChange(value)}
            aria-pressed={active}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
