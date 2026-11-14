GRL-SNAM — navigating on a map that is wrong (incomplete information + vehicle dynamics)
========================================================================================
Open index.html in a browser (the four mp4s play inline). Zip this whole folder to share.

  fog_demo.mp4     ~91 s  — START HERE. All three stories back to back.
  fog_ghost.mp4    ~31 s  — STALE MAP. The prior map has a wall reality no longer has. The
                            agent commits to the detour (37.8 m off the straight line), then
                            a ray crosses the spot, the ghost clears, and the route snaps
                            straight to the goal. The part of the wall never swept by the
                            sensor correctly stays in the map.
  fog_blocker.mp4  ~27 s  — NEW BLOCKER. Reality grows a wall across the route mid-drive.
                            Discovered on approach, not scripted. This is where the vehicle
                            model bites: a turning radius means the recovery is an arc, not
                            a reversed velocity vector. 0 steps inside the wall.
  fog_unit.mp4     ~33 s  — MOVING UNIT. Marked and avoided in a layer that EXPIRES, so the
                            track decays instead of smearing permanent ghosts along the
                            route. No marks left at the end.

All three reach the goal with ZERO collisions scored against ground truth (not against
belief — hitting a wall you did not know about still counts).

What is actually being shown: the agent plans against a BELIEF map that is allowed to
disagree with truth. The only channel between them is a ray-cast sensor with occlusion.
The obstacle-field rebuild and the route replan are the same event, so a discovery
immediately changes the plan.

Run it yourself (also in index.html section 07) — no world model, no checkpoint needed;
the stories build their own world:

  cvcpkg install cvc/grl-snam-cp311 --prefix ./deps
  source ./deps/bin/activate

  grl-snam fog all -o fog/   # record all three, render, concatenate

  # or one at a time - the trace is reusable (record once, replay often)
  grl-snam fog record  ghost              # -> traces/ghost/{trace.npz,trace.json}
  grl-snam fog capture ghost -o ghost.mp4
  grl-snam fog play    ghost --loop       # the same scene, in a window

The package carries the CLI and its whole compiled closure (pycvc_gl, VTK, libcvc), so there
is no checkout to make and nothing to pip-install. The prefix activates like a venv.

The simulation runs exactly once, in `record`. The video, the live window and every number
quoted here replay that measured trace and recompute nothing — which is why the film cannot
disagree with the run it claims to show. Rendered offscreen through cvcGL's scene renderer,
the same engine and the same scene builder the live window uses.
