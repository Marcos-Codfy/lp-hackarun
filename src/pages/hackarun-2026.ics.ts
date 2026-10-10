import type { APIRoute } from 'astro';
import { serverContainer } from '@composition/server';

// .ics gerado no build: "adicionar à agenda" sem js nenhum
export const GET: APIRoute = async () => {
  const ics = await serverContainer().buildCalendarInvite.execute();
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hackarun-2026.ics"',
    },
  });
};
