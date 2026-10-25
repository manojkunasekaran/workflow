import { KeyRound, Plug, Server, ShieldCheck, type LucideIcon } from 'lucide-react';

const TYPE_ICON: Record<string, LucideIcon> = {
  SMTP: Server,
  BEARER_TOKEN: KeyRound,
  MCP_SERVER: Plug,
};

const TYPE_ICON_CLASS: Record<string, string> = {
  SMTP: 'text-info',
  BEARER_TOKEN: 'text-warning',
  MCP_SERVER: 'text-primary',
};

export function renderCredentialTypeIcon(type: string, className = 'h-4 w-4') {
  const Icon = TYPE_ICON[type] ?? ShieldCheck;
  const tone = TYPE_ICON_CLASS[type] ?? 'text-muted-foreground';
  return <Icon className={`${className} ${tone}`} />;
}
