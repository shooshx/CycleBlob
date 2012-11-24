import re
import os
from StringIO import StringIO
import subprocess
import tempfile

def incBuildNum():
    with open('src/build_number.js', 'r') as f: 
        c = f.read()
    m = re.search('[0-9]+', c)
    assert m is not None
    num = int(m.group(0))
    num = num + 1
    with open('src/build_number.js', 'w') as f:
        f.write(' // this file is created by the build script\nvar BUILD_NUMBER=%d' % num)
    return num
                
def fileStat(filename):
    return (sum(1 for line in open(filename)), os.stat(filename).st_size)
    
def fileListStat(buf):
    return (sum(1 for line in StringIO(buf)), len(buf))    

                

jslist=[
'src/pack_header.js',
'src/jquery.cookie.js',
'src/browserDetect.js',
'src/webgl-utils.js',
'src/glMatrix-0.9.4.min.js',
'src/pUtils.js',
'src/transform.js',
'src/shaders.js',
'src/player.js',
'src/userInput.js',
'src/geomProcess.js',
'src/aiControl.js',
'src/sfx.js',
'src/viewPoint.js',
'src/screens2d.js',
'src/build_number.js',
'src/gameControl.js',
'src/loadManager.js',
'src/main.js',
'src/pack_footer.js',
]

minjsout='../release/cycleblob.min.js'

    
def main():
    num = incBuildNum()
    print 'build number', num
    alljs = ''.join(open(name).read() for name in jslist)
    
    print 'before: %d lines, %d bytes' % fileListStat(alljs)
    
    with tempfile.TemporaryFile('w+') as tmp:
        tmp.file.write(alljs)
        tmp.file.flush()
        p = subprocess.call(['node_modules\.bin\uglifyjs.cmd', tmp.name] + '-m -c -b beautify=false,max-line-len=600 -r "cb" -o'.split() + [minjsout]  ) # --wrap cb
    
    print 'after: %d lines, %d bytes' % fileStat(minjsout)


if __name__ == '__main__':
    main()