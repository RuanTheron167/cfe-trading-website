import * as THREE from "three";

/*
 * Hero globe — Three.js enhancement layer.
 *
 * Fails closed: if WebGL isn't available, the visitor has reduced-motion
 * enabled, or anything below throws, the existing SVG route graphic
 * (#routeSvg) is left exactly as-is and this file does nothing further.
 * This module never assumes GSAP/Lenis are present — it is independent.
 */
(function init(){
  "use strict";

  var mount = document.getElementById("globeMount");
  var svg = document.getElementById("routeSvg");
  var heroSection = document.querySelector(".hero");
  if (!mount || !svg || !heroSection) return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  var isSimplified = window.matchMedia("(max-width: 980px)").matches;
  var isVeryLowEnd =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (isVeryLowEnd) return; // leave the SVG fallback for constrained devices

  var supportsWebGL = (function(){
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  })();
  if (!supportsWebGL) return;

  var GOLD = "#d9a441";
  var TEAL = "#2fb8a6";
  var GOLD_2 = "#f0c674";

  // Representative sourcing/port coordinates (Pearl River Delta, Durban).
  var CHINA_LATLON = { lat: 23.0, lon: 113.3 };
  var SA_LATLON = { lat: -29.85, lon: 31.02 };
  var RADIUS = 1.3;

  function latLonToXYZ(lat, lon, radius){
    var phi = (90 - lat) * (Math.PI / 180);
    var theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function buildDotSphere(radius, steps){
    var positions = [];
    for (var i = 0; i <= steps; i++){
      var lat = -90 + (180 * i) / steps;
      var lonCount = Math.max(6, Math.round(steps * 2 * Math.cos((lat * Math.PI) / 180)));
      for (var j = 0; j < lonCount; j++){
        var lon = (360 * j) / lonCount;
        var v = latLonToXYZ(lat, lon, radius);
        positions.push(v.x, v.y, v.z);
      }
    }
    return new Float32Array(positions);
  }

  function makeGlowTexture(){
    var size = 128;
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext("2d");
    var grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(217,164,65,0.45)");
    grad.addColorStop(0.5, "rgba(217,164,65,0.12)");
    grad.addColorStop(1, "rgba(217,164,65,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  function buildArc(start, end, radius){
    var mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.45);
    var curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    var tubularSegments = 48;
    var radialSegments = 6;
    var geometry = new THREE.TubeGeometry(curve, tubularSegments, 0.022, radialSegments, false);
    var colorStart = new THREE.Color(GOLD);
    var colorEnd = new THREE.Color(TEAL);
    var posAttr = geometry.attributes.position;
    var ringVertCount = radialSegments + 1;
    var colors = new Float32Array(posAttr.count * 3);
    for (var i = 0; i < posAttr.count; i++){
      var ring = Math.floor(i / ringVertCount);
      var t = Math.min(1, ring / tubularSegments);
      var c = colorStart.clone().lerp(colorEnd, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    var material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    return { mesh: new THREE.Mesh(geometry, material), curve: curve };
  }

  function makeMarkerMesh(color){
    var geom = new THREE.SphereGeometry(0.055, 16, 16);
    var mat = new THREE.MeshBasicMaterial({ color: color });
    return new THREE.Mesh(geom, mat);
  }

  function createOverlayMarker(container, opts){
    var el = document.createElement("div");
    el.className = "globe-marker";
    el.style.color = opts.color;

    var point = document.createElement("div");
    point.className = "globe-marker-point";
    var dot = document.createElement("div");
    dot.className = "globe-marker-dot";
    dot.style.background = opts.color;
    var ring = document.createElement("div");
    ring.className = "globe-marker-ring";
    point.appendChild(dot);
    point.appendChild(ring);

    var label = document.createElement("span");
    label.className = "globe-marker-label";
    label.textContent = opts.label;

    var flagSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    flagSvg.setAttribute("class", "flag-icon globe-marker-flag");
    flagSvg.setAttribute("viewBox", "0 0 640 480");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + opts.flagId);
    flagSvg.appendChild(use);

    el.appendChild(point);
    el.appendChild(label);
    el.appendChild(flagSvg);
    container.appendChild(el);
    return el;
  }

  // ---- Scene setup ----
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  var canvas = document.createElement("canvas");
  mount.appendChild(canvas);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (e) {
    return; // leave SVG fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSimplified ? 1.5 : 2));

  var globeGroup = new THREE.Group();
  scene.add(globeGroup);

  var glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, depthWrite: false, depthTest: false }));
  glowSprite.scale.set(4.2, 4.2, 1);
  glowSprite.renderOrder = -1;
  scene.add(glowSprite);

  var dotSteps = isSimplified ? 14 : 22;
  var dotsGeom = new THREE.BufferGeometry();
  dotsGeom.setAttribute("position", new THREE.BufferAttribute(buildDotSphere(RADIUS, dotSteps), 3));
  var dotsMat = new THREE.PointsMaterial({ color: 0x5c6577, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
  var dots = new THREE.Points(dotsGeom, dotsMat);
  globeGroup.add(dots);

  var chinaPos = latLonToXYZ(CHINA_LATLON.lat, CHINA_LATLON.lon, RADIUS);
  var saPos = latLonToXYZ(SA_LATLON.lat, SA_LATLON.lon, RADIUS);

  // Orient the globe so the China<->SA route faces the camera by default,
  // rather than landing wherever the raw lat/long math happens to put it.
  var avgDir = chinaPos.clone().normalize().add(saPos.clone().normalize());
  if (avgDir.lengthSq() < 1e-6) avgDir.set(0, 0, 1);
  avgDir.normalize();
  var baseYaw = -Math.atan2(avgDir.x, avgDir.z);
  globeGroup.rotation.y = baseYaw;

  var arc = buildArc(chinaPos, saPos, RADIUS);
  globeGroup.add(arc.mesh);

  var chinaMarker = makeMarkerMesh(GOLD);
  chinaMarker.position.copy(chinaPos);
  globeGroup.add(chinaMarker);

  var saMarker = makeMarkerMesh(TEAL);
  saMarker.position.copy(saPos);
  globeGroup.add(saMarker);

  var packet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: GOLD_2 }));
  globeGroup.add(packet);

  // ---- DOM overlay ----
  var overlay = document.createElement("div");
  overlay.className = "globe-overlay";
  mount.appendChild(overlay);

  var chinaLabelEl = createOverlayMarker(overlay, { label: "CHINA", flagId: "flag-cn", color: GOLD });
  var saLabelEl = createOverlayMarker(overlay, { label: "SOUTH AFRICA", flagId: "flag-za", color: TEAL });

  var vec = new THREE.Vector3();
  var camWorldPos = new THREE.Vector3();
  function projectMarker(localPos, el){
    vec.copy(localPos).applyMatrix4(globeGroup.matrixWorld);
    var worldNormal = vec.clone().normalize();
    camera.getWorldPosition(camWorldPos);
    var toCam = camWorldPos.clone().sub(vec).normalize();
    var facing = worldNormal.dot(toCam);

    var projected = vec.clone().project(camera);
    var rect = mount.clientWidth && mount.clientHeight ? mount : null;
    var w = rect ? rect.clientWidth : 1;
    var h = rect ? rect.clientHeight : 1;
    var x = (projected.x * 0.5 + 0.5) * w;
    var y = (-projected.y * 0.5 + 0.5) * h;

    el.style.transform = "translate(" + x + "px," + y + "px) translate(-50%,-50%)";
    el.style.opacity = String(Math.max(0, Math.min(1, (facing - 0.02) / 0.4)));
  }

  // ---- Sizing ----
  function resize(){
    var w = mount.clientWidth || 1;
    var h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  var ro = null;
  if ("ResizeObserver" in window){
    ro = new ResizeObserver(resize);
    ro.observe(mount);
  } else {
    window.addEventListener("resize", resize);
  }

  // ---- Scroll-linked subtle tilt (independent of any GSAP layer) ----
  var extraTiltX = 0;
  if (!isSimplified){
    var updateTilt = function(){
      var rect = heroSection.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = rect.height + vh;
      var passed = vh - rect.top;
      var progress = Math.max(0, Math.min(1, passed / total));
      extraTiltX = (progress - 0.5) * 0.16;
    };
    updateTilt();
    window.addEventListener("scroll", updateTilt, { passive: true });
    window.addEventListener("resize", updateTilt);
  }

  // ---- Render loop, paused off-screen / tab-hidden ----
  var running = false;
  var rafId = null;
  var clock = new THREE.Clock();
  var packetDuration = 4.5;
  var autoSpeed = (2 * Math.PI) / 150; // one full rotation ~150s — very slow

  function tick(){
    rafId = requestAnimationFrame(tick);
    var delta = clock.getDelta();
    var elapsed = clock.getElapsedTime();

    globeGroup.rotation.y += autoSpeed * delta;
    globeGroup.rotation.x = 0.15 + extraTiltX;

    var t = (elapsed % packetDuration) / packetDuration;
    arc.curve.getPointAt(t, packet.position);

    globeGroup.updateMatrixWorld();
    projectMarker(chinaPos, chinaLabelEl);
    projectMarker(saPos, saLabelEl);

    renderer.render(scene, camera);
  }

  function start(){
    if (running) return;
    running = true;
    clock.start();
    tick();
  }
  function stop(){
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  document.addEventListener("visibilitychange", function(){
    if (document.hidden) stop(); else if (mount.classList.contains("is-active")) start();
  });

  if ("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.05 });
    io.observe(heroSection);
  } else {
    start();
  }

  canvas.addEventListener("webglcontextlost", function(e){
    e.preventDefault();
    stop();
    mount.classList.remove("is-active");
    svg.classList.remove("is-hidden");
  });

  // Everything above succeeded — activate the 3D layer over the SVG fallback.
  mount.classList.add("is-active");
  svg.classList.add("is-hidden");
  start();
})();
