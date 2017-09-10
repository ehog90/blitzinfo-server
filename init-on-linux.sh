#!/bin/bash
if (whoami != root)
  then
  echo "Root access is needed"
  exit
  else
  echo "Executed with root access"
fi
sudo pm2 stop blitzinfo-master
sudo pm2 stop blitzinfo-reverse-geocoder
sudo pm2 start revgeo-node.js --name blitzinfo-reverse-geocoder -i 4
sleep 5
sudo pm2 start app.js --name blitzinfo-master
