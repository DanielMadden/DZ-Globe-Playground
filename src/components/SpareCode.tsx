// NOTE TO SELF: In order to efficiently utilize three.js, I need to import three and use the ESM (unbundled) version of globe.gl instead of the UMD (bundled) version of globe.gl. Otherwise I have two instances of three.js which is ridiculously clunky. This 3d logo floater is a super cool idea, however it is most definitely a stretch goal.

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
