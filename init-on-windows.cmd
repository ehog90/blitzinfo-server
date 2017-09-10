pm2 stop blitzinfo-master
pm2 stop blitzinfo-reverse-geocoder
pm2 start revgeo-node.js --name blitzinfo-reverse-geocoder -i 4
pm2 start app.js --name blitzinfo-master
