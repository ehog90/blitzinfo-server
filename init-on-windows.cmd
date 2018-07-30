call pm2 stop blitzinfo-main
call pm2 stop blitzinfo-rgnode
call pm2 start app-revgeo-node.js --name blitzinfo-rgnode -i 4
call pm2 start app-main.js --name blitzinfo-main
