import { useEffect, useState } from 'react';

export interface ThreatAttack {
  id: number;
  receivedAt: string;
  a_c?: number;
  a_n: string;
  a_t: string;
  d_co?: string | null;
  d_la?: number | null;
  d_lo?: number | null;
  d_s?: string | null;
  s_co?: string | null;
  s_la?: number | null;
  s_lo?: number | null;
  s_s?: string | null;
  t?: string | null;
}

export interface ThreatFeedState {
  attacks: ThreatAttack[];
  feedState: 'connecting' | 'live' | 'reconnecting';
  totalToday: number | null;
}

export const getThreatCountryName = (code: string) =>
  new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;

export const useCheckPointThreatFeed = (): ThreatFeedState => {
  const [attacks, setAttacks] = useState<ThreatAttack[]>([]);
  const [feedState, setFeedState] = useState<ThreatFeedState['feedState']>('connecting');
  const [totalToday, setTotalToday] = useState<number | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/threat-map/feed');
    let nextAttackId = 0;
    source.onopen = () => setFeedState('live');
    source.onerror = () => setFeedState('reconnecting');

    const readCounter = (event: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(event.data);
        if (payload && typeof payload === 'object' && 'today' in payload && typeof payload.today === 'number') {
          setTotalToday(payload.today);
        }
      } catch (error) {
        console.error('Could not parse Check Point live counter event:', error);
      }
    };

    const readAttack = (event: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(event.data);
        if (!payload || typeof payload !== 'object' || !('a_n' in payload) ||
          typeof payload.a_n !== 'string' || !('a_t' in payload) || typeof payload.a_t !== 'string') {
          throw new Error('The live feed event is missing its attack name or type.');
        }
        const item = payload as Record<string, unknown>;
        const attackName = item.a_n;
        const attackType = item.a_t;
        if (typeof attackName !== 'string' || typeof attackType !== 'string') {
          throw new Error('The live feed attack name or type is invalid.');
        }
        const numberValue = (value: unknown) =>
          typeof value === 'number' && Number.isFinite(value) ? value : null;
        const stringValue = (value: unknown) => typeof value === 'string' && value ? value : null;
        const attack: ThreatAttack = {
          id: nextAttackId++,
          receivedAt: new Date().toISOString(),
          a_c: numberValue(item.a_c) ?? undefined,
          a_n: attackName,
          a_t: attackType,
          d_co: stringValue(item.d_co),
          d_la: numberValue(item.d_la),
          d_lo: numberValue(item.d_lo),
          d_s: stringValue(item.d_s),
          s_co: stringValue(item.s_co),
          s_la: numberValue(item.s_la),
          s_lo: numberValue(item.s_lo),
          s_s: stringValue(item.s_s),
          t: stringValue(item.t),
        };
        setAttacks((current) => [attack, ...current].slice(0, 100));
      } catch (error) {
        console.error('Could not parse Check Point live attack event:', error);
      }
    };

    source.onmessage = readCounter;
    source.addEventListener('counter', readCounter as EventListener);
    source.addEventListener('attack', readAttack as EventListener);
    return () => source.close();
  }, []);

  return { attacks, feedState, totalToday };
};
