import { notFound } from "next/navigation";
import { ALL_ITEMS } from "@/lib/nav";
import LiveMonitoringView from "@/components/modules/LiveMonitoringView";
import AiAnalysisView from "@/components/modules/AiAnalysisView";
import HistoryView from "@/components/modules/HistoryView";
import ReportsView from "@/components/modules/ReportsView";
import PrescriptionsView from "@/components/modules/PrescriptionsView";
import MedicationsView from "@/components/modules/MedicationsView";
import CaregiversView from "@/components/modules/CaregiversView";
import SosView from "@/components/modules/SosView";
import AutomationView from "@/components/modules/AutomationView";
import WorkflowBuilderView from "@/components/modules/WorkflowBuilderView";
import AuditLogView from "@/components/modules/AuditLogView";
import DevicesView from "@/components/modules/DevicesView";
import NotificationsView from "@/components/modules/NotificationsView";
import PrivacyView from "@/components/modules/PrivacyView";
import SettingsView from "@/components/modules/SettingsView";

export function generateStaticParams() {
  return ALL_ITEMS.filter((i) => i.href !== "/dashboard" && i.href !== "/profile").map((i) => ({
    module: i.href.slice(1),
  }));
}

export default function Module({ params }: { params: { module: string } }) {
  const mod = params.module;

  switch (mod) {
    case "live-monitoring":
      return <LiveMonitoringView />;
    case "ai-analysis":
      return <AiAnalysisView />;
    case "history":
      return <HistoryView />;
    case "reports":
      return <ReportsView />;
    case "prescriptions":
      return <PrescriptionsView />;
    case "medications":
      return <MedicationsView />;
    case "caregivers":
      return <CaregiversView />;
    case "sos":
      return <SosView />;
    case "automation":
      return <AutomationView />;
    case "workflow-builder":
      return <WorkflowBuilderView />;
    case "audit-log":
      return <AuditLogView />;
    case "devices":
      return <DevicesView />;
    case "notifications":
      return <NotificationsView />;
    case "privacy":
      return <PrivacyView />;
    case "settings":
      return <SettingsView />;
    default:
      notFound();
  }
}
