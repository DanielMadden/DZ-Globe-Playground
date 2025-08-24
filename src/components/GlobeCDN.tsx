// src/components/Globe.tsx
import * as React from "react";
import { addPropertyControls, ControlType } from "framer";

/* ----------------------------- script loading ----------------------------- */

function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true; // UMD (not type="module")
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

const GLOBE_UMD_URLS = [
  "https://unpkg.com/globe.gl@^2/dist/globe.gl.min.js",
  "https://cdn.jsdelivr.net/npm/globe.gl@^2/dist/globe.gl.min.js",
];

async function ensureGlobe(): Promise<any> {
  if ((window as any).Globe) return (window as any).Globe;
  let lastErr: unknown = null;
  for (const url of GLOBE_UMD_URLS) {
    try {
      await loadScriptOnce(url);
      if ((window as any).Globe) return (window as any).Globe;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Unable to load globe.gl UMD build");
}

/* ------------------------------ cached imports ---------------------------- */

let topoPromise: Promise<
  typeof import("https://esm.sh/topojson-client@3")
> | null = null;
function getTopo() {
  if (!topoPromise) topoPromise = import("https://esm.sh/topojson-client@3");
  return topoPromise;
}

/* ---------------------------------- theme --------------------------------- */

const NEON_BLUE = "rgba(0, 123, 255, 1)";
const NEON_WHITE = "#ffffff";
const BG_BLACK = "rgba(0,0,0,0)";

/* ------------------------------ animation tuning -------------------------- */

const ARC_REL_LEN = 0.4;
const FLIGHT_TIME = 1100; // ms
const NUM_RINGS = 3;
const RINGS_MAX_R = 5; // deg
const RING_PROPAGATION_SPEED = 5; // deg/sec
const POINT_TTL = Math.round(FLIGHT_TIME * ARC_REL_LEN);
const ARC_TTL_REMOVE = FLIGHT_TIME * 2;
const MAX_ACTIVE_ARCS = 3;

/* --------------------------------- data ----------------------------------- */

type City = { lat: number; lng: number; label: string };
const POPULAR_CITIES: City[] = [
  { lat: 40.7128, lng: -74.006, label: "New York" },
  { lat: 34.0522, lng: -118.2437, label: "Los Angeles" },
  { lat: 37.7749, lng: -122.4194, label: "San Francisco" },
  { lat: 47.6062, lng: -122.3321, label: "Seattle" },
  { lat: 41.8781, lng: -87.6298, label: "Chicago" },
  { lat: 29.7604, lng: -95.3698, label: "Houston" },
  { lat: 32.7767, lng: -96.797, label: "Dallas" },
  { lat: 33.4484, lng: -112.074, label: "Phoenix" },
  { lat: 39.7392, lng: -104.9903, label: "Denver" },
  { lat: 25.7617, lng: -80.1918, label: "Miami" },
  { lat: 38.9072, lng: -77.0369, label: "Washington, DC" },
  { lat: 42.3601, lng: -71.0589, label: "Boston" },
  { lat: 30.2672, lng: -97.7431, label: "Austin" },
  { lat: 33.749, lng: -84.388, label: "Atlanta" },
  { lat: 36.1699, lng: -115.1398, label: "Las Vegas" },
  { lat: 45.5051, lng: -122.675, label: "Portland" },
  { lat: 43.65107, lng: -79.347015, label: "Toronto" },
  { lat: 49.282729, lng: -123.120738, label: "Vancouver" },
  { lat: 51.5074, lng: -0.1278, label: "London" },
  { lat: 48.8566, lng: 2.3522, label: "Paris" },
  { lat: 52.52, lng: 13.405, label: "Berlin" },
  { lat: 52.3676, lng: 4.9041, label: "Amsterdam" },
  { lat: 41.3851, lng: 2.1734, label: "Barcelona" },
  { lat: 40.4168, lng: -3.7038, label: "Madrid" },
  { lat: 45.4642, lng: 9.19, label: "Milan" },
  { lat: 41.9028, lng: 12.4964, label: "Rome" },
  { lat: 47.3769, lng: 8.5417, label: "Zurich" },
  { lat: 59.3293, lng: 18.0686, label: "Stockholm" },
  { lat: 55.6761, lng: 12.5683, label: "Copenhagen" },
  { lat: 50.1109, lng: 8.6821, label: "Frankfurt" },
  { lat: 25.2048, lng: 55.2708, label: "Dubai" },
  { lat: 30.0444, lng: 31.2357, label: "Cairo" },
  { lat: -26.2041, lng: 28.0473, label: "Johannesburg" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  { lat: 34.6937, lng: 135.5023, label: "Osaka" },
  { lat: 37.5665, lng: 126.978, label: "Seoul" },
  { lat: 22.3193, lng: 114.1694, label: "Hong Kong" },
  { lat: 31.2304, lng: 121.4737, label: "Shanghai" },
  { lat: 39.9042, lng: 116.4074, label: "Beijing" },
  { lat: 25.033, lng: 121.5654, label: "Taipei" },
  { lat: 1.3521, lng: 103.8198, label: "Singapore" },
  { lat: -33.8688, lng: 151.2093, label: "Sydney" },
  { lat: -37.8136, lng: 144.9631, label: "Melbourne" },
  { lat: 19.4326, lng: -99.1332, label: "Mexico City" },
  { lat: -23.5505, lng: -46.6333, label: "São Paulo" },
  { lat: -34.6037, lng: -58.3816, label: "Buenos Aires" },
];

/* --------------------------------- helpers -------------------------------- */

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function pick2<T>(arr: T[]): [T, T] {
  if (arr.length < 2) return [arr[0], arr[0]];
  const i = randInt(0, arr.length - 1);
  let j = randInt(0, arr.length - 1);
  if (j === i) j = (j + 1) % arr.length;
  return [arr[i], arr[j]];
}

// function hexToRgb(hex: string): string {
//   const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return res
//     ? `${parseInt(res[1], 16)},${parseInt(res[2], 16)},${parseInt(res[3], 16)}`
//     : "0,0,0";
// }

function parseRgbString(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "0,0,0";
  const [, r, g, b] = match;
  return `${r},${g},${b}`;
}

/* --------------------------------- types ---------------------------------- */

type ArcDatum = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};
type RingDatum = { lat: number; lng: number };
type PointDatum = {
  lat: number;
  lng: number;
  label?: string;
  __removeAt: number;
};

type Props = {
  backgroundColor?: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  polygonColor?: string;
  polygonOpacity?: number;
  polygonStrokeColor?: string;
  polygonSideColor?: string;
  polygonAltitude?: number;
};

/* -------------------------------- component -------------------------------- */

export default function Globe({
  backgroundColor = BG_BLACK,
  autoRotate = true,
  autoRotateSpeed = 0.6,
  polygonColor = "rgb(255,255,255)",
  polygonOpacity = 0.5,
  polygonSideColor = "rgb(255,255,255)",
}: // polygonSideColor = "rgb(255,255,255)",
// polygonStrokeColor = "rgb(255,255,255)",
// polygonAltitude = 0,
Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const globeRef = React.useRef<any>(null);

  console.log(`
    
    ${polygonColor}
    ${polygonOpacity}
    
    `);

  const arcsRef = React.useRef<ArcDatum[]>([]);
  const ringsRef = React.useRef<RingDatum[]>([]);
  const pointsRef = React.useRef<PointDatum[]>([]);
  const timersRef = React.useRef<number[]>([]);
  const addTimer = (id: number) => (timersRef.current.push(id), id);
  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const [basePointRadius, setBasePointRadius] = React.useState(0.001);
  React.useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 700;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setBasePointRadius(0.08 + 0.22 * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // StrictMode double-invoke guard (dev only)
  const didInitRef = React.useRef(false);

  React.useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    let cancelled = false;
    const abortCtrl = new AbortController();

    (async () => {
      const GlobeCtor = await ensureGlobe();
      if (cancelled || !containerRef.current) return;

      const topojson = await getTopo();
      containerRef.current.innerHTML = "";

      const globe = GlobeCtor()
        .backgroundColor(backgroundColor)
        .showGlobe(false)
        .showAtmosphere(false)
        .polygonsData([])
        .polygonCapColor(
          () => `rgba(${parseRgbString(polygonColor)},${polygonOpacity})`
        )
        .polygonSideColor(() => polygonSideColor)
        .polygonStrokeColor(() => `rgba(0,0,0,0)`)
        .polygonAltitude(() => 0)
        .pointsData([])
        .pointAltitude(0.01)
        .pointColor(() => NEON_WHITE)
        .pointLabel((d: any) => d.label ?? "")
        .arcsData([])
        .arcColor(() => [NEON_WHITE, NEON_WHITE])
        .arcAltitude(() => 0.22)
        .arcStroke(0.6)
        .arcDashLength(ARC_REL_LEN)
        .arcDashGap(2)
        .arcDashInitialGap(1)
        .arcDashAnimateTime(FLIGHT_TIME)
        .arcsTransitionDuration(0)
        .ringsData([])
        .ringColor(() => (t: number) => `rgba(255,255,255,${1 - t})`)
        .ringMaxRadius(RINGS_MAX_R)
        .ringPropagationSpeed(RING_PROPAGATION_SPEED)
        .ringRepeatPeriod((FLIGHT_TIME * ARC_REL_LEN) / NUM_RINGS);

      globe(containerRef.current);

      const controls = globe.controls?.();
      if (controls) {
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = autoRotateSpeed;
      }
      globeRef.current = globe;

      // land polygons
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json",
          { signal: abortCtrl.signal }
        );
        const topo = await res.json();
        const land = topojson.feature(
          topo,
          (topo as any).objects.land
        ).features;
        if (!cancelled) globe.polygonsData(land);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          console.warn("Failed to load land polygons", e);
      }

      // emission helpers
      const activeArcCount = () => arcsRef.current.length;

      function addPointWithTTL(p: PointDatum) {
        pointsRef.current = [...pointsRef.current, p];
        globe.pointsData(pointsRef.current);
        addTimer(
          window.setTimeout(() => {
            pointsRef.current = pointsRef.current.filter((x) => x !== p);
            globe.pointsData(pointsRef.current);
          }, Math.max(100, p.__removeAt - Date.now()))
        );
      }

      function addRingWithTTL(r: RingDatum, ttl: number) {
        ringsRef.current = [...ringsRef.current, r];
        globe.ringsData(ringsRef.current);
        addTimer(
          window.setTimeout(() => {
            ringsRef.current = ringsRef.current.filter((x) => x !== r);
            globe.ringsData(ringsRef.current);
          }, ttl)
        );
      }

      function emitArc(start: City, end: City) {
        addRingWithTTL(
          { lat: start.lat, lng: start.lng },
          Math.round(FLIGHT_TIME * ARC_REL_LEN)
        );
        addPointWithTTL({
          lat: start.lat,
          lng: start.lng,
          label: start.label,
          __removeAt: Date.now() + POINT_TTL,
        });

        const arc: ArcDatum = {
          startLat: start.lat,
          startLng: start.lng,
          endLat: end.lat,
          endLng: end.lng,
        };
        arcsRef.current = [...arcsRef.current, arc];
        globe.arcsData(arcsRef.current);

        addTimer(
          window.setTimeout(() => {
            arcsRef.current = arcsRef.current.filter((a) => a !== arc);
            globe.arcsData(arcsRef.current);
            scheduleUpToMax();
          }, ARC_TTL_REMOVE)
        );

        addTimer(
          window.setTimeout(() => {
            addRingWithTTL(
              { lat: end.lat, lng: end.lng },
              Math.round(FLIGHT_TIME * ARC_REL_LEN)
            );
            addPointWithTTL({
              lat: end.lat,
              lng: end.lng,
              label: end.label,
              __removeAt: Date.now() + POINT_TTL,
            });
          }, FLIGHT_TIME)
        );
      }

      function scheduleUpToMax() {
        const need = MAX_ACTIVE_ARCS - activeArcCount();
        if (need <= 0) return;
        for (let i = 0; i < need; i++) {
          const [a, b] = pick2(POPULAR_CITIES);
          const jitter = 120 + i * 220 + Math.random() * 180;
          addTimer(
            window.setTimeout(() => {
              if (!cancelled) emitArc(a, b);
            }, jitter)
          );
        }
      }

      scheduleUpToMax();

      globe.onGlobeClick?.(({ lat, lng }: { lat: number; lng: number }) => {
        const start = POPULAR_CITIES[randInt(0, POPULAR_CITIES.length - 1)];
        const end: City = { lat, lng, label: "Click" };
        if (activeArcCount() < MAX_ACTIVE_ARCS) emitArc(start, end);
      });
    })().catch(console.error);

    return () => {
      didInitRef.current = false;
      cancelled = true;
      abortCtrl.abort();
      clearAllTimers();

      try {
        const globe = globeRef.current;
        if (globe) {
          globe.controls?.()?.dispose?.();

          const renderer = globe.renderer?.();
          const scene = globe.scene?.();
          if (scene) {
            scene.traverse((obj: any) => {
              obj.geometry?.dispose?.();
              const m = obj.material;
              if (Array.isArray(m)) m.forEach((mm) => mm?.dispose?.());
              else m?.dispose?.();
              obj.texture?.dispose?.();
            });
          }
          renderer?.dispose?.();
          try {
            renderer
              ?.getContext?.()
              .getExtension?.("WEBGL_lose_context")
              ?.loseContext?.();
          } catch {}
        }
        if (containerRef.current) containerRef.current.innerHTML = "";
      } finally {
        globeRef.current = null;
      }
    };
  }, [backgroundColor, autoRotate, autoRotateSpeed]);

  // animate point radius without re-initting the globe
  React.useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointRadius(() => basePointRadius);
    globe.pointsData(globe.pointsData()); // nudge refresh
  }, [basePointRadius]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: backgroundColor,
        overflow: "hidden",
        borderRadius: 8,
      }}
    />
  );
}

addPropertyControls(Globe, {
  polygonColor: { type: ControlType.Color, title: "Color" },
  polygonOpacity: {
    type: ControlType.Number,
    title: "Opacity",
    min: 0,
    max: 1,
    step: 0.05,
  },
  // polygonStrokeColor: {
  //   type: ControlType.Color,
  //   title: "Stroke Color",
  // },
  polygonSideColor: {
    type: ControlType.Color,
    title: "Side Color",
  },
  // polygonAltitude: {
  //   type: ControlType.Number,
  //   title: "Altitude",
  //   min: 0,
  //   max: 1,
  //   step: 0.001,
  // },
});
