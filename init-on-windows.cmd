call pm2 stop blitzinfo-master
call pm2 stop blitzinfo-reverse-geocoder
call pm2 start revgeo-node.js --name blitzinfo-reverse-geocoder -i 4
call pm2 start app.js --name blitzinfo-master
