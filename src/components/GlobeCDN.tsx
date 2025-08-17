import * as React from "react";
import { MeshLambertMaterial, DoubleSide } from "https://esm.sh/three";
import * as topojson from "https://esm.sh/topojson-client";

function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// --- Demo data baked in ---
const DEMO_POINTS = [
  { lat: 37.7749, lng: -122.4194, label: "San Francisco" },
  { lat: 40.7128, lng: -74.006, label: "New York" },
  { lat: 51.5074, lng: -0.1278, label: "London" },
  { lat: 52.52, lng: 13.405, label: "Berlin" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
];

const DEMO_ARCS = [
  { startLat: 37.7749, startLng: -122.4194, endLat: 40.7128, endLng: -74.006 },
  { startLat: 40.7128, startLng: -74.006, endLat: 51.5074, endLng: -0.1278 },
  { startLat: 51.5074, startLng: -0.1278, endLat: 52.52, endLng: 13.405 },
  { startLat: 52.52, startLng: 13.405, endLat: 35.6762, endLng: 139.6503 },
];

type Props = {
  backgroundColor?: string;
  globeImageUrl?: string;
  arcColor?: string;
  pointColor?: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

export default function GlobeCDN({
  backgroundColor = "#0b1020",
  globeImageUrl = "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  arcColor = "#6EE7F9",
  pointColor = "#F472B6",
  autoRotate = true,
  autoRotateSpeed = 0.6,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const globeRef = React.useRef<any>(null);

  // Simple “pin drop” grow
  const [pointRadius, setPointRadius] = React.useState(0.001);
  React.useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const duration = 900;
    const loop = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setPointRadius(0.1 + 0.35 * eased);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/globe.gl");
      if (cancelled) return;
      if (!window.Globe) throw new Error("globe.gl not available");
      if (!containerRef.current) return;

      // Clear previous mount (hot reloads)
      containerRef.current.innerHTML = "";

      // Configure the globe
      const globe = window.Globe!()
        // .globeImageUrl(globeImageUrl)
        .showGlobe(false)
        .backgroundColor(backgroundColor)
        // .atmosphereColor("#88c8ff")
        // .atmosphereAltitude(0.15)
        .showAtmosphere(false)
        // Points
        .pointsData(DEMO_POINTS)
        .pointAltitude(0.01)
        .pointColor(() => pointColor)
        .pointLabel((d: any) => d.label ?? "")
        .pointRadius(pointRadius)
        // Arcs
        .arcsData(DEMO_ARCS)
        .arcColor(() => [arcColor, arcColor])
        .arcAltitude(() => 0.2)
        .arcStroke(1.2)
        .arcDashLength(0.35)
        .arcDashGap(0.2)
        .arcDashAnimateTime(1200);

      // ✅ Correct mount: pass the container element
      globe(containerRef.current);

      fetch("//cdn.jsdelivr.net/npm/world-atlas/land-110m.json")
        .then((res) => res.json())
        .then((landTopo) => {
          globe
            .polygonsData(
              topojson.feature(landTopo, landTopo.objects.land).features
            )
            .polygonCapMaterial(
              new MeshLambertMaterial({
                color: "green",
                side: DoubleSide,
              })
            )
            .polygonSideColor(() => "rgba(0,0,0,0)");
        });

      // Controls
      const controls = globe.controls?.();
      if (controls) {
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = autoRotateSpeed;
      }

      globeRef.current = globe;
    })().catch(console.error);

    return () => {
      cancelled = true;
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch (err) {
        console.log(err);
      }
      globeRef.current = null;
    };
  }, [
    backgroundColor,
    globeImageUrl,
    arcColor,
    pointColor,
    autoRotate,
    autoRotateSpeed,
    pointRadius,
  ]);

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
