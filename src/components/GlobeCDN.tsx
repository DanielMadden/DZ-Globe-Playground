// src/components/GlobeCDN.tsx
import * as React from "react";

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

// ---------- Neon palette ----------
const NEON_BLUE = "#00e5ff"; // outlines
const NEON_GREEN = "#39ff14"; // points
const NEON_WHITE = "#ffffff"; // arcs
const BG_BLACK = "rgba(0,0,0,0)";

// ---------- Arc & ripple tuning ----------
const ARC_REL_LEN = 0.4; // relative to whole arc length (for dash)
const FLIGHT_TIME = 1100; // ms for dash animation (arc travel)
const NUM_RINGS = 3; // ripples per event
const RINGS_MAX_R = 5; // degrees
const RING_PROPAGATION_SPEED = 5; // deg/sec

const POINT_TTL = Math.round(FLIGHT_TIME * ARC_REL_LEN); // ms
const ARC_TTL_REMOVE = FLIGHT_TIME * 2; // ms

// ---------- Popular cities (US weighted + global hubs) ----------
type City = { lat: number; lng: number; label: string };

const POPULAR_CITIES: City[] = [
  // US
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

  // Canada
  { lat: 43.65107, lng: -79.347015, label: "Toronto" },
  { lat: 49.282729, lng: -123.120738, label: "Vancouver" },

  // Europe
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

  // Middle East / Africa
  { lat: 25.2048, lng: 55.2708, label: "Dubai" },
  { lat: 30.0444, lng: 31.2357, label: "Cairo" },
  { lat: -26.2041, lng: 28.0473, label: "Johannesburg" },

  // Asia
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  { lat: 34.6937, lng: 135.5023, label: "Osaka" },
  { lat: 37.5665, lng: 126.978, label: "Seoul" },
  { lat: 22.3193, lng: 114.1694, label: "Hong Kong" },
  { lat: 31.2304, lng: 121.4737, label: "Shanghai" },
  { lat: 39.9042, lng: 116.4074, label: "Beijing" },
  { lat: 25.033, lng: 121.5654, label: "Taipei" },
  { lat: 1.3521, lng: 103.8198, label: "Singapore" },

  // Oceania
  { lat: -33.8688, lng: 151.2093, label: "Sydney" },
  { lat: -37.8136, lng: 144.9631, label: "Melbourne" },

  // LatAm
  { lat: 19.4326, lng: -99.1332, label: "Mexico City" },
  { lat: -23.5505, lng: -46.6333, label: "São Paulo" },
  { lat: -34.6037, lng: -58.3816, label: "Buenos Aires" },
];

// ---------- helpers ----------
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function pick2<T>(arr: T[]): [T, T] {
  if (arr.length < 2) return [arr[0], arr[0]];
  const i = randInt(0, arr.length - 1);
  let j = randInt(0, arr.length - 1);
  if (j === i) j = (j + 1) % arr.length;
  return [arr[i], arr[j]];
}

// ---------- types ----------
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
};

export default function GlobeCDN({
  backgroundColor = BG_BLACK,
  autoRotate = true,
  autoRotateSpeed = 0.6,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const globeRef = React.useRef<any>(null);

  // ephemeral state stored in refs (no React re-renders)
  const arcsRef = React.useRef<ArcDatum[]>([]);
  const ringsRef = React.useRef<RingDatum[]>([]);
  const pointsRef = React.useRef<PointDatum[]>([]);
  const timersRef = React.useRef<number[]>([]);
  const MAX_ACTIVE_ARCS = 3;

  // subtle point grow on mount
  const [basePointRadius, setBasePointRadius] = React.useState(0.001);
  React.useEffect(() => {
    // const cleanupFns: Array<() => void> = [];
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

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Globe CDN with fallback
      try {
        await loadScriptOnce("https://cdn.jsdelivr.net/npm/globe.gl");
      } catch {
        await loadScriptOnce("https://unpkg.com/globe.gl");
      }
      if (cancelled) return;
      if (!window.Globe) throw new Error("globe.gl not available");
      if (!containerRef.current) return;

      // 2) “Their way” for outlines: import THREE + topojson, fetch world-atlas
      const [{ MeshLambertMaterial, DoubleSide }, topojson] = await Promise.all(
        [
          import("https://esm.sh/three@0.161.0"),
          import("https://esm.sh/topojson-client@3"),
        ]
      );

      containerRef.current.innerHTML = "";

      const globe = window.Globe!()
        .backgroundColor(backgroundColor)
        .showGlobe(false)
        .showAtmosphere(false)

        // Start empty; we set polygons after fetch
        .polygonsData([])
        .polygonCapMaterial(
          // transparent cap; we're going for hollow + outline
          new MeshLambertMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.25,
            side: DoubleSide,
          })
        )
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor(() => NEON_BLUE)
        .polygonAltitude(() => 0.003)

        // points (ephemeral)
        .pointsData([])
        .pointAltitude(0.01)
        .pointColor(() => NEON_WHITE)
        .pointLabel((d: any) => d.label ?? "")
        .pointRadius(() => basePointRadius)

        // arcs
        .arcsData([])
        .arcColor(() => [NEON_WHITE, NEON_WHITE])
        .arcAltitude(() => 0.22)
        .arcStroke(0.6)
        .arcDashLength(ARC_REL_LEN)
        .arcDashGap(2)
        .arcDashInitialGap(1)
        .arcDashAnimateTime(FLIGHT_TIME)
        .arcsTransitionDuration(0)

        // rings (ripples)
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

      // 3) Fetch world-atlas land TopoJSON and convert
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json"
        );
        const topo = await res.json();
        const land = topojson.feature(topo, topo.objects.land).features;
        if (!cancelled) globe.polygonsData(land);
      } catch (e) {
        console.warn("Failed to load world-atlas land polygons", e);
      }

      // --- Arc emission with strict concurrency (max 3) & staggering ---
      const activeArcCount = () => arcsRef.current.length;

      const addTimer = (id: number) => {
        timersRef.current.push(id);
        return id;
      };
      const clearAllTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
      };

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
        // staggered: each emission can have a tiny delay
        // NOTE: staggering is handled by caller via setTimeout
        // 1) start ripple + point
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

        // 2) arc
        const arc: ArcDatum = {
          startLat: start.lat,
          startLng: start.lng,
          endLat: end.lat,
          endLng: end.lng,
        };
        arcsRef.current = [...arcsRef.current, arc];
        globe.arcsData(arcsRef.current);

        // remove arc after life, then schedule more if we’re below cap
        addTimer(
          window.setTimeout(() => {
            arcsRef.current = arcsRef.current.filter((a) => a !== arc);
            globe.arcsData(arcsRef.current);
            // fill the slot we just freed
            scheduleUpToMax();
          }, ARC_TTL_REMOVE)
        );

        // 3) target ripple + point after flight
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
          // stagger starts slightly so they don't move in lockstep
          const jitter = 120 + i * 220 + Math.random() * 180;
          addTimer(
            window.setTimeout(() => {
              // guard cancellation
              if (cancelled) return;
              emitArc(a, b);
            }, jitter)
          );
        }
      }

      // Kick off: immediately fill to max with slight staggering
      scheduleUpToMax();

      // Also allow manual testing via clicks (optional)
      globe.onGlobeClick?.(({ lat, lng }: { lat: number; lng: number }) => {
        const start = POPULAR_CITIES[randInt(0, POPULAR_CITIES.length - 1)];
        const end: City = { lat, lng, label: "Click" };
        // Only emit if we have capacity; otherwise it'll get scheduled when a slot frees
        if (activeArcCount() < MAX_ACTIVE_ARCS) {
          emitArc(start, end);
        }
      });

      // Cleanup
      return () => {
        clearAllTimers();
      };
    })().catch(console.error);

    return () => {
      cancelled = true;
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch {}
      globeRef.current = null;
    };
  }, [backgroundColor, autoRotate, autoRotateSpeed, basePointRadius]);

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

// async function mountCenterSpriteFromSVG(
//   globe: any,
//   svgMarkup: string,
//   size = 0.8
// ) {
//   // lazy-import THREE so we don't ship it unless needed
//   const THREE = await import("https://esm.sh/three@0.161.0");

//   // Turn SVG string into a data URL
//   const svgUrl =
//     "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);

//   // Load as texture
//   const loader = new THREE.TextureLoader();
//   const tex: THREE.Texture = await new Promise((resolve, reject) => {
//     loader.load(svgUrl, resolve, undefined, reject);
//   });

//   // Create a sprite at the scene origin (globe center)
//   const mat = new THREE.SpriteMaterial({
//     map: tex,
//     depthTest: false,
//     transparent: true,
//   });
//   const sprite = new THREE.Sprite(mat);
//   sprite.position.set(0, 0, 0); // center of globe
//   sprite.scale.set(size, size, 1); // tweak size (world units)

//   // Add to the globe's scene
//   const scene = globe.scene?.() || globe._scene; // globe.gl exposes .scene()
//   scene.add(sprite);

//   // Optional: keep it facing the camera on each frame (sprite already does)
//   // Optional: store sprite if you want to update later
//   return sprite;
// }

/**

      // --- THREE + SVGLoader (dynamic ESM import) ---
      const THREE = await import("https://esm.sh/three@0.161.0");
      const { SVGLoader } = await import(
        "https://esm.sh/three@0.161.0/examples/jsm/loaders/SVGLoader.js"
      );

      // --- Lights so the extruded mesh reads with depth ---
      const scene = globe.scene?.() || (globe as any)._scene;
      const camera = globe.camera?.() || (globe as any)._camera;
      const renderer = globe.renderer?.() || (globe as any)._renderer;

      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(3, 5, 4);
      scene.add(ambient, dir);

      // --- Build an extruded mesh from an SVG string ---
      // Paste your SVG markup between the backticks (keep viewBox!)
      const Z_SVG = `
 <svg width="625" height="660" viewBox="0 0 625 660" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="paint0_linear_134_42155" x1="312.715" y1="-138.205" x2="706.596" y2="50.091" gradientUnits="userSpaceOnUse">
              <stop stop-color="#2998C8"/>
              <stop offset="1" stop-color="#13244C"/>
            </linearGradient>
          </defs>
          <path d="M611.209 102.718C566.558 103.637 521.844 104.368 478.259 104.89H475.164L503.419 0H428.4L400.02 105.412H378.751C373.794 105.412 367.102 105.412 358.527 105.308L355.432 105.203L383.812 0H308.794L280.686 104.284L179.901 102.634L165.22 109.84L157.544 140.856C149.409 171.057 138.91 203.911 126.529 238.54L121.719 251.928H187.953L204.935 212.265C216.647 186.701 221.374 181.249 222.168 180.435C223.821 179.098 227.501 176.822 236.139 175.589C239.485 175.067 246.136 174.461 258.642 173.939L261.947 173.835L220.579 327.264L178.166 364.775C116.344 419.079 61.9261 465.237 16.271 502.018L13.3012 504.482L0 554.149L160.64 550.035L130.984 659.979H206.002L235.512 550.661H237.687C249.336 550.87 262.302 551.184 276.733 551.392L279.828 551.497L250.59 660H325.609L354.428 552.833L415.225 553.857H493.129L505.761 542.223L506.702 539.237C522.743 484.62 539.161 437.333 555.453 398.799L561.35 384.784H492.627L479.347 416.886C459.541 463.775 448.75 471.712 445.864 473.049C442.977 474.281 430.576 477.372 377.642 478.709L374.443 478.813L417.4 319.097L418.069 318.471C477.736 265.504 541.858 209.55 608.741 152.259L611.502 149.899L624.322 102.404L611.209 102.718ZM299.278 479.44H241.096L256.844 464.799C275.018 447.902 293.527 430.901 312.14 413.795L318.456 408.03L299.278 479.44ZM380.905 183.087C363.191 199.378 344.703 216.171 325.776 233.381L319.481 239.041L337.195 172.999H391.885L380.905 183.087Z" fill="white"/>
        </svg>
`;

      // Tiny helper: parse SVG -> THREE.Shape[] -> ExtrudeGeometry
      function makeExtrudedFromSVG(
        svgMarkup: string,
        opts?: {
          depth?: number;
          color?: number | string;
          emissive?: number | string;
          metalness?: number;
          roughness?: number;
          scale?: number;
        }
      ) {
        const {
          depth = 0.15, // extrusion depth (world units)
          color = 0x00e5ff, // neon-ish
          emissive = 0x003b4a, // subtle glow
          metalness = 0.2,
          roughness = 0.25,
          scale = 0.01, // scale SVG coordinate space into world units
        } = opts || {};

        const loader = new SVGLoader();
        const svgData = loader.parse(svgMarkup);
        const shapes: any[] = [];
        for (const p of svgData.paths) {
          const subs = SVGLoader.createShapes(p);
          shapes.push(...subs);
        }

        const geom = new THREE.ExtrudeGeometry(shapes, {
          depth,
          bevelEnabled: false,
          curveSegments: 12,
        });
        // Center the geometry around (0,0,0)
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const cx = (bb.max.x + bb.min.x) * 0.5;
        const cy = (bb.max.y + bb.min.y) * 0.5;
        const cz = (bb.max.z + bb.min.z) * 0.5;
        const mat4 = new THREE.Matrix4().makeTranslation(-cx, -cy, -cz);
        geom.applyMatrix4(mat4);
        geom.scale(scale, -scale, scale); // flip Y so SVG isn't upside down

        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive,
          metalness,
          roughness,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(0, 0, 0); // dead-center of globe
        // Give it a tiny tilt so it isn't flat-on
        mesh.rotation.x = -0.05;
        mesh.rotation.y = 0.15;
        return mesh;
      }

      // Create and add the “Z”
      const zMesh = makeExtrudedFromSVG(Z_SVG, {
        depth: 0.18,
        color: 0x00e5ff,
        emissive: 0x00151a,
        metalness: 0.25,
        roughness: 0.3,
        scale: 0.012,
      });
      scene.add(zMesh);

      // -------- Mouse parallax / tilt --------
      let pointerX = 0,
        pointerY = 0; // in [-1, 1] range, center = 0
      let targetOff = new THREE.Vector3(); // target OrbitControls.target offset
      let curOff = new THREE.Vector3();
      let targetRot = new THREE.Euler(); // tiny globe rotation
      let curRot = new THREE.Euler();
      let targetZDepth = 0; // Z mesh parallax
      let curZDepth = 0;

      // knobs
      const MAX_OFFSET = 0.35; // how far the globe's target can shift (world units)
      const MAX_ROT = 0.08; // max radians to rotate globe
      const Z_MAX_PARALLAX = 0.35; // how much Z mesh moves toward camera
      const EASING = 0.08; // lerp factor per frame
      const DIMINISH = 0.55; // diminishing curvature

      // Track mouse in viewport
      const onPointerMove = (ev: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1; // [-1,1]
        const my = ((ev.clientY - rect.top) / rect.height) * 2 - 1; // [-1,1]
        pointerX = mx;
        pointerY = my;
      };
      renderer.domElement.addEventListener("mousemove", onPointerMove);

      // Compute diminishing response
      function diminishing(v: number, k = DIMINISH) {
        // odd-symmetric smooth curve: v * k / (1 + k*|v|)
        const s = Math.sign(v);
        const a = Math.abs(v);
        return (s * (a * k)) / (1 + k * a);
      }

      // Animate toward targets each frame
      const originalTarget = (globe.controls?.().target.clone?.() ||
        new THREE.Vector3(0, 0, 0)) as any;
      const originalRotationY = scene.rotation.y;
      const originalRotationX = scene.rotation.x;

      function rafLoop() {
        // Opposite direction shift: move target slightly opposite to mouse
        const dx = -diminishing(pointerX) * MAX_OFFSET;
        const dy = diminishing(pointerY) * MAX_OFFSET; // y inverted so up-move pulls target up

        targetOff.set(dx, dy, 0);
        curOff.lerp(targetOff, EASING);
        const controls = globe.controls?.();
        if (controls) {
          controls.target.copy(originalTarget).add(curOff);
          controls.update();
        }

        // Subtle spin/tilt of the globe *itself* toward the mouse
        targetRot.set(
          originalRotationX + diminishing(pointerY) * MAX_ROT,
          originalRotationY + diminishing(pointerX) * MAX_ROT,
          0
        );
        curRot.x += (targetRot.x - curRot.x) * EASING;
        curRot.y += (targetRot.y - curRot.y) * EASING;
        scene.rotation.x = curRot.x;
        scene.rotation.y = curRot.y;

        // Z mesh parallax + tilt toward mouse
        targetZDepth =
          diminishing((Math.abs(pointerX) + Math.abs(pointerY)) * 0.5) *
          Z_MAX_PARALLAX;
        curZDepth += (targetZDepth - curZDepth) * EASING;
        zMesh.position.z = curZDepth; // push toward camera a touch

        // make Z “look slightly at” the mouse direction
        zMesh.rotation.x +=
          (-pointerY * 0.2 - zMesh.rotation.x) * (EASING * 0.8);
        zMesh.rotation.y +=
          (pointerX * 0.3 - zMesh.rotation.y) * (EASING * 0.8);

        requestAnimationFrame(rafLoop);
      }
      rafLoop();

      // Cleanup listeners on unmount
      // (You already have a cleanup function; add this inside it)
      // cleanupFns.push(() =>
      renderer.domElement.removeEventListener("mousemove", onPointerMove);
      // );

       */
