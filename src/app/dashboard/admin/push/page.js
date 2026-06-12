"use client";

import CommunicationForm from "./components/CommunicationForm";
import CommunicationHeader from "./components/CommunicationHeader";
import CommunicationTabs from "./components/CommunicationTabs";
import { useAdminCommunication } from "./hooks/useAdminCommunication";
import styles from "./Push.module.css";

export default function AdminPushPage() {
  const state = useAdminCommunication();

  return (
    <main className={styles.page}>
      <CommunicationHeader />

      <div className={styles.contentShell}>
        <CommunicationTabs
          activeChannel={state.activeChannel}
          onChange={state.setActiveChannel}
        />

        <CommunicationForm
          channel={state.activeChannel}
          form={state.activeForm}
          options={state.activeOptions}
          limits={state.activeLimits}
          recipientType={state.activeRecipientType}
          recipients={state.activeRecipients}
          loadingRecipients={state.loadingRecipients}
          sending={state.sending}
          canSubmit={state.canSubmit}
          onChange={state.updateActiveForm}
          onSubmit={state.submit}
        />
      </div>
    </main>
  );
}
