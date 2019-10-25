####
# DIGITALE SAFARI
# this programm was used to extract all images of the digitized zoological
# collection provided by FAU Library Erlangen-Nuremberg
# "shears" and "pillow" have to be installed to use it
####

import shears
import os
from PIL import Image

#dictionary for all images
images = dict()

#load path to all digitized pages in dictionary
for r,d,f in os.walk('source/'):
    for file in f:
        images[file] = os.path.join(r, file)

# cut all pages to avoid problems with the dark corners
for k,v in images.items():
    #cut corners
    imageCrop = Image.open(images[k]) #open image
    width, height = imageCrop.size #get original size
    left = width/10 #get 1/10 of original size on each side
    right = 9 * width/10
    top = height/10
    bottom = 9 * height/10
    imageCropped = imageCrop.crop((left, top, right, bottom)) #and cut 1/10 on each side
    imageCropped.save(images[k]) #save altered image

#analyze all pages for images with "shears" by Yale DH Lab
for k,v in images.items():
    #open (altered) page
    print(images[k])
    #extract found images
    try:
        result = shears.clip(images[k],
                            filter_min_size=900,
                            filter_threshold=0.7,
                            filter_connectivity=1)
    #jump over errors (thrown by empty or colorless pages)
    except:
        continue
    #save each image
    shears.save_image(result, ('./results/' + str(k)))

#filter images (delete the ones that are much higher than wide, these are usually the book sides)
for r,d,f in os.walk('./results/'):
    for file in f:
        imageDelete = Image.open(r + file) #open image
        width, height = imageDelete.size #get original size
        if ( height > width * 5 ):
            os.remove(r + file) #remove file if unusual height
