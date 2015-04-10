#/usr/bin/bash

if [ ! -d "release" ]; then
    mkdir release
fi

#increment build number
bldnum=`cat src/build_number.js | tr -cd '[:digit:]'`
bldnum=$((bldnum+1))
echo build number $bldnum
echo // this file is created by the build script > src/build_number.js
echo var BUILD_NUMBER=$bldnum\; >> src/build_number.js

jslist="
src/jquery.cookie.js
src/browserDetect.js
src/webgl-utils.js
src/glMatrix-0.9.4.min.js
src/pUtils.js
src/transform.js
src/shaders.js
src/player.js
src/userInput.js
src/geomProcess.js
src/aiControl.js
src/sfx.js
src/viewPoint.js
src/widgets2d.js
src/screens2d.js
src/build_number.js
src/gameControl.js
src/loadManager.js
src/main.js"

minjsout=release/cycleblob.min.js

cnt=`cat $jslist | wc -l -c`
acnt=($cnt)
echo original:
echo ${acnt[0]} lines, ${acnt[1]} bytes

#./node_modules/uglify-js/bin/uglifyjs --help
./node_modules/uglify-js/bin/uglifyjs $jslist -mt -nc --max-line-len 600 --reserved-names webGLStart -o $minjsout

cnt=`cat $minjsout | wc -l -c`
acnt=($cnt)
echo minified:
echo ${acnt[0]} lines, ${acnt[1]} bytes

cp ./release.html release/index.html
cp ./src/jquery-1.4.4.min.js release/

reclist="
img/title_text9.svg
img/speaker_on.svg
img/speaker_off.svg
img/icon_Refresh.png
img/icon_Playb.png
img/icon_Desktop.png
img/icon_Forward.png
img/instructions3.svgz
img/instructions_header.png
img/rep_image.png
img/.htaccess
sound/turn5.ogg
sound/turn5.mp3
sound/powerup2.ogg
sound/powerup2.mp3
sound/crash2.ogg
sound/crash2.mp3
sound/coin_up3.ogg
sound/coin_up3.mp3
./shaders.html
./about.php
./contact.php
./page.css
./.htaccess
"

cp --parents $reclist release/




# count all identifiers:
# cat release/cycleblob.min.js | tr -c '[:alnum:]' '\n' | sort | uniq -c | sort -r > _count1.txt
# gzip -c -9 work/models/cube5quads.json > work/models/cube5quads.json.gz
# cd /cygdrive/c/webgl
