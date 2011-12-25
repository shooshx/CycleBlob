#/usr/bin/bash

bldnum=`cat work/build_number.js | tr -cd '[:digit:]'`
bldnum=$((bldnum+1))
echo build number $bldnum
echo // this file is created by the build script > work/build_number.js
echo var BUILD_NUMBER=$bldnum\; >> work/build_number.js