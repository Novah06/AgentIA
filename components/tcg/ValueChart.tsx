'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEur } from '@/lib/tcg/pricing';

export interface ChartPoint {
  t: string;
  v: number;
}

interface Props {
  points: ChartPoint[];
  /** Nom de la série : le titre porte l'identité, il n'y a donc pas de légende. */
  label: string;
  color?: string;
  height?: number;
  /** Message affiché quand il n'y a pas encore d'historique. */
  emptyLabel?: string;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 76 };
/** Largeur de repli avant la première mesure du conteneur. */
const W_DEFAUT = 820;

/**
 * Courbe de valeur (aire + ligne) avec réticule et infobulle.
 *
 * Tracée à la main en SVG : une seule série, pas d'axe secondaire, pas de
 * dépendance de graphes à embarquer. Les repères sont volontairement discrets
 * — c'est la courbe qui doit se lire, pas la grille.
 */
export default function ValueChart({
  points,
  label,
  color = '#f2c14e',
  height = 260,
  emptyLabel = 'Pas encore d’historique : la courbe se remplit à chaque relevé (00 h et 12 h).',
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Le repère SVG suit la largeur réelle du conteneur : sans cela, le tracé
  // serait mis à l'échelle et laisserait des marges vides sur grand écran.
  const [W, setW] = useState(W_DEFAUT);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setW(Math.max(320, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const model = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.v);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    // Une marge de 8 % évite que la courbe touche les bords ; un portefeuille
    // parfaitement plat garde quand même une échelle lisible.
    const span = rawMax - rawMin || Math.max(rawMax * 0.1, 1);
    const min = Math.max(0, rawMin - span * 0.08);
    const max = rawMax + span * 0.08;

    const x = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;
    const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

    const range = max - min;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
      v: min + range * r,
      y: PAD.top + plotH - r * plotH,
      text: formatTick(min + range * r, range),
    }))
      // Sur une série plate, les cinq repères portent la même valeur : on garde
      // la grille mais on n'écrit le montant qu'une fois.
      .map((tick, index, all) => ({
        ...tick,
        text: index > 0 && all[index - 1].text === tick.text ? null : tick.text,
      }));

    // Le format de l'axe des abscisses suit l'étendue réelle : sur une seule
    // journée (deux relevés), afficher deux fois la même date ne renseigne
    // sur rien — c'est l'heure qui distingue les points.
    const spanMs =
      new Date(points[points.length - 1].t).getTime() - new Date(points[0].t).getTime();
    const formatAxis = axisFormatter(spanMs);

    const labelCount = Math.min(5, points.length);
    const dateLabels = Array.from({ length: labelCount }, (_, k) => {
      const i = Math.round((k / (labelCount - 1)) * (points.length - 1));
      return { i, x: x(i), text: formatAxis(points[i].t) };
    })
      // Deux repères identiques côte à côte n'apportent rien et se chevauchent.
      .filter((label, index, all) => index === 0 || label.text !== all[index - 1].text);

    return { x, y, line, area, ticks, dateLabels, min, max };
  }, [points, plotH, plotW, W]);

  const active = model && hover !== null ? points[hover] : null;

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !model) return;
    const rect = svg.getBoundingClientRect();
    const userX = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = (userX - PAD.left) / plotW;
    const index = Math.round(ratio * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  }

  return (
    <div ref={wrapRef} className="relative rounded-xl border border-tcg-line bg-tcg-card">
      {!model ? (
        <div
          className="flex items-center justify-center px-6 text-center text-sm text-tcg-secondary"
          style={{ height }}
        >
          {emptyLabel}
        </div>
      ) : (
        <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        style={{ height }}
        role="img"
        aria-label={`${label} — de ${formatEur(model.min)} à ${formatEur(model.max)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {model.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#1f2c44"
              strokeWidth={1}
            />
            {tick.text && (
              <text x={PAD.left - 10} y={tick.y + 4} textAnchor="end" fontSize={11} fill="#5b6c86">
                {tick.text}
              </text>
            )}
          </g>
        ))}

        {model.dateLabels.map((d) => (
          <text key={d.i} x={d.x} y={H - 8} textAnchor="middle" fontSize={11} fill="#5b6c86">
            {d.text}
          </text>
        ))}

        <path d={model.area} fill={`url(#fill-${label.replace(/\W/g, '')})`} />
        <path
          d={model.line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hover !== null && (
          <g>
            <line
              x1={model.x(hover)}
              x2={model.x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="#5b6c86"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={model.x(hover)}
              cy={model.y(points[hover].v)}
              r={5}
              fill={color}
              stroke="#121a2b"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {active && model && hover !== null && (
        <div
          className="pointer-events-none absolute top-3 rounded-lg border border-tcg-line bg-tcg-ink/95 px-3 py-2 text-xs shadow-lg"
          style={{
            left: `calc(${(model.x(hover) / W) * 100}% )`,
            transform:
              model.x(hover) > W / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <div className="font-medium text-tcg-primary">{formatEur(active.v)}</div>
          <div className="text-tcg-secondary">{longDate(active.t)}</div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

/** Choisit le grain de l'axe des abscisses selon l'étendue de la série. */
function axisFormatter(spanMs: number): (iso: string) => string {
  const jour = 24 * 60 * 60 * 1000;
  const options: Intl.DateTimeFormatOptions =
    spanMs < 2 * jour
      ? { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }
      : spanMs < 400 * jour
        ? { day: '2-digit', month: 'short', timeZone: 'Europe/Paris' }
        : { month: 'short', year: '2-digit', timeZone: 'Europe/Paris' };
  const formatter = new Intl.DateTimeFormat('fr-FR', options);
  return (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : formatter.format(d);
  };
}

function longDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(d);
}

/**
 * Axe des ordonnées. « 1,2 k€ » se lit mieux que « 1 234,56 € », mais sur une
 * plage étroite l'arrondi donnerait cinq fois le même repère : la précision
 * s'ajuste donc à l'amplitude affichée.
 */
function formatTick(v: number, range: number): string {
  if (Math.abs(v) >= 1000 && range >= 200) {
    return `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  }
  const decimals = range >= 100 ? 0 : range >= 10 ? 1 : 2;
  return `${v.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`;
}
