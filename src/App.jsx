import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCw, Camera as CameraIcon, Smartphone, X, Loader2 } from 'lucide-react';

const FRAME_PRESETS = [
  { id: 'oak', label: 'White Oak', caption: 'Solid, hand-oiled', color: '#c9a46b', roughness: 0.55, metalness: 0.0, swatch: 'wood-light' },
  { id: 'walnut', label: 'Walnut', caption: 'Rich, close-grained', color: '#5b3a29', roughness: 0.5, metalness: 0.0, swatch: 'wood-dark' },
  { id: 'steel', label: 'Matte Black Steel', caption: 'Powder-coated', roughness: 0.6, metalness: 0.85, color: '#1c1c1c', swatch: 'metal-black' },
  { id: 'brass', label: 'Brushed Brass', caption: 'Warms with age', roughness: 0.32, metalness: 0.9, color: '#c9a24b', swatch: 'metal-brass' },
];

const UPHOLSTERY_PRESETS = [
  { id: 'boucle', label: 'Ivory Bouclé', caption: 'Looped wool blend', color: '#ede6d6', roughness: 0.95, metalness: 0.0, swatch: 'fabric-boucle' },
  { id: 'wool', label: 'Charcoal Wool', caption: 'Tight woven, durable', color: '#3a3d3e', roughness: 0.9, metalness: 0.0, swatch: 'fabric-wool' },
  { id: 'leather', label: 'Cognac Leather', caption: 'Full-grain, ages well', color: '#7a3e22', roughness: 0.4, metalness: 0.05, swatch: 'leather' },
  { id: 'velvet', label: 'Sage Velvet', caption: 'Soft cotton velvet', color: '#5e6e5a', roughness: 0.55, metalness: 0.02, swatch: 'fabric-velvet' },
];

const BG_COLOR = 0x121b16;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function App() {
  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const arOverlayRef = useRef(null);
  const sceneRef = useRef({});

  const [activeTab, setActiveTab] = useState('frame');
  const [frameId, setFrameId] = useState(FRAME_PRESETS[0].id);
  const [upholsteryId, setUpholsteryId] = useState(UPHOLSTERY_PRESETS[2].id);
  const [autoRotate, setAutoRotate] = useState(true);
  const [ready, setReady] = useState(false);
  const [arState, setArState] = useState('idle'); // idle | checking | active | unsupported
  const [arMessage, setArMessage] = useState('');

  // ---------- Three.js setup (runs once) ----------
  useEffect(() => {
    const mount = mountRef.current;
    const canvas = canvasRef.current;
    if (!mount || !canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      setArMessage('WebGL is not available in this browser.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    const fog = new THREE.FogExp2(BG_COLOR, 0.055);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    // Lights
    const hemi = new THREE.HemisphereLight(0xdcd6c2, 0x0d140f, 0.7);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1d6, 1.15);
    key.position.set(3, 5, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.far = 10;
    key.shadow.bias = -0.0015;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd9ff, 0.25);
    fill.position.set(-3, 2, -1.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc9a24b, 0.4);
    rim.position.set(-0.5, 3, -4);
    scene.add(rim);

    // Ground / shadow catcher
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 64),
      new THREE.ShadowMaterial({ opacity: 0.38 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---------- Build chair ----------
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.55, metalness: 0.0 });
    const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3e22, roughness: 0.4, metalness: 0.05 });

    const chairGroup = new THREE.Group();

    const addFrameMesh = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, frameMaterial);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      chairGroup.add(m);
      return m;
    };
    const addCushionMesh = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, cushionMaterial);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      chairGroup.add(m);
      return m;
    };

    const legGeo = new THREE.CylinderGeometry(0.028, 0.042, 0.55, 16);
    addFrameMesh(legGeo, 0.42, 0.275, 0.34);
    addFrameMesh(legGeo, -0.42, 0.275, 0.34);

    const postGeo = new THREE.CylinderGeometry(0.032, 0.045, 1.55, 16);
    addFrameMesh(postGeo, 0.42, 0.775, -0.34);
    addFrameMesh(postGeo, -0.42, 0.775, -0.34);

    addFrameMesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), 0, 1.5, -0.34);
    addFrameMesh(new THREE.BoxGeometry(0.12, 0.09, 0.78), 0.5, 0.86, 0.02);
    addFrameMesh(new THREE.BoxGeometry(0.12, 0.09, 0.78), -0.5, 0.86, 0.02);

    addCushionMesh(new THREE.BoxGeometry(1.0, 0.16, 0.86), 0, 0.63, 0.0);
    addCushionMesh(new THREE.BoxGeometry(0.94, 0.85, 0.15), 0, 1.15, -0.34, -0.14);

    chairGroup.position.set(0, 0, 0);
    scene.add(chairGroup);

    // ---------- Camera orbit state (custom controls; no OrbitControls dependency) ----------
    const spherical = { radius: 3.3, theta: 0.55, phi: 1.12 };
    const target = new THREE.Vector3(0, 0.85, 0);
    const dragging = { current: false };
    const prevPointer = { x: 0, y: 0 };
    const lastInteraction = { current: 0 };

    const updateCameraFromSpherical = () => {
      const { radius, theta, phi } = spherical;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    };
    updateCameraFromSpherical();

    const onPointerDown = (e) => {
      dragging.current = true;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
      lastInteraction.current = performance.now();
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const onPointerMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
      spherical.theta -= dx * 0.0062;
      spherical.phi = clamp(spherical.phi - dy * 0.0062, 0.35, 1.48);
      lastInteraction.current = performance.now();
    };
    const onPointerUp = () => {
      dragging.current = false;
      canvas.style.cursor = 'grab';
    };
    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = clamp(spherical.radius + e.deltaY * 0.0018, 1.7, 5.5);
      lastInteraction.current = performance.now();
    };

    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // ---------- Resize ----------
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // ---------- Material targets ----------
    const frameTarget = { color: new THREE.Color(0xc9a46b), roughness: 0.55, metalness: 0.0 };
    const cushionTarget = { color: new THREE.Color(0x7a3e22), roughness: 0.4, metalness: 0.05 };

    const lerpMaterial = (mat, tgt) => {
      mat.color.lerp(tgt.color, 0.1);
      mat.roughness += (tgt.roughness - mat.roughness) * 0.1;
      mat.metalness += (tgt.metalness - mat.metalness) * 0.1;
    };

    // ---------- Animation loop ----------
    const animate = (time) => {
      lerpMaterial(frameMaterial, frameTarget);
      lerpMaterial(cushionMaterial, cushionTarget);

      if (!renderer.xr.isPresenting) {
        if (sceneRef.current.autoRotate && !dragging.current && time - lastInteraction.current > 1400) {
          spherical.theta += 0.0022;
        }
        updateCameraFromSpherical();
      }
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      chairGroup,
      fog,
      frameTarget,
      cushionTarget,
      autoRotate: true,
      xrSession: null,
      savedBg: null,
    };

    setReady(true);

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
      frameMaterial.dispose();
      cushionMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  // ---------- Sync React state -> three.js targets ----------
  useEffect(() => {
    const preset = FRAME_PRESETS.find((p) => p.id === frameId);
    const s = sceneRef.current;
    if (preset && s.frameTarget) {
      s.frameTarget.color.set(preset.color);
      s.frameTarget.roughness = preset.roughness;
      s.frameTarget.metalness = preset.metalness;
    }
  }, [frameId]);

  useEffect(() => {
    const preset = UPHOLSTERY_PRESETS.find((p) => p.id === upholsteryId);
    const s = sceneRef.current;
    if (preset && s.cushionTarget) {
      s.cushionTarget.color.set(preset.color);
      s.cushionTarget.roughness = preset.roughness;
      s.cushionTarget.metalness = preset.metalness;
    }
  }, [upholsteryId]);

  useEffect(() => {
    sceneRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // ---------- Snapshot ----------
  const handleSnapshot = useCallback(() => {
    const s = sceneRef.current;
    if (!s.renderer) return;
    s.renderer.render(s.scene, s.camera);
    const url = s.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-lounge-chair-configuration.png';
    a.click();
  }, []);

  // ---------- AR ----------
  const handleAR = useCallback(async () => {
    const s = sceneRef.current;
    setArMessage('');
    setArState('checking');

    if (!navigator.xr || !navigator.xr.isSessionSupported) {
      setArState('unsupported');
      setArMessage("This browser doesn't support WebXR. Try Chrome on an ARCore-capable Android device.");
      return;
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        setArState('unsupported');
        setArMessage("This device or browser can't start AR sessions.");
        return;
      }
      const sessionInit = { optionalFeatures: ['local-floor', 'dom-overlay'] };
      if (arOverlayRef.current) sessionInit.domOverlay = { root: arOverlayRef.current };
      const session = await navigator.xr.requestSession('immersive-ar', sessionInit);

      s.savedBg = s.scene.background;
      s.savedFog = s.scene.fog;
      s.scene.background = null;
      s.scene.fog = null;
      s.chairGroup.position.set(0, -1.3, -1.6);

      s.renderer.xr.enabled = true;
      await s.renderer.xr.setSession(session);
      s.xrSession = session;
      setArState('active');

      session.addEventListener('end', () => {
        s.renderer.xr.enabled = false;
        s.xrSession = null;
        s.scene.background = s.savedBg;
        s.scene.fog = s.savedFog;
        s.chairGroup.position.set(0, 0, 0);
        setArState('idle');
        const rect = mountRef.current.getBoundingClientRect();
        s.camera.aspect = rect.width / rect.height;
        s.camera.updateProjectionMatrix();
        s.renderer.setSize(rect.width, rect.height, false);
      });
    } catch (err) {
      setArState('unsupported');
      setArMessage((err && err.message) || "AR isn't available in this environment.");
    }
  }, []);

  const exitAR = useCallback(() => {
    if (sceneRef.current.xrSession) sceneRef.current.xrSession.end();
  }, []);

  const framePreset = FRAME_PRESETS.find((p) => p.id === frameId);
  const upholsteryPreset = UPHOLSTERY_PRESETS.find((p) => p.id === upholsteryId);
  const activePresets = activeTab === 'frame' ? FRAME_PRESETS : UPHOLSTERY_PRESETS;
  const activeSelected = activeTab === 'frame' ? frameId : upholsteryId;
  const setActiveSelected = activeTab === 'frame' ? setFrameId : setUpholsteryId;

  return (
    <div className="apc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');

        .apc-root {
          --bg: #121b16;
          --panel: #172219;
          --line: #2a3a30;
          --text: #f1ede4;
          --muted: #a9bdae;
          --accent: #c9a24b;
          --accent-ink: #1b2a22;
          font-family: 'Inter', -apple-system, sans-serif;
          color: var(--text);
          background: var(--bg);
          width: 100vw;
          height: 100vh;
          display: flex;
          overflow: hidden;
        }
        @media (max-width: 820px) {
          .apc-root { flex-direction: column; }
        }

        .apc-viewport {
          position: relative;
          flex: 1 1 auto;
          min-width: 0;
          background: radial-gradient(120% 100% at 50% 20%, #1a2a20 0%, var(--bg) 70%);
        }
        @media (max-width: 820px) {
          .apc-viewport { flex: 0 0 46%; }
        }
        .apc-viewport canvas {
          width: 100%;
          height: 100%;
          display: block;
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .apc-viewport canvas.is-ready { opacity: 1; }

        .apc-loading {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          gap: 8px; color: var(--muted); font-size: 13px; letter-spacing: 0.02em;
        }
        .apc-spin { animation: apc-spin 1s linear infinite; }
        @keyframes apc-spin { to { transform: rotate(360deg); } }

        .apc-hud-top {
          position: absolute; top: 20px; left: 24px; right: 24px;
          pointer-events: none;
        }
        .apc-eyebrow {
          font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--accent); font-weight: 600; margin: 0 0 6px;
        }
        .apc-title {
          font-family: 'Fraunces', serif; font-optical-sizing: auto;
          font-size: 28px; font-weight: 600; margin: 0 0 6px; line-height: 1.1;
        }
        .apc-subtitle {
          font-size: 13px; color: var(--muted); margin: 0;
        }

        .apc-hud-bottom {
          position: absolute; bottom: 18px; left: 24px; right: 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .apc-hint {
          font-size: 11.5px; color: var(--muted);
          background: rgba(18,27,22,0.55); border: 1px solid var(--line);
          padding: 6px 12px; border-radius: 999px; backdrop-filter: blur(4px);
        }
        .apc-tools { display: flex; gap: 8px; }
        .apc-icon-btn {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(18,27,22,0.6); border: 1px solid var(--line);
          color: var(--text); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .apc-icon-btn:hover { border-color: var(--accent); color: var(--accent); }
        .apc-icon-btn.is-active { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

        .apc-ar-overlay {
          position: fixed; inset: 0; display: flex; align-items: flex-end; justify-content: center;
          padding-bottom: 40px; pointer-events: none; z-index: 50;
        }
        .apc-ar-exit {
          opacity: 0; pointer-events: none; transition: opacity 0.2s;
          display: flex; align-items: center; gap: 8px;
          background: rgba(18,27,22,0.85); color: #fff; border: 1px solid rgba(255,255,255,0.25);
          padding: 12px 20px; border-radius: 999px; font-size: 14px; cursor: pointer;
        }
        .apc-ar-overlay.is-active .apc-ar-exit { opacity: 1; pointer-events: auto; }

        .apc-ar-toast {
          position: absolute; left: 24px; right: 24px; bottom: 66px;
          background: rgba(18,27,22,0.9); border: 1px solid var(--line);
          border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: var(--muted);
          display: flex; align-items: flex-start; gap: 10px;
        }
        .apc-ar-toast button {
          margin-left: auto; background: none; border: none; color: var(--muted);
          cursor: pointer; padding: 0;
        }

        .apc-panel {
          width: 360px; flex-shrink: 0;
          background: var(--panel); border-left: 1px solid var(--line);
          display: flex; flex-direction: column;
          overflow-y: auto;
        }
        @media (max-width: 820px) {
          .apc-panel { width: 100%; border-left: none; border-top: 1px solid var(--line); }
        }

        .apc-panel-section { padding: 20px 22px; border-bottom: 1px solid var(--line); }

        .apc-specs { display: flex; gap: 0; }
        .apc-spec { flex: 1; }
        .apc-spec + .apc-spec { border-left: 1px solid var(--line); padding-left: 14px; margin-left: 14px; }
        .apc-spec-label { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 4px; }
        .apc-spec-value { font-size: 14px; font-weight: 500; margin: 0; }

        .apc-tabs { display: flex; gap: 6px; }
        .apc-tab {
          flex: 1; text-align: center; padding: 10px 8px; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer; color: var(--muted);
          background: transparent; border: 1px solid var(--line); transition: all 0.15s;
        }
        .apc-tab.is-active { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

        .apc-swatch-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px;
        }
        .apc-swatch-card {
          border: 1px solid var(--line); border-radius: 10px; padding: 10px;
          cursor: pointer; background: rgba(0,0,0,0.12); transition: border-color 0.15s, transform 0.1s;
          text-align: left;
        }
        .apc-swatch-card:hover { transform: translateY(-1px); }
        .apc-swatch-card.is-selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .apc-swatch-chip {
          width: 100%; height: 44px; border-radius: 6px; margin-bottom: 8px;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3);
        }
        .apc-swatch-label { font-size: 12.5px; font-weight: 500; margin: 0; }
        .apc-swatch-caption { font-size: 11px; color: var(--muted); margin: 2px 0 0; }

        .apc-panel-footer { padding: 20px 22px; margin-top: auto; }
        .apc-ar-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px; border-radius: 10px; border: 1px solid var(--accent);
          background: transparent; color: var(--accent); font-size: 13.5px; font-weight: 600;
          cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .apc-ar-btn:hover { background: var(--accent); color: var(--accent-ink); }
        .apc-ar-btn:disabled { opacity: 0.6; cursor: default; }
        .apc-ar-status { font-size: 11.5px; color: var(--muted); margin-top: 10px; line-height: 1.5; }

        .swatch.wood-light { background: repeating-linear-gradient(100deg, #d8b788, #d8b788 3px, #c9a46b 3px, #c9a46b 6px, #b8955c 6px 8px); }
        .swatch.wood-dark { background: repeating-linear-gradient(100deg, #6b4632, #6b4632 3px, #5b3a29 3px, #5b3a29 6px, #4a2e20 6px 8px); }
        .swatch.metal-black { background: linear-gradient(135deg, #2b2b2b, #0e0e0e 40%, #3a3a3a 60%, #101010); }
        .swatch.metal-brass { background: linear-gradient(135deg, #e8cf8a, #b8873a 45%, #f1dfa0 55%, #8a651f); }
        .swatch.fabric-boucle {
          background:
            radial-gradient(circle at 30% 30%, #f7f2e6 0 2px, transparent 2.6px) 0 0/7px 7px,
            radial-gradient(circle at 70% 70%, #ece3cd 0 2px, transparent 2.6px) 3.5px 3.5px/7px 7px,
            #ede6d6;
        }
        .swatch.fabric-wool { background: repeating-linear-gradient(45deg, #3a3d3e, #3a3d3e 2px, #333637 2px, #333637 4px); }
        .swatch.leather {
          background:
            radial-gradient(circle at 20% 20%, #8a4a2c 0 6%, transparent 7%) 0 0/14px 14px,
            radial-gradient(circle at 70% 60%, #703a1e 0 6%, transparent 7%) 7px 7px/14px 14px,
            #7a3e22;
        }
        .swatch.fabric-velvet { background: repeating-linear-gradient(90deg, #5e6e5a, #5e6e5a 2px, #67785f 2px, #67785f 4px); }
      `}</style>

      <div className="apc-viewport" ref={mountRef}>
        <canvas ref={canvasRef} className={ready ? 'is-ready' : ''} />
        {!ready && (
          <div className="apc-loading">
            <Loader2 size={16} className="apc-spin" /> Preparing atelier…
          </div>
        )}

        <div className="apc-hud-top">
          <p className="apc-eyebrow">Material Studio</p>
          <h2 className="apc-title">Atlas — Lounge Chair</h2>
          <p className="apc-subtitle">{framePreset?.label} frame · {upholsteryPreset?.label}</p>
        </div>

        <div className="apc-hud-bottom">
          <span className="apc-hint">Drag to orbit · Scroll to zoom</span>
          <div className="apc-tools">
            <button
              className={`apc-icon-btn ${autoRotate ? 'is-active' : ''}`}
              onClick={() => setAutoRotate((v) => !v)}
              title="Toggle auto-rotate"
              aria-label="Toggle auto-rotate"
            >
              <RotateCw size={16} />
            </button>
            <button className="apc-icon-btn" onClick={handleSnapshot} title="Save snapshot" aria-label="Save snapshot">
              <CameraIcon size={16} />
            </button>
          </div>
        </div>

        {arMessage && arState !== 'active' && (
          <div className="apc-ar-toast">
            <span>{arMessage}</span>
            <button onClick={() => setArMessage('')} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <div className={`apc-ar-overlay ${arState === 'active' ? 'is-active' : ''}`} ref={arOverlayRef}>
          <button className="apc-ar-exit" onClick={exitAR}>
            <X size={16} /> Exit AR
          </button>
        </div>
      </div>

      <aside className="apc-panel">
        <div className="apc-panel-section apc-specs">
          <div className="apc-spec">
            <p className="apc-spec-label">Width</p>
            <p className="apc-spec-value">84 cm</p>
          </div>
          <div className="apc-spec">
            <p className="apc-spec-label">Depth</p>
            <p className="apc-spec-value">78 cm</p>
          </div>
          <div className="apc-spec">
            <p className="apc-spec-label">Height</p>
            <p className="apc-spec-value">112 cm</p>
          </div>
        </div>

        <div className="apc-panel-section">
          <div className="apc-tabs">
            <button
              className={`apc-tab ${activeTab === 'frame' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('frame')}
            >
              Frame
            </button>
            <button
              className={`apc-tab ${activeTab === 'upholstery' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('upholstery')}
            >
              Upholstery
            </button>
          </div>

          <div className="apc-swatch-grid">
            {activePresets.map((preset) => (
              <button
                key={preset.id}
                className={`apc-swatch-card ${activeSelected === preset.id ? 'is-selected' : ''}`}
                onClick={() => setActiveSelected(preset.id)}
              >
                <div className={`apc-swatch-chip swatch ${preset.swatch}`} />
                <p className="apc-swatch-label">{preset.label}</p>
                <p className="apc-swatch-caption">{preset.caption}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="apc-panel-footer">
          <button className="apc-ar-btn" onClick={handleAR} disabled={arState === 'checking' || arState === 'active'}>
            {arState === 'checking' ? <Loader2 size={16} className="apc-spin" /> : <Smartphone size={16} />}
            {arState === 'active' ? 'AR session running' : 'View in Your Space'}
          </button>
          <p className="apc-ar-status">
            Uses your device's WebXR support to place this configuration in front of you at real scale.
            Requires a compatible mobile browser (e.g. Chrome on ARCore-supported Android) served over HTTPS.
          </p>
        </div>
      </aside>
    </div>
  );
}
