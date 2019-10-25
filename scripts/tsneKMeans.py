####
# DIGITALE SAFARI
# this script was used to transform the tsne script to a csv file that is
# suited to be used in kmeans.
####

import csv

#open original tsne csv file
with open("../vikus/data/tsne.csv","r") as source:
    reader = csv.reader(source)
    #write new csv file for kmeans
    with open("../kmeans/data/kmeansRaw.csv","w") as result:
        writer = csv.writer(result)
        writer.writerow(("id", "LON", "LAT"))
        #for every line in tsne file
        for r in reader:
            #jump over first line
            if (r[1] == "x"):
              continue
            else:
              writer.writerow((r[0], r[1], r[2]))
