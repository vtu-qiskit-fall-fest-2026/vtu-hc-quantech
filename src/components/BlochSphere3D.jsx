import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Compass,
  RotateCcw,
  Play,
  Pause,
  AlertCircle,
  Info,
  Layers,
  ChevronRight,
  Maximize2
} from 'lucide-react';

/**
 * Creates a text sprite for 3D axis labels using an HTML Canvas.
 */
function createTextSprite(text, color = '#1F2433', fontSize = 28, bgColor = 'rgba(255,255,255,0.85)') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background pill
  ctx.fillStyle = bgColor;
  const radius = 24;
  const x = 32;
  const y = 24;
  const w = 192;
  const h = 80;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Text
  ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.65, 0.325, 1);
  return sprite;
}

export default function BlochSphere3D({
  qubitIndex = 0,
  blochVector = null,
  isEntangled = false,
  purity = 1.0,
  height = 360
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showProjections, setShowProjections] = useState(true);

  // Parse bloch coordinates
  const hasVector = Array.isArray(blochVector) && blochVector.length === 3;
  const vx = hasVector ? blochVector[0] : 0;
  const vy = hasVector ? blochVector[1] : 0;
  const vz = hasVector ? blochVector[2] : (isEntangled ? 0 : 1);

  // Compute angles and length
  const r = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const clampedZ = r > 0.0001 ? Math.max(-1, Math.min(1, vz / r)) : 1;
  const thetaRad = Math.acos(clampedZ);
  const thetaDeg = (thetaRad * 180 / Math.PI);
  const phiRad = Math.atan2(vy, vx);
  const phiDeg = ((phiRad * 180 / Math.PI) + 360) % 360;

  // Theoretical Born probabilities
  const prob0 = Math.cos(thetaRad / 2) ** 2;
  const prob1 = Math.sin(thetaRad / 2) ** 2;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const h = height;

    // 1. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / h, 0.1, 50);
    // Position camera isometric looking at center
    camera.position.set(2.8, 2.2, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.8;
    controls.minDistance = 2.0;
    controls.maxDistance = 7.0;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(3, 5, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.6);
    dirLight2.position.set(-3, -2, -3);
    scene.add(dirLight2);

    // 4. Bloch Sphere Geometry
    const sphereRadius = 1.35;

    // Translucent sphere mesh
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 36, 24);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0xEEF2FF,
      transparent: true,
      opacity: 0.18,
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 0.7,
      depthWrite: false
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphereMesh);

    // Subtle latitude / longitude rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0xCBD5E1, transparent: true, opacity: 0.45 });
    
    // Equator circle (Y = 0 in Three.js, corresponding to Z_quantum = 0)
    const equatorGeo = new THREE.RingGeometry(sphereRadius - 0.005, sphereRadius + 0.005, 64);
    const equatorMat = new THREE.MeshBasicMaterial({ color: 0x0E9F9B, side: THREE.DoubleSide });
    const equator = new THREE.Mesh(equatorGeo, equatorMat);
    equator.rotation.x = Math.PI / 2;
    scene.add(equator);

    // Meridian circles
    const meridian1Geo = new THREE.BufferGeometry();
    const meridian2Geo = new THREE.BufferGeometry();
    const pts1 = [];
    const pts2 = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts1.push(new THREE.Vector3(Math.cos(angle) * sphereRadius, Math.sin(angle) * sphereRadius, 0));
      pts2.push(new THREE.Vector3(0, Math.sin(angle) * sphereRadius, Math.cos(angle) * sphereRadius));
    }
    meridian1Geo.setFromPoints(pts1);
    meridian2Geo.setFromPoints(pts2);
    const meridian1 = new THREE.Line(meridian1Geo, ringMat);
    const meridian2 = new THREE.Line(meridian2Geo, ringMat);
    scene.add(meridian1);
    scene.add(meridian2);

    // 5. Axes
    // Three.js mappings:
    // Three.js Y = Quantum Z (|0> top, |1> bottom)
    // Three.js X = Quantum X (|+> / |->)
    // Three.js Z = Quantum Y (|i+> / |i->)
    const axisExt = sphereRadius * 1.35;

    // Helper to build a cylinder axis with two cones
    const createAxisLine = (start, end, colorHex) => {
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();
      const geom = new THREE.CylinderGeometry(0.012, 0.012, len, 8);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(start).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return mesh;
    };

    // Z-Axis (Vertical: |0> is +Y_3D, |1> is -Y_3D)
    scene.add(createAxisLine(new THREE.Vector3(0, -axisExt, 0), new THREE.Vector3(0, axisExt, 0), 0x4F46E5));
    // X-Axis (Horizontal: |+> is +X_3D, |-> is -X_3D)
    scene.add(createAxisLine(new THREE.Vector3(-axisExt, 0, 0), new THREE.Vector3(axisExt, 0, 0), 0xF2705A));
    // Y-Axis (Depth: |i+> is +Z_3D, |i-> is -Z_3D)
    scene.add(createAxisLine(new THREE.Vector3(0, 0, -axisExt), new THREE.Vector3(0, 0, axisExt), 0x0E9F9B));

    // Axis Labels
    const label0 = createTextSprite('|0⟩ (+z)', '#4F46E5', 24);
    label0.position.set(0, axisExt + 0.22, 0);
    scene.add(label0);

    const label1 = createTextSprite('|1⟩ (-z)', '#4F46E5', 24);
    label1.position.set(0, -axisExt - 0.22, 0);
    scene.add(label1);

    const labelPlus = createTextSprite('|+⟩ (+x)', '#F2705A', 22);
    labelPlus.position.set(axisExt + 0.24, 0, 0);
    scene.add(labelPlus);

    const labelMinus = createTextSprite('|-⟩ (-x)', '#F2705A', 22);
    labelMinus.position.set(-axisExt - 0.24, 0, 0);
    scene.add(labelMinus);

    const labelIPlus = createTextSprite('|i+⟩ (+y)', '#0E9F9B', 22);
    labelIPlus.position.set(0, 0, axisExt + 0.24);
    scene.add(labelIPlus);

    const labelIMinus = createTextSprite('|i-⟩ (-y)', '#0E9F9B', 22);
    labelIMinus.position.set(0, 0, -axisExt - 0.24);
    scene.add(labelIMinus);

    // 6. Origin Marker
    const originGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const originMat = new THREE.MeshBasicMaterial({ color: 0x4A5168 });
    const originMesh = new THREE.Mesh(originGeo, originMat);
    scene.add(originMesh);

    // 7. State Vector Arrow or Entangled Mixed State Representation
    if (isEntangled || (!hasVector && purity < 0.99)) {
      // Mixed State / Entangled: Bloch vector collapsed towards center
      const mixedGeo = new THREE.SphereGeometry(0.18, 24, 24);
      const mixedMat = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        emissive: 0xF59E0B,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85
      });
      const mixedCore = new THREE.Mesh(mixedGeo, mixedMat);
      scene.add(mixedCore);

      // Warning pulse ring at origin
      const pulseGeo = new THREE.RingGeometry(0.25, 0.29, 32);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B, side: THREE.DoubleSide });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      pulseMesh.rotation.x = Math.PI / 2;
      scene.add(pulseMesh);

      const mixedLabel = createTextSprite(`Entangled Mixed State (r=${r.toFixed(2)})`, '#D97706', 22, 'rgba(254, 243, 199, 0.95)');
      mixedLabel.position.set(0, 0.45, 0);
      scene.add(mixedLabel);
    } else {
      // Pure or unentangled state: Vector pointing to (X_3D, Y_3D, Z_3D)
      // Three.js mapping: (x_3d, y_3d, z_3d) = (vx, vz, vy) * sphereRadius
      const targetPos = new THREE.Vector3(vx, vz, vy).multiplyScalar(sphereRadius);
      const vecLen = targetPos.length();

      if (vecLen > 0.05) {
        const dir = targetPos.clone().normalize();
        const arrowHelper = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), vecLen, 0x4F46E5, 0.24, 0.12);
        arrowHelper.line.material.linewidth = 3;
        scene.add(arrowHelper);

        // Glowing state tip sphere
        const tipGeo = new THREE.SphereGeometry(0.065, 16, 16);
        const tipMat = new THREE.MeshStandardMaterial({
          color: 0x4338CA,
          emissive: 0x4F46E5,
          emissiveIntensity: 0.6
        });
        const tipMesh = new THREE.Mesh(tipGeo, tipMat);
        tipMesh.position.copy(targetPos);
        scene.add(tipMesh);

        // Projection dashed line onto equator plane (Y_3D = 0)
        if (showProjections) {
          const projTarget = new THREE.Vector3(targetPos.x, 0, targetPos.z);
          
          // Vertical drop line from state point to equator
          const dropLineGeo = new THREE.BufferGeometry().setFromPoints([targetPos, projTarget]);
          const dropLineMat = new THREE.LineDashedMaterial({
            color: 0x94A3B8,
            dashSize: 0.06,
            gapSize: 0.04
          });
          const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
          dropLine.computeLineDistances();
          scene.add(dropLine);

          // Radial phase line from origin to projected point
          const phaseLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), projTarget]);
          const phaseLineMat = new THREE.LineDashedMaterial({
            color: 0x0E9F9B,
            dashSize: 0.06,
            gapSize: 0.04
          });
          const phaseLine = new THREE.Line(phaseLineGeo, phaseLineMat);
          phaseLine.computeLineDistances();
          scene.add(phaseLine);

          // Footprint marker on equator
          const footGeo = new THREE.CircleGeometry(0.035, 16);
          const footMat = new THREE.MeshBasicMaterial({ color: 0x0E9F9B, side: THREE.DoubleSide });
          const footMesh = new THREE.Mesh(footGeo, footMat);
          footMesh.rotation.x = Math.PI / 2;
          footMesh.position.copy(projTarget);
          scene.add(footMesh);
        }

        // State vector label
        const stateLabel = createTextSprite('|ψ⟩', '#4F46E5', 28, 'rgba(238, 242, 255, 0.95)');
        stateLabel.position.copy(targetPos).add(new THREE.Vector3(0, 0.18, 0));
        scene.add(stateLabel);
      }
    }

    // 8. Animation loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [vx, vy, vz, isEntangled, purity, autoRotate, showProjections, height]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(2.8, 2.2, 3.2);
      controlsRef.current.object.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#ECE8E1] shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[#FBFAF7] border-b border-[#ECE8E1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#EEF0FF] text-[#4F46E5] flex items-center justify-center">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-bold text-xs text-[#1F2433]">
            Qubit q[{qubitIndex}] 3D Bloch Sphere
          </span>
          {isEntangled ? (
            <span className="px-2 py-0.5 rounded-full bg-[#FFF4DB] text-[#D97706] text-[10px] font-bold border border-[#D97706]/30">
              Entangled Mixed State
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-[#E4F6EA] text-[#16A34A] text-[10px] font-bold border border-[#16A34A]/30">
              Pure State (|r| = 1.0)
            </span>
          )}
        </div>

        {/* Toolbar: Auto-rotate, Reset, Projection Toggle */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setAutoRotate(prev => !prev)}
            title={autoRotate ? 'Pause Rotation' : 'Auto Rotate 3D View'}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-[#EEF0FF] text-[#4F46E5] border-[#4F46E5]/30'
                : 'bg-white text-[#4A5168] border-[#ECE8E1] hover:text-[#1F2433]'
            }`}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset 3D Camera View"
            className="p-1.5 rounded-lg bg-white border border-[#ECE8E1] text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowProjections(prev => !prev)}
            title="Toggle Polar/Phase Projections"
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
              showProjections
                ? 'bg-[#E3F6F5] text-[#0E9F9B] border-[#0E9F9B]/30'
                : 'bg-white text-[#4A5168] border-[#ECE8E1]'
            }`}
          >
            Guide Lines
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative bg-gradient-to-b from-[#FBFAF7] to-white">
        <div
          ref={containerRef}
          style={{ height: `${height}px` }}
          className="w-full cursor-grab active:cursor-grabbing select-none"
        />

        {/* Floating Hint Overlay */}
        <div className="absolute bottom-2 left-3 text-[10px] text-[#4A5168] pointer-events-none flex items-center gap-1 bg-white/80 backdrop-blur-xs px-2 py-1 rounded-md border border-[#ECE8E1]">
          <span>🖱️ Click & Drag to Orbit • Scroll to Zoom</span>
        </div>
      </div>

      {/* Telemetry Readout Grid */}
      <div className="p-3.5 bg-white border-t border-[#ECE8E1] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Polar Angle (Theta) */}
        <div className="p-2 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
          <span className="text-[10px] text-[#4A5168] block uppercase font-medium">Polar Angle (θ)</span>
          <span className="font-mono font-bold text-[#4F46E5] text-xs">
            {isEntangled ? 'Undefined' : `${thetaDeg.toFixed(1)}° (${thetaRad.toFixed(2)} rad)`}
          </span>
          <span className="text-[10px] text-[#4A5168] block mt-0.5">
            P(|0⟩) = {(prob0 * 100).toFixed(1)}%
          </span>
        </div>

        {/* Relative Phase (Phi) */}
        <div className="p-2 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
          <span className="text-[10px] text-[#4A5168] block uppercase font-medium">Phase (ϕ)</span>
          <span className="font-mono font-bold text-[#0E9F9B] text-xs">
            {isEntangled ? 'Undefined' : `${phiDeg.toFixed(1)}° (${phiRad.toFixed(2)} rad)`}
          </span>
          <span className="text-[10px] text-[#4A5168] block mt-0.5">
            Equator Angle
          </span>
        </div>

        {/* Cartesian Coordinates (X, Y, Z) */}
        <div className="p-2 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
          <span className="text-[10px] text-[#4A5168] block uppercase font-medium">Coordinates (x, y, z)</span>
          <span className="font-mono font-bold text-[#1F2433] text-xs">
            {isEntangled ? '(0, 0, 0)' : `(${vx.toFixed(2)}, ${vy.toFixed(2)}, ${vz.toFixed(2)})`}
          </span>
          <span className="text-[10px] text-[#4A5168] block mt-0.5">
            Radius |r| = {r.toFixed(3)}
          </span>
        </div>

        {/* Purity & State Class */}
        <div className="p-2 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1]">
          <span className="text-[10px] text-[#4A5168] block uppercase font-medium">Density Purity (γ)</span>
          <span className="font-mono font-bold text-[#16A34A] text-xs">
            {purity !== undefined ? purity.toFixed(4) : (isEntangled ? '0.5000' : '1.0000')}
          </span>
          <span className="text-[10px] text-[#4A5168] block mt-0.5">
            {isEntangled ? 'Mixed density matrix' : 'Pure quantum state'}
          </span>
        </div>
      </div>

      {/* Entanglement Physical Note if applicable */}
      {isEntangled && (
        <div className="px-4 py-2.5 bg-[#FFF4DB] border-t border-[#D97706]/20 text-[11px] text-[#B45309] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
          <p className="leading-relaxed">
            <strong>Entangled State Insight:</strong> Because this qubit is entangled with another qubit wire, its reduced density matrix has purity &lt; 1.0 (mixed state). Individual pure states do not exist on the surface of the sphere; the state vector collapses inside to radius |r| &lt; 1.0.
          </p>
        </div>
      )}
    </div>
  );
}
