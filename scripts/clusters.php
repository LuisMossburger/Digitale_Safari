<html>
<!--
- DIGITALE SAFARI
- this script is used after kmeans defined the different clusters
- it prints out all images with different border colors according to the clusters
- the user should find keywords for each cluster and write them into the array in imgMetadata.py
-->
<head>
  <title>Clusterfinder | Digitale Safari 2.0</title>
  <style>
    #clusters {
      display: inline;
    }

    img {
      margin: 1em;
      display: inline;
      height: 100px;
      width: auto;
    }

    .cluster {
      border: 3px solid;
    }

    .cluster1, .cluster7, .cluster13, .cluster19 {border-color: #900}
    .cluster2, .cluster8, .cluster14, .cluster20 {border-color: #990}
    .cluster3, .cluster9, .cluster15, .cluster21 {border-color: #909}
    .cluster4, .cluster10, .cluster16, .cluster22 {border-color: #009}
    .cluster5, .cluster11, .cluster17, .cluster23 {border-color: #099}
    .cluster6, .cluster12, .cluster18, .cluster24 {border-color: #090}

  </style>
</head>

<body>

  <div id="clusters">

    <?php
      //open csv file that stores all clusters
      $handle = fopen("../kmeans/data/kmeansResult.csv", "r");
      $i = 0;
      //print all of them with different bordercolors
      while (($line = fgetcsv($handle, 1000, ",")) !== FALSE) {
        $i++;
        echo '<img class="cluster ' . $line[1] . '" src="../vikus/data/1024/' . $line[0] . '.jpg">';
      }
      fclose($handle);
    ?>

  </div>

</body>

</html>
