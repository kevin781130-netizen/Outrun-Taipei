# V92 — More inward correction, earned high speed

Active same-direction drift correction gains a 1.05 multiplier over V91. The
existing input/entry shaping, requested nose contribution (maximum 6%), raw-intent
release, countersteer, recovery, body yaw/slip and linked transfers stay intact.
The reference 180 km/h correction at 300 ms changes inward lateral speed from
0.194778 to 0.205380 (+5.44% net, because the unchanged outward road term is
subtracted afterward). V91's 8% wider roads and staggered traffic are retained.

A nitro charge now lasts 7 seconds and has no activation speed impulse. Inventory
remains two charges; holding N cannot spend the next charge, braking/reverse/crash
still cancel the active charge, pause freezes it, and drifting can still refill
stock while boosting. The established flash, sound and boost kick remain visual
feedback. Rule-bound HUD/menu/garage duration displays now show 7.0 seconds; the
current README controls are updated, with earlier version notes left historical.

Nitro supplies (300 - 200) / 7 = 14.285714 km/h per second while below 300. Above
200 km/h, all positive engine/nitro/moment/shift acceleration shares a rate cap:
14.285714 with nitro, 12 without. Below 200 the existing engine response remains,
plus the new sustained nitro thrust when active. Exact integration of a step
crossing 200 avoids a large-timestep bypass. Reverse retains its existing 45 km/h
limit and acceleration path. Normal 270 and nitro 300 caps are unchanged; no timer
forces a speed or resets speed to 200. Bends, braking, drift scrub and road contact
can lengthen the ramp. Natural overspeed decay after nitro remains unchanged.

Flat straight-road, held-throttle real-update tests from 200 km/h reach displayed
300 (>=299.5) at 6.9667 seconds at 30/60/120 Hz. Stacking exit boost, shift thrust
and draft cannot beat that budget. One three-second sample is below 245 km/h.
A 300 km/h crash retains the established 2.9-second interruption and 118 km/h
recovery launch. Even using retained nitro stock at the first opportunity, the
reference run needs 13.35 seconds from impact to displayed 300. At nine seconds,
the clean run is at 300, the crashed run at 237.37. This makes lost speed costly
without adding a separate penalty timer or raising crash duration.

Competitive records use namespace 92.0. New actual-update tests cover the ramp,
frame-rate parity, combined-thrust ceiling, threshold crossing, no activation jump,
held-button stock gating, brake/reverse/pause, crash/rebuild and mirrored old/new
drift corrections. A frozen V91 command fixture isolates the new lateral gain.
Existing nitro regression checks now assert the deliberate seven-second/no-impulse
contract instead of the superseded 2.8-second impulse. Full-source/record audits
are updated for the intentional change. GPU rendering/FPS and subjective driving
feel still require player review.
