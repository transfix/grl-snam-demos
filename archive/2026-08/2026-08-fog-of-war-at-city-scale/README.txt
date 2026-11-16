GRL-SNAM — fog of war at the scale of a real city
=================================================
Open index.html in a browser (the mp4s play inline). Zip this whole folder to share.

  finale_rendezvous.mp4  ~36 s  — EIGHT VEHICLES, ONE RENDEZVOUS. They enter blind from the
                                  west edge of a real Austin tile and converge on a staging
                                  line in the east, each crossing roughly a kilometre of city
                                  on a map it is building as it drives. All eight arrive.
  convoy.mp4             ~24 s  — A CONVOY NOBODY TOLD THE FORMATION. Only the leader has a
                                  destination; every vehicle behind is chasing the one in
                                  front. Its target is reacting to a world it is still
                                  discovering, so no path could have been scripted — and the
                                  target is a peer, so it has to be SEEN, not announced. The
                                  clip ends when the leader parks: everything after that is
                                  followers milling around a stationary target.
  pursuit_v2.mp4         ~36 s  — A PURSUIT WHERE THE QUARRY IS A VEHICLE. Two runners flee on
                                  crossing lines, three hunters each, the quarry a quarter
                                  faster than its pursuers. Because the runners plan and route
                                  like everyone else, nothing walks through a building, and
                                  because the escape lines cross, the two packs must thread
                                  through one another. Every hunter closes from about 900 m to
                                  under 10.5 m.

WHAT IS ACTUALLY BEING SHOWN

Each vehicle plans against its OWN belief map, which is allowed to disagree with the world.
The only channel between belief and truth is a ray-cast sensor with occlusion. Nothing is
shared between agents except the ground they are standing on — and each other: a vehicle
occludes, and has to be discovered, exactly like a wall.

Three things are drawn that the earlier 3-D clips could not show:

  * FIELD OF VIEW. The ground carries the recorded sensor coverage as a texture — never
    seen, remembered, visible right now. It is the true ray-cast set, ragged occlusion
    shadows and all, not an approximating disc.

  * WALLS. A building face is lit only if a ray actually reached THAT FACE. Drive past a
    tower and its lower storeys light up while its roof and far side stay dark. This is a
    post-pass that ray-casts the real 978,242-face city mesh from the recorded positions.
    It is a rendering input, NOT something the agents knew: the planner's own sensor is a
    2-D cast over an occupancy raster and carries no height at all.

  * PATHS. Each vehicle's driven path in its own colour. The PLANNED route appears only in
    the overhead inset, and that is deliberate. The planner string-pulls its route through
    BELIEVED free space, so early in a run the committed route is a single straight segment
    over a kilometre long — correct, because it has not looked yet and genuinely believes
    that line is clear. On a map that reads as intent; drawn over real buildings it reads as
    a rendering bug. It is shown where it tells the truth and omitted where it would mislead.

MEASURED

Numbers on the page are generated from the recorded trace manifests at build time, not
transcribed. Collisions are scored against TRUTH, not belief — hitting something you did not
know about still counts. The convoy's contact count is not zero, and that is a result rather
than a defect: followers closing on the vehicle they are chasing do touch it, and until this
release such a contact could not be counted at all, because peers were being erased from the
grid that penetration is scored against.

RUN IT YOURSELF (public GRL-SNAM repo)

`pip install` on its own is NOT enough. The renderer binding pycvc_gl is a cvcpkg package and
is not on PyPI, so the dependency closure comes from the per-interpreter recipe in the repo.
This mirrors what CI does.

  cvcpkg install cvc/grl-snam-cp311 --prefix ./deps
  source ./deps/bin/activate

  grl-snam fog all -o fog/            # the three synthetic stories

The package carries the CLI and its whole compiled closure (pycvc_gl, VTK, libcvc), so there
is no checkout to make and nothing to pip-install. The prefix activates like a venv.

The `finale` command that produced the city-scale clips is NEWER than the published
grl-snam-cp311 0.1.0+cvc.1. Until that is republished, run it from a checkout on top of the
same activated prefix:

  pip install -e . --no-deps          # --no-deps: the closure is already there
  grl-snam finale BUNDLE -o finale/

Use the -cp312 / -cp313 recipe and the matching python3.1x for those interpreters.

BUNDLE is a scene bundle directory (terrain + buildings). It is a required argument with no
default: the geometry is not carried in the repository.

The simulation runs exactly once, in `record`. Every video, every live window and every
number quoted replays that measured trace and recomputes nothing — which is why the film
cannot disagree with the run it claims to show.
