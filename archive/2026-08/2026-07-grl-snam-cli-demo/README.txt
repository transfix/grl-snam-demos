GRL-SNAM — learned navigation on real Austin (VolRover3), via the grl-snam CLI
=============================================================================
Open index.html in a browser (the two mp4s play inline). Zip this whole folder to share.

  austin_single_drive.mp4         ~6 s   — START HERE. One clean A->B run, 0 building
                                  penetration; a short lead-up to the long drive.
  austin_multigoal_freedrive.mp4  ~3 min — the long dynamic free-drive with a LIVE HUD:
                                  the goal is re-targeted through 4 corner spires, and every
                                  frame overlays the network's own outputs (coefficients
                                  alpha/beta/gamma, wall clearance, drive mode, penetration).
                                  Drone chase cam, ~0 building hits.

Both are real 3-D renders (VTK offscreen, the same engine cvcGL/VolRover3 use) of the
trained SDF policy driving; geometry (c) OpenStreetMap (ODbL) + SRTM terrain.

Run it yourself (also in index.html section 03) — one CLI, one command:
  cvcpkg install cvc/grl-snam-cp311 --prefix ./deps
  source ./deps/bin/activate
  grl-snam pipeline <world_model>          # terrain.json + buildings.glb -> SDF -> train -> HUD video
  grl-snam demo austin-freedrive --bundle <world_model> --checkpoint coef_sdf.pt   # live in VolRover3

The long drive above is exactly what `grl-snam pipeline` produces. Full reference: the
GRL-SNAM README (CLI section) + docs/training-navigation-on-geometry.md.
