export type DrawWireResponse =
  { ok: true; [key: string]: unknown } | { ok: false; error: string; message?: string };

export function handleDrawAction(file: string, body: Record<string, unknown>): Promise<DrawWireResponse>;
