import re
import os
from StringIO import StringIO
import subprocess
import tempfile
import time
import shutil


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

curdir = os.path.dirname(os.path.abspath(__file__))
    
    
jslist_bare=[
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
'src/widgets2d.js',
'src/screens2d.js',
'src/build_number.js',
'src/gameControl.js',
'src/loadManager.js',
'src/background.js',
'src/main.js',
] 

jslist=['src/pack_header.js'] + jslist_bare + ['src/pack_footer.js']

minjsout= 'cycleblob.min.js'

resources={
    '':    [
             'about.html',
             'src/jquery-1.4.4.min.js',
             'page.css',
             'shaders.html',
             'favicon.ico',
             'firefox_store_manifest.webapp',
    ],
    'img': [ 'icon_Desktop.png',
             'icon_Forward.png',
             'icon_Playb.png',
             'icon_Refresh.png',
             'instructions3.svgz',
             'instructions_header.png',
             'rep_image.png',
             'speaker_off.svg',
             'speaker_on.svg',
             'title_text9.svg',
             'rep_image_128.png',
             'm_cube.png',
             'm_dbl_sofa.png',
             'm_diamond.png',
             'm_inside_cube.png',
             'm_mobius.png',
             'm_plus.png',
             'm_sofa.png',
             'm_softsofa.png',
             'm_tetra.png',
             'm_torus.png',
             'm_triCorner.png',
             'tex2d.jpg',
    ],
    'sound':['coin_up3.mp3',
             'coin_up3.ogg',
             'crash2.mp3',
             'crash2.ogg',
             'powerup2.mp3',
             'powerup2.ogg',
             'turn5.mp3',
             'turn5.ogg',
    ],
    'modelsz': [
             'cube5quads.jsonz',
             'dbl_sofa_soft_4q.jsonz',
             'distortDiamond5q.jsonz',
             'mobius_10r_3q.jsonz',
             'plus4q.jsonz',
             'rot_dounut2.jsonz',
             'sofa4q.jsonz',
             'sofa4q_soft.jsonz',
             'tetra1_4q.jsonz',
             'torus_100_50s.jsonz',
             'triCorner4.jsonz',
             'triCornerOut4.jsonz',
    ],
    'models': ['bikePlayer2.json',
               'lifeWheel.json'
    ],
}

# node - https://nodejs.org/
# uglify2 - https://github.com/mishoo/UglifyJS2    

def run(cmd, shell=False):
    print "**", cmd
    subprocess.call(cmd, shell=shell)
    
def minWithUglify2(alljs, out):
    #with open('./tmp_%s.js' % time.time(), 'w') as tmp:
    with tempfile.TemporaryFile('w+') as tmp:  # '+' truncates
        f = tmp.file
        f.write(alljs)
        f.flush()
        run(['uglifyjs', tmp.name, '--screw-ie8', '-o', out, 
            '--mangle', 
            '--compress',
            '--beautify', 'beautify=false,max-line-len=600',
            '--reserved', 'cb'], shell=True)
        
    
    # --reserve-domprops
    
#def minWithUglify2(alljs):
#    with tempfile.TemporaryFile('w+') as tmp:
#        tmp.file.write(alljs)
#        tmp.file.flush()
#        p = subprocess.call(['uglifyjs', tmp.name] + '-m -c -b beautify=false,max-line-len=600 -r "cb" -o'.split() + [minjsout]  ) # --wrap cb

def minWithClosure(alljs):
    # NOT WORKING since it changes the names of fields from JSON
    #subprocess.call(['java', '-jar', '../minify/closure/compiler.jar', '--js_output_file', minjsout, '--compilation_level', 'ADVANCED_OPTIMIZATIONS'] \
    #               + sum((['--js',x] for x in jslist), []))

    name = './tmp_%s.js' % time.time()
    with open(name, 'w') as tmp:
        tmp.write(alljs)
    print 'tmp: ', name
    subprocess.call(['java', '-jar', '../minify/closure/compiler.jar', '--third_party', '--js_output_file', minjsout, \
                     '--compilation_level', 'ADVANCED_OPTIMIZATIONS', '--js', name, '--externs', '../minify/closure/jquery144_externs.js'])
    

def main():
    num = incBuildNum()
    print 'build number', num
    alljs = ''.join(open(name).read() for name in jslist)
    
    print 'before: %d lines, %d bytes' % fileListStat(alljs)
    
    rdir = os.path.join(curdir, 'release', 'release_%s' % num)
    os.makedirs(rdir)
    
    jsout = os.path.join(rdir, minjsout)
    minWithUglify2(alljs, jsout)

    print 'after: %d lines, %d bytes' % fileStat(jsout)
    
    for d,files in resources.iteritems():
        absd = os.path.join(rdir, d)
        if len(d) > 0:
            os.mkdir(absd)
        for f in files:
            shutil.copy( os.path.join(curdir, d, f), absd )
    shutil.copy( os.path.join(curdir, 'release.html'), os.path.join(rdir, 'index.html') )


if __name__ == '__main__':
    main()
