import { Cam, circ, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rrect, run, seg, type Ring, type Vec2, type Vec3 } from "../core/iso";
import { reducedMotion, spring, stepS } from "../core/motion";
import { disposer, mk, pointer, put, register, solid, type FigureMount } from "../core/stage";

/**
 * Turbine: a wind turbine on a round pad. A tapered tower with two flange
 * joints, a nacelle on top, a spinner, and three tapered blades turning in a
 * plane square to the wind. The rotor always turns: hovering never stops it,
 * it springs the clock's rate down to the slider's value, so a blade can be
 * followed round. The blade nearest the pointer takes the bright edge; at rest
 * one blade is bright, to be followed. The slider is the rate, × normal speed.
 *
 * The pattern: dilate time. An ambient clock on a spring, a choice made only
 * on input, never per frame, and a loop that sleeps under reduced motion.
 *
 * Ambient: the loop runs every frame while the stage is on screen (the stage
 * puts it to sleep offscreen). Under reduced motion the resting rate is 0, so
 * the rotor stands still until hovered, when it creeps at the slider's rate.
 */

const TH = 112, R0 = 4.6, R1 = 2.6, R = 60, NB = 3, OMEGA = (Math.PI * 2) / 5;
const AZ = rad(24), DW: Vec2 = [Math.cos(AZ), Math.sin(AZ)], PW: Vec2 = [-DW[1], DW[0]];
const HUB: Vec3 = [DW[0] * 15, DW[1] * 15, TH + 3.5];
const RS = [2.5, 6, 11, 20, 30, 40, 50, R - 3];

/** A ring drawn in the nacelle's own frame (a along the wind, b across it), turned into the world's. */
const turn = (ring: Ring): Ring => ring.map((q) => ({
  u: q.u * DW[0] + q.v * PW[0], v: q.u * DW[1] + q.v * PW[1],
  nu: q.nu * DW[0] + q.nv * PW[0], nv: q.nu * DW[1] + q.nv * PW[1],
}));

/** A point in the rotor's plane: a along the wind from the hub, x across, z up. */
const rp = (a: number, x: number, z: number): Vec3 => [HUB[0] + a * DW[0] + x * PW[0], HUB[1] + a * DW[1] + x * PW[1], HUB[2] + z];

/** The chord at r along a blade: it widens to a shoulder near the root, then tapers to the tip. */
const chord = (r: number) => (r < 11 ? 3.4 + (r / 11) * 3.4 : 6.8 - ((r - 11) / (R - 11)) * 5.6);

export const mount: FigureMount = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let slow = value, over = false, phase = 0.35;
  const rate = spring(1, { eps: 0.002 });

  const C = Cam(45, 0.5, 1.8);
  const pts: Vec3[] = [[-18, -18, -4], [18, 18, -4], [18, -18, -4], [-18, 18, -4]];
  for (let k = 0; k < 16; k++) pts.push(rp(0, R * Math.cos((k * Math.PI) / 8), R * Math.sin((k * Math.PI) / 8)));
  fit(C, pts, 200, 162);
  const P = proj(C), front = facing(C), Pv = (q: Vec3) => P(q[0], q[1], q[2]);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(18, 32), circ(16.4, 32), -4, 0));
  // The tower tapers, so its outline is the hull of its foot and its top; its flange joints are dim lines round its front.
  const rz = (z: number) => R0 + (R1 - R0) * (z / TH);
  put(solid(g), {
    sil: poly(hull(ringAt(P, circ(R0, 24), 0).concat(ringAt(P, circ(R1, 24), TH)))),
    crease: [0.38, 0.7].map((t) => open(ringAt(P, run(circ(rz(t * TH), 24), front), t * TH))).join(""),
  });
  // The nacelle: a rounded box along the wind, with its hatch seam along the roof.
  const nac = prism(P, front, turn(rrect(-13, -5, 12, 5, 3.5, 4)), turn(rrect(-11.8, -3.8, 10.8, 3.8, 2.3, 4)), TH - 2, TH + 8);
  put(solid(g), { sil: nac.sil, crease: nac.crease + seg(Pv(rp(-24, 0, 4.5)), Pv(rp(-7, 0, 4.5))) });

  // The blades, then the spinner over their roots.
  const blades = Array.from({ length: NB }, () => solid(g));
  const ringIn = (a: number, r: number) => Array.from({ length: 20 }, (_, k) => Pv(rp(a, r * Math.cos((k * Math.PI) / 10), r * Math.sin((k * Math.PI) / 10))));
  put(solid(g), { sil: poly(hull(ringIn(-1.5, 4.8).concat(ringIn(5.5, 1)))), crease: "" });

  /** Blade k's outline at the rotor's phase: the leading edge out, round the tip, the trailing edge back. */
  function bladePaths(k: number) {
    const th = phase + (k * Math.PI * 2) / NB, c = Math.cos(th), s = Math.sin(th);
    const at = (r: number, w: number) => Pv(rp(0.6, r * c - w * s, r * s + w * c));
    const le = RS.map((r) => at(r, chord(r) * 0.32)), te = RS.map((r) => at(r, -chord(r) * 0.68));
    return { sil: poly([...le, at(R - 0.6, 0.2), at(R, -0.5), at(R - 0.6, -1.1), ...te.reverse()]), crease: seg(at(9, 0), at(R * 0.82, 0)), mid: at(R * 0.6, 0) };
  }
  let lit = -1;
  function light(k: number) {
    if (k === lit) return;
    blades.forEach((b, j) => b.sil.classList.toggle("hi", j === k));
    lit = k;
  }

  let mids: Vec2[] = [];
  const B = register(stage, (dt) => {
    const m = stepS(rate, dt);
    if (!over) rate.t = reducedMotion() ? 0 : 1;
    phase += dt * rate.x * OMEGA;
    mids = blades.map((b, k) => { const p = bladePaths(k); put(b, p); return p.mid; });
    if (over) read.textContent = `blade ${lit + 1} · ${rate.x.toFixed(2)}×`;
    // Under reduced motion at rest the rotor stands still: sleep until input wakes it.
    if (reducedMotion() && !over && rate.x === 0) return m;
    return true;
  });
  bag.add(B.unregister);
  light(0);

  bag.add(pointer(stage, {
    // The blade is chosen when the pointer moves, never as the rotor turns under a still pointer.
    move: (q) => {
      over = true; rate.t = slow;
      const d = (p: Vec2) => Math.hypot(p[0] - q[0], p[1] - q[1]);
      let best = 0;
      mids.forEach((p, k) => { if (d(p) < d(mids[best])) best = k; });
      light(best);
      B.wake();
    },
    leave: () => { over = false; light(0); read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { slow = v; if (over) rate.t = v; B.wake(); },
    destroy: bag.dispose,
  };
};
