#/usr/bin/bash

models="
cube5quads.json
triCorner4.json
triCornerOut4.json
plus4q.json
sofa4q.json
dbl_sofa_soft_4q.json
sofa4q_soft.json
distortDiamond5q.json
torus_100_50s.json
tetra1_4q.json
mobius_10r_3q.json" 

for m in $models
do
  gzip -c -9 work/models/$m > work/modelsz/$m""z
  echo compressed work/models/$m to work/modelsz/$m""z
done
