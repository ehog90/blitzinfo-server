#!/bin/bash
sudo pm2 stop blitzinfo-main
sudo pm2 stop blitzinfo-rgnode
sudo pm2 start app-revgeo-node.js --name blitzinfo-rgnode -i 4
sleep 5
sudo pm2 start app-main.js --name blitzinfo-main
