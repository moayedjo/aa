#!/bin/bash
# renders every still (Cycles CPU).  GPU: set SAMPLES higher / use cycles device OPTIX in render_site.py.
PY=${PY:-python3}
cd "$(dirname "$0")"; mkdir -p renders
for sh in aerial hall closeup helipad hero warehouse road trucks; do
  EXPOSURE=-2.7 $PY render_site.py -- $sh ${SAMPLES:-64} 1920x1080 renders/$sh.png
done
EXPOSURE=-0.8 $PY render_site.py -- hero ${SAMPLES:-64} 1920x1080 renders/hero_night.png night
