// =============================================================
// cartx — Confetti Animation
// Supports: built-in canvas confetti OR custom Lottie animation.
// Lottie player loaded from CDN on-demand (zero cost if unused).
// =============================================================

// ── Built-in canvas confetti ─────────────────────────────────

var PARTICLE_COUNT = 80;
var DURATION = 2500;
var GRAVITY = 0.12;
var COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#20c997', '#f06595'];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle(canvasW, canvasH) {
  return {
    x: canvasW / 2 + rand(-canvasW * 0.3, canvasW * 0.3),
    y: canvasH * 0.3,
    vx: rand(-6, 6),
    vy: rand(-12, -4),
    size: rand(4, 8),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: rand(0, 360),
    rotationSpeed: rand(-8, 8),
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    opacity: 1,
    friction: rand(0.97, 0.99),
  };
}

function fireCanvasConfetti() {
  var drawer = document.querySelector('.cartmax-drawer');
  if (!drawer) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999';
  canvas.width = drawer.offsetWidth;
  canvas.height = drawer.offsetHeight;
  drawer.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var particles = [];
  for (var i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle(canvas.width, canvas.height));
  }

  var start = Date.now();

  function animate() {
    var elapsed = Date.now() - start;
    if (elapsed > DURATION) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var fadeStart = DURATION * 0.6;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.vy += GRAVITY;
      p.vx *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (elapsed > fadeStart) {
        p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (DURATION - fadeStart));
      }

      if (p.opacity <= 0) continue;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ── Lottie confetti ──────────────────────────────────────────

var _lottieLoaded = false;
var _lottieLoading = false;

function ensureLottiePlayer(callback) {
  if (_lottieLoaded) { callback(); return; }
  if (_lottieLoading) {
    // Wait for existing load
    var check = setInterval(function () {
      if (_lottieLoaded) { clearInterval(check); callback(); }
    }, 50);
    return;
  }
  _lottieLoading = true;
  var script = document.createElement('script');
  script.src = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
  script.type = 'module';
  script.onload = function () { _lottieLoaded = true; _lottieLoading = false; callback(); };
  script.onerror = function () { _lottieLoading = false; callback(); };
  document.head.appendChild(script);
}

function fireLottieConfetti(url) {
  var drawer = document.querySelector('.cartmax-drawer');
  if (!drawer) return;

  ensureLottiePlayer(function () {
    if (!customElements.get('dotlottie-player')) {
      // Player failed to load — fall back to canvas
      fireCanvasConfetti();
      return;
    }

    var player = document.createElement('dotlottie-player');
    player.setAttribute('src', url);
    player.setAttribute('autoplay', '');
    player.setAttribute('speed', '1');
    player.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;background:transparent';
    drawer.appendChild(player);

    player.addEventListener('complete', function () { player.remove(); });
    // Safety cleanup in case event doesn't fire
    setTimeout(function () { if (player.parentNode) player.remove(); }, 6000);
  });
}

// ── Preload Lottie player when URL is configured ─────────────

export function preloadLottie(url) {
  if (url && !_lottieLoaded && !_lottieLoading) {
    ensureLottiePlayer(function () {});
  }
}

// ── Public API ───────────────────────────────────────────────

var _lottieUrl = '';

export function setConfettiLottieUrl(url) {
  _lottieUrl = url || '';
  if (_lottieUrl) preloadLottie(_lottieUrl);
}

export function fireConfetti() {
  if (_lottieUrl) {
    fireLottieConfetti(_lottieUrl);
  } else {
    fireCanvasConfetti();
  }
}
