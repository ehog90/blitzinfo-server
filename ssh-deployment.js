const fs = require('fs');
const path = require('path');
const node_ssh = require('node-ssh');
const ssh = new node_ssh();
const readline = require('readline');
const Writable = require('stream').Writable;

var mutableStdout = new Writable({
    write: function (chunk, encoding, callback) {
        if (!this.muted)
            process.stdout.write(chunk, encoding);
        callback();
    }
});

mutableStdout.muted = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true
});

rl.question('Enter password: ', async (password) => {
    rl.close();
    try {
        await ssh.connect({
            host: '192.168.1.22',
            username: 'regor',
            port: 22,
            password,
        });
        console.log("\nTerminal access granted");
    } catch (e) {
        console.error(e);
        process.exit(1)
    }
    let isInError = false;
    console.log("Removal of current dir...");
    await ssh.execCommand('rm -r node-projects/blitzinfo-srv');
    console.log("Current dir removed.");
    await ssh.putDirectory('./dist', '/regor/node-projects/blitzinfo-srv', {
        recursive: true,
        concurrency: 3,
        validate: function (itemPath) {
            const baseName = path.basename(itemPath);
            return baseName.substr(0, 1) !== '.'
        },
        tick: function (localPath, remotePath, error) {
            if (error) {
                console.error(error);
                isInError = true;
            }
        }
    });
    console.log(
        isInError ? 'Transfer was unsuccessful': 'Transfer was successful');
    if (!isInError) {
        console.log('Executing NPM install...');
        const npmResult = await ssh.execCommand('npm install --prod', { cwd:'/regor/node-projects/blitzinfo-srv' });
        console.log(npmResult.stdout);
        console.log('NPM install is done.');
        process.exit(0)
    } else {
        process.exit(1);
    }
});

mutableStdout.muted = true;