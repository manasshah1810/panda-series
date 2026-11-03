import sys, glob
from PIL import Image
out, cols, *files = sys.argv[1:]; cols=int(cols); ims=[Image.open(f).convert('RGB') for f in files]
w,h=640,int(640*ims[0].height/ims[0].width); rows=(len(ims)+cols-1)//cols; S=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): S.paste(im.resize((w,h)),((i%cols)*w,(i//cols)*h))
S.save(out)
