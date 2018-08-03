call pm2 stop blitzinfo-main
call pm2 stop blitzinfo-rgnode
call pm2 start app.js --name blitzinfo-rgnode -i 4
call pm2 start revgeo-node.js --name blitzinfo-main
