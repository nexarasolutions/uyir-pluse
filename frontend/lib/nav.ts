import { LayoutDashboard, Activity, BrainCircuit, History, FileText, Pill, Clock, Users, Siren, Workflow, GitBranch, ScrollText, User, Cpu, Bell, ShieldCheck, Settings, type LucideIcon } from "lucide-react";
export type NavItem = { label: string; href: string; icon: LucideIcon };
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  { group: "Health", items: [
    { label: "Live Monitoring", href: "/live-monitoring", icon: Activity },
    { label: "AI Health Analysis", href: "/ai-analysis", icon: BrainCircuit },
    { label: "Health History", href: "/history", icon: History },
    { label: "Reports", href: "/reports", icon: FileText } ] },
  { group: "Care", items: [
    { label: "Prescriptions", href: "/prescriptions", icon: Pill },
    { label: "Medications", href: "/medications", icon: Clock },
    { label: "Family & Caregivers", href: "/caregivers", icon: Users },
    { label: "Emergency SOS", href: "/sos", icon: Siren } ] },
  { group: "Automation", items: [
    { label: "Automation Centre", href: "/automation", icon: Workflow },
    { label: "Workflow Builder", href: "/workflow-builder", icon: GitBranch },
    { label: "Activity & Audit Log", href: "/audit-log", icon: ScrollText } ] },
  { group: "Account", items: [
    { label: "Profile", href: "/profile", icon: User },
    { label: "Devices", href: "/devices", icon: Cpu },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Privacy & Security", href: "/privacy", icon: ShieldCheck },
    { label: "Settings", href: "/settings", icon: Settings } ] },
];
export const ALL_ITEMS = NAV.flatMap((g) => g.items);
