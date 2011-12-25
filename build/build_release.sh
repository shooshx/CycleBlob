#/usr/bin/bash

if [ ! -d "release" ]; then
    mkdir release
fi

#increment build number
bldnum=`cat work/build_number.js | tr -cd '[:digit:]'`
bldnum=$((bldnum+1))
echo build number $bldnum
echo // this file is created by the build script > work/build_number.js
echo var BUILD_NUMBER=$bldnum\; >> work/build_number.js

jslist="
work/jquery.cookie.js
work/browserDetect.js
work/webgl-utils.js
work/glMatrix-0.9.4.min.js
work/pUtils.js
work/transform.js
work/shaders.js
work/player.js
work/userInput.js
work/geomProcess.js
work/aiControl.js
work/sfx.js
work/viewPoint.js
work/screens2d.js
work/build_number.js
work/gameControl.js
work/loadManager.js
work/main.js"

minjsout=release/cycleblob.min.js

cnt=`cat $jslist | wc -l -c`
acnt=($cnt)
echo original:
echo ${acnt[0]} lines, ${acnt[1]} bytes

cat $jslist | ./minify/UglifyJS/bin/uglifyjs -mt -nc --max-line-len 600 --reserved-names webGLStart -o $minjsout

cnt=`cat $minjsout | wc -l -c`
acnt=($cnt)
echo minified:
echo ${acnt[0]} lines, ${acnt[1]} bytes

cp work/release.html release/index.html
cp work/shaders.html release/
cp work/about.php release/
cp work/contact.php release/

# count all identifiers:
# cat release/cycleblob.min.js | tr -c '[:alnum:]' '\n' | sort | uniq -c | sort -r > _count1.txt
# gzip -c -9 work/models/cube5quads.json > work/models/cube5quads.json.gz
# cd /cygdrive/c/webgl
