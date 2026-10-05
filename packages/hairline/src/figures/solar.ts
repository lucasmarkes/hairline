import { Cam, circ, clamp, facing, fit, hull, lerp, poly, prism, proj, rings, rrect, seg, unproj, type Ring, type Vec2, type Vec3 } from "../core/iso";
import { spring, stepS, type Spring } from "../core/motion";
import { disposer, mk, pointer, put, register, solid, type FigureMount, type Solid } from "../core/stage";

/**
 * Solar: a small solar field, twelve panels on poles over a rounded pad. Each
 * panel is a thin framed plate with its cells ruled on its face, and turns on
 * its pole to face the light. The pointer is the sun, held a little above the
 * panels: the panels near it turn to face it, the farther ones less, and those
 * out of reach go back to the morning sun they face at rest. The panel under
 * the pointer takes the bright edge. The slider is the reach, in panels.
 *
 * The pattern: a continuous aim over a field of parts. Two springs per panel
 * (its tilt along x and along y), a falloff by distance with a floor, a clamped
 * tilt, and a hit test on the plane of the fixed pivots.
 */

const NX = 4, NY = 3, SX = 34, SY = 28, A = 13.5, B = 10, T = 1.6, PH = 13, PB = 5, M = 7;
const W = NX * SX, D = NY * SY, HS = 26;
/** The steepest a panel tilts: past about 30° one leaning away from the camera would show its underside. */
const TMAX = Math.tan((27 * Math.PI) / 180);
const SUN0: Vec3 = [W + 8, D * 0.4, PH + 26], LIT0: Vec2 = [3, 1];

/** The share of the sun's pull a panel takes, u panels from the pointer: all of it near, down to a floor at R. */
const falloff = (u: number, R: number) => clamp(1 - (u / R) ** 2 * 0.85, 0.15, 1);

/** The tilt that faces a panel at (x, y) toward the sun s, as the normal's slope [gx, gy], clamped. */
function aim(x: number, y: number, s: Vec3): Vec2 {
  const dz = Math.max(s[2] - PH, 1), gx = (s[0] - x) / dz, gy = (s[1] - y) / dz, g = Math.hypot(gx, gy);
  return g > TMAX ? [(gx / g) * TMAX, (gy / g) * TMAX] : [gx, gy];
}

type Panel = { i: number; j: number; x: number; y: number; g0: Vec2; sx: Spring; sy: Spring; el: Solid; dx: number; dy: number };

export const mount: FigureMount = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-M, -M, -PB], [W + M, D + M, -PB], [W + M, -M, -PB], [-M, D + M, -PB], [0, 0, PH + 8], [W, D, PH + 8]], 200, 172);
  const P = proj(C), front = facing(C);
  let R = value, over: Vec2 | null = null, lit: Panel | null = null;

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-M, -M, W + M, D + M, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const plate = rrect(-A, -B, A, B, 2.2, 4), inner = rrect(-A + 1.3, -B + 1.3, A - 1.3, B - 1.3, 1, 3);
  const panels: Panel[] = [];
  // Back to front by x + y, pole before plate, so a nearer panel covers a farther one.
  for (let s = 0; s <= NX + NY - 2; s++) for (let i = 0; i < NX; i++) {
    const j = s - i;
    if (j < 0 || j >= NY) continue;
    const x = (i + 0.5) * SX, y = (j + 0.5) * SY;
    const shift = (ring: Ring): Ring => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));
    put(solid(g), prism(P, front, shift(circ(1.7, 12)), shift(circ(0.8, 12)), 0, PH - 1));
    const g0 = aim(x, y, SUN0);
    panels.push({ i, j, x, y, g0, sx: spring(g0[0], { eps: 0.002 }), sy: spring(g0[1], { eps: 0.002 }), el: solid(g), dx: NaN, dy: NaN });
  }
  const at = (i: number, j: number) => panels.find((p) => p.i === i && p.j === j)!;

  /** The plate tilted to the slope [gx, gy]: its outline is the hull of both faces, its crease the frame and the cells on its upper face. */
  function drawPanel(p: Panel) {
    const gx = p.sx.x, gy = p.sy.x;
    if (gx === p.dx && gy === p.dy) return;
    p.dx = gx; p.dy = gy;
    const nl = Math.hypot(gx, gy, 1), n: Vec3 = [gx / nl, gy / nl, 1 / nl];
    const e1l = Math.hypot(1 - n[0] * n[0], n[0] * n[1], n[0] * n[2]);
    const e1: Vec3 = [(1 - n[0] * n[0]) / e1l, -n[0] * n[1] / e1l, -n[0] * n[2] / e1l];
    const e2: Vec3 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
    const w = (u: number, v: number, h: number) => P(p.x + u * e1[0] + v * e2[0] + h * n[0], p.y + u * e1[1] + v * e2[1] + h * n[1], PH + u * e1[2] + v * e2[2] + h * n[2]);
    const face = (ring: Ring, h: number) => ring.map((q) => w(q.u, q.v, h));
    const ci = B - 1.3, cu = (A - 1.3) / 3;
    put(p.el, {
      sil: poly(hull(face(plate, T / 2).concat(face(plate, -T / 2)))),
      crease: poly(face(inner, T / 2)) +
        seg(w(-cu, -ci, T / 2), w(-cu, ci, T / 2)) + seg(w(cu, -ci, T / 2), w(cu, ci, T / 2)) +
        seg(w(-3 * cu, 0, T / 2), w(3 * cu, 0, T / 2)),
    });
  }
  function light(p: Panel) {
    if (p === lit) return;
    lit?.el.sil.classList.remove("hi");
    lit = p;
    p.el.sil.classList.add("hi");
  }

  const L = register(stage, (dt) => {
    let m = false;
    for (const p of panels) { if (stepS(p.sx, dt)) m = true; if (stepS(p.sy, dt)) m = true; drawPanel(p); }
    return m;
  });
  bag.add(L.unregister);

  function retarget() {
    if (!over) {
      for (const p of panels) { p.sx.t = p.g0[0]; p.sy.t = p.g0[1]; }
      light(at(LIT0[0], LIT0[1]));
      read.textContent = "rest";
    } else {
      const sun: Vec3 = [over[0], over[1], PH + HS];
      for (const p of panels) {
        const t = aim(p.x, p.y, sun), u = Math.hypot((p.x - over[0]) / SX, (p.y - over[1]) / SY), f = falloff(u, R);
        p.sx.t = lerp(p.g0[0], t[0], f); p.sy.t = lerp(p.g0[1], t[1], f);
      }
      const i = clamp(Math.floor(over[0] / SX), 0, NX - 1), j = clamp(Math.floor(over[1] / SY), 0, NY - 1);
      light(at(i, j));
      read.textContent = `panel ${i + 1}·${j + 1}`;
    }
    L.wake();
  }
  light(at(LIT0[0], LIT0[1]));

  bag.add(pointer(stage, {
    // The pivots never move, so the pointer is read on their plane.
    move: (q) => { over = unproj(C, q[0], q[1], PH); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
};
