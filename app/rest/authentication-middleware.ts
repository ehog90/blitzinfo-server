/**
 * Created by ehog on 2016. 11. 12..
 */
import * as express from 'express';

import { IAuthenticatedRequest } from '../contracts/entities';
import { authUserAsync, State } from '../helpers/user-auth';

export async function authenticationMiddleware(
  req: IAuthenticatedRequest,
  res: express.Response,
  next,
) {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'application/json');

  if (req.url.startsWith('/auth')) {
    try {
      const authData = {
        uid: req.header('X-BlitzInfo-User'),
        sid: req.header('X-BlitzInfo-Session'),
      };
      req.authContext = await authUserAsync(authData);
      next();
    } catch (exc) {
      if (exc === State.NoUser) {
        res.statusCode = 401;
        res.json({ error: 'Unauthorized access' });
      } else {
        res.statusCode = 500;
        res.json({ error: 'Server error' });
      }
    }
  } else {
    next();
  }
}

export function authTest(req: express.Request, res: express.Response) {
  res.json({ status: 'OK' });
}
