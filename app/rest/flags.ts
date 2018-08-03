﻿import * as express from 'express';
import * as fs from 'fs';
import {IFlagsRequest} from "../contracts/entities";
import * as mime from '../helpers/mime-helper';

/*
REST: A megfelelő zászlőképeket adja vissza megfelelő méretben, és formátumban.
*/
export async function flagImage(req: IFlagsRequest, res: express.Response) {
    try {
        const format = "webp";
        res.setHeader('Content-Type', mime.getMimeForExtension(format));
        let size = 256;
        if (!isNaN(req.params.size)) {
            size = req.params.size;
        }
        let sizeNewRounded = (Math.ceil((size * 1.2) / 50)) * 50;
        if (sizeNewRounded > 1000) {
            sizeNewRounded = 1000;
        }
        let img = req.params.cc.toLowerCase();
        fs.exists(`./public/images/flagsConverted/webp/${sizeNewRounded}/${img}-01.${format}`, exists => {
            if (!exists) {
                img = "xx";
            }
            const binary = fs.readFileSync(`./public/images/flagsConverted/webp/${sizeNewRounded}/${img}-01.${format}`);
            res.end(binary);
        });
    } catch (exc) {
        console.error(exc.toString());
    }
}