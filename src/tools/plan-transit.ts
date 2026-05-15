import { z } from 'zod';
import { planConnections } from '@/clients/transport.ts';

export const planTransitInput = {
  from: z.string().describe('Origin station name or address, e.g. "Zürich HB" or "Rapperswil SG".'),
  to: z.string().describe('Destination station name or address.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('YYYY-MM-DD. Defaults to today.'),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .describe('HH:MM (24h). Defaults to now.'),
  mode: z
    .enum(['departure', 'arrival'])
    .default('departure')
    .describe('Whether the given time is when to depart or when to arrive.'),
  limit: z.number().int().min(1).max(8).default(4),
};

const ConnectionOut = z.object({
  fromStation: z.string().optional(),
  toStation: z.string().optional(),
  departure: z.string().optional(),
  arrival: z.string().optional(),
  duration: z.string().optional(),
  transfers: z.number().optional(),
  products: z.array(z.string()).optional(),
  legs: z
    .array(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        departure: z.string().optional(),
        arrival: z.string().optional(),
        line: z.string().optional(),
      }),
    )
    .optional(),
});

export const planTransitOutput = {
  connections: z.array(ConnectionOut),
};

export async function planTransitHandler({
  from,
  to,
  date,
  time,
  mode,
  limit,
}: {
  from: string;
  to: string;
  date?: string;
  time?: string;
  mode: 'departure' | 'arrival';
  limit: number;
}) {
  const raw = await planConnections({
    from,
    to,
    date,
    time,
    isArrivalTime: mode === 'arrival',
    limit,
  });

  const connections = raw.map((c) => ({
    fromStation: c.from?.station?.name ?? undefined,
    toStation: c.to?.station?.name ?? undefined,
    departure: c.from?.departure ?? undefined,
    arrival: c.to?.arrival ?? undefined,
    duration: c.duration ?? undefined,
    transfers: c.transfers ?? undefined,
    products: c.products,
    legs: c.sections?.map((s) => ({
      from: s.departure?.station?.name ?? undefined,
      to: s.arrival?.station?.name ?? undefined,
      departure: s.departure?.departure ?? undefined,
      arrival: s.arrival?.arrival ?? undefined,
      line:
        s.journey && (s.journey.category || s.journey.number)
          ? `${s.journey.category ?? ''} ${s.journey.number ?? ''}`.trim()
          : s.walk
            ? 'walk'
            : undefined,
    })),
  }));

  return { connections };
}
