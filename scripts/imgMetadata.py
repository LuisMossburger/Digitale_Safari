####
# DIGITALE SAFARI
# this programm was used two times. Before and after using kmeans (the first time without clusterkeywords)
# "shears" and "pillow" have to be installed to use it
####

import os
import csv

#dictionary for keywords, manually determined after using kmeans & clusters.php
keywords = {
    'cluster1': 'Sammlung',
    'cluster2': 'Tafeln,Sammlung',
    'cluster3': 'Sammlung',
    'cluster4': 'Pflanzen,Insekten',
    'cluster5': 'Pflanzen,Spinnentiere',
    'cluster6': 'Amphibien,Pflanzen,Insekten',
    'cluster7': 'Skelette,Sezierte',
    'cluster8': 'Wassertiere,Sezierte',
    'cluster9': 'Pflanzen,Insekten',
    'cluster10': 'Wassertiere',
    'cluster11': 'Säugetiere',
    'cluster12': 'Pflanzen,Insekten',
    'cluster13': 'Pflanzen,Insekten',
    'cluster14': 'Pflanzen,Insekten,Schmetterlinge',
    'cluster15': 'Pflanzen,Insekten',
    'cluster16': 'Vögel',
    'cluster17': 'Sammlung,Vögel',
    'cluster18': 'Sammlung,Vögel',
    'cluster19': 'Säugetiere',
    'cluster20': 'Säugetiere,Reptilien',
    'cluster21': 'Skelette,Skelettpaare,Vögel',
    'cluster22': 'Skelette,Skelettpaare,Säugetiere',
    'cluster23': 'Abdrücke',
    'cluster24': 'Abdrücke',
    'cluster25': 'Tafeln,Fledermäuse'
}

#dictionary for years in which books were published (determined by BV number)
years = {
    'BV009519002': '1679',
    'BV009519003': '1683',
    'BV009186104': '1705',
    'BV009328391': '1756',
    'BV009328392': '1756',
    'BV042324426': '1756',
    'BV008972901': '1756',
    'BV008972922': '1756',
    'BV008944838': '1713',
    'BV008962194': '1676',
    'BV003132717': '1758',
    'BV042024113': '1750',
    'BV009474290': '1766',
    'BV009474291': '1767'
}

#dictionary for check digits, which are stripped in file names, because they are appended with '-'
numbers = {
    'BV009519002': '3',
    'BV009519003': '8',
    'BV009186104': '2',
    'BV009328391': '9',
    'BV009328392': '5',
    'BV042324426': '4',
    'BV008972901': '1',
    'BV008972922': '7',
    'BV008944838': '9',
    'BV008962194': '8',
    'BV003132717': '1',
    'BV042024113': '3',
    'BV009474290': '8',
    'BV009474291': '4'
}



#csv file for vikus viewer with ids generated out of the filenames of the extracted images
with open("../vikus/data/data.csv", mode="w") as data_file:
    #csv writer
    data_writer = csv.writer(data_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    #write csv header
    data_writer.writerow(["id", "keywords", "year", "_link"])
    #for every image
    with open("../kmeans/data/kmeansResult.csv") as kmeans_file:
        reader = csv.reader(kmeans_file)
        #read all lines
        firstline = True
        for line in reader:
            if (firstline):
              firstline = False
              continue
            else:
              work = line[0].split("_") #append page numbers with '_', before is BV number
              urn = "https://nbn-resolving.org/urn:nbn:de:bvb:29-" + work[0].lower() + "-" + numbers[work[0]] + "#" + work[1].split(".")[0]
              data_writer.writerow([line[0], keywords[line[1]], years[work[0]], "<a href='" + urn + "' target='_blank'>Im Buch sehen</a>"])
