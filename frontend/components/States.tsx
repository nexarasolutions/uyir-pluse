import { PlugZap, type LucideIcon } from "lucide-react";
export function EmptyState({ title, body, icon: Icon = PlugZap }: { title: string; body: string; icon?: LucideIcon }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-menu text-brand"><Icon /></span>
      <p className="font-bold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
export const IntegrationRequired = ({ what }: { what: string }) => (
  <EmptyState title="Integration required" body={`${what} is not connected to a backend endpoint yet. Map it in the backend integration map before enabling.`} />
);
