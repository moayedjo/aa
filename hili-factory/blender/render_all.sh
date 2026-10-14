#!/bin/bash
# renders every still (Cycles CPU).  GPU: set SAMPLES higher / use cycles device OPTIX in render_site.py.
PY=${PY:-python3}
cd "$(dirname "$0")"; mkdir -p renders
declare -A EXP=( [aerial]=-2.8 [hall]=-3.2 [closeup]=-2.7 [helipad]=-2.7 [hero]=-2.7 [warehouse]=-2.5 [road]=-2.6 [trucks]=-2.6 [people]=-2.6 [cars]=-2.6 [racks]=-2.4 )
for sh in ${SHOTS:-aerial hall closeup helipad hero warehouse road trucks people cars racks}; do
  EXPOSURE=${EXP[$sh]} $PY render_site.py -- $sh ${SAMPLES:-64} 1920x1080 renders/$sh.png
done
[ -n "$SHOTS" ] || EXPOSURE=-0.9 $PY render_site.py -- hero ${SAMPLES:-64} 1920x1080 renders/hero_night.png night
