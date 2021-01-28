import * as express from 'express';
import * as mongoose from 'mongoose';

import {
   IUserDocument,
   IUserLoginRequest,
   IUserLoginResponse,
   IUserRegistrationRequest,
   IUserRegistrationResponse,
} from '../contracts/entities';
import * as mongo from '../database/mongoose-schemes';

const emailRegexp: RegExp = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,10})$/;
const userNameRegexp: RegExp = /^[_a-zA-Z0-9-]+$/;
const fullNameRegexp: RegExp = /^[a-zA-ZàáâäãåąćęèéêëìíîïłńòóôöõøùúûüÿýżźñçčšžÀÁÂÄÃÅĄĆĘÈÉÊËÌÍÎÏŁŃÒÓÔÖÕØÙÚÛÜŸÝŻŹÑßÇŒÆČŠŽ∂ðöőüűÖŐÜŰ,.'-]+$/;

export function login(req: express.Request, res: express.Response) {
   const reqOwn = req as IUserLoginRequest;
   let response: IUserLoginResponse;
   try {
      if (reqOwn.body.uname !== undefined && reqOwn.body.pass !== undefined) {
         response = {
            errors: [],
            event: 'LOGIN',
         };
         response.errors = validateUserLogin(reqOwn);
         if (response.errors.length === 0) {
            mongo.UserMongoModel.findOne({
               userName: reqOwn.body.uname,
               password: reqOwn.body.pass,
            }).exec((error, userData) => {
               if (!error) {
                  if (userData != null) {
                     const mongooseId = new mongoose.Types.ObjectId();
                     response.userData = {
                        userId: userData._id.toString(),
                        userName: userData.userName,
                        sessionId: mongooseId.toString(),
                     };
                     res.json(response);
                     mongo.UserMongoModel.updateOne(
                        { _id: userData._id },
                        {
                           $push: {
                              logIns: {
                                 _id: mongooseId,
                                 userAgent: req.headers['user-agent'],
                                 ip: req.ip,
                                 time: new Date(),
                              },
                           },
                        }
                     ).exec((_1, _2) => {});
                  } else {
                     response.errors.push('LOGIN_FAILED');
                     res.json(response);
                  }
               } else {
                  response.errors.push('DATABASE_ERROR');
                  res.json(response);
               }
            });
         } else {
            res.end(JSON.stringify(response));
         }
      } else {
         response = {
            errors: ['NO_DATA'],
            event: 'LOGIN',
         };
         res.json(response);
      }
   } catch (exc) {
      res.json({ state: 'OTHER_ERROR' });
   }
}

function validateUserRegister(request: IUserRegistrationRequest): string[] {
   const errors: string[] = [];
   if (!userNameRegexp.test(request.body.uname)) {
      errors.push('UNAME_ERR_REGEXP');
   }
   if (!fullNameRegexp.test(request.body.fullname)) {
      errors.push('FULLNAME_ERR_REGEXP');
   }
   if (!emailRegexp.test(request.body.email)) {
      errors.push('EMAIL_ERR_REGEXP');
   }
   return errors;
}

/*
    Felhasználói bejelentkezés szerver oldali validációja.
*/
function validateUserLogin(request: IUserLoginRequest): string[] {
   const errors: string[] = [];
   if (!userNameRegexp.test(request.body.uname)) {
      errors.push('UNAME_ERR_REGEXP');
   }
   return errors;
}

/*
    REST: Regisztráció.
*/
export function register(req: IUserRegistrationRequest, res: express.Response) {
   try {
      let response: IUserRegistrationResponse;
      if (req.body.email !== undefined && req.body.pass !== undefined && req.body.uname !== undefined) {
         req.body.email = req.body.email.toLowerCase();
         response = {
            errors: [],
            event: 'REGISTER',
         };

         response.errors = validateUserRegister(req);
         if (response.errors.length === 0) {
            mongo.UserMongoModel.findOne({
               $or: [{ userName: req.body.uname }, { email: req.body.email }],
            }).exec((error, userData: IUserDocument) => {
               if (!error) {
                  if (userData == null) {
                     const userToInsert = new mongo.UserMongoModel({
                        userName: req.body.uname,
                        fullName: req.body.fullname,
                        email: req.body.email,
                        password: req.body.pass,
                     });
                     userToInsert.save((_error, saved: IUserDocument) => {
                        if (!error) {
                           response.userData = { userId: saved._id.toString() };
                           res.end(JSON.stringify(response));
                        } else {
                           response.errors.push('USER_ALREADY_EXISTS');
                           res.end(JSON.stringify(response));
                        }
                     });
                  } else {
                     response.errors.push('USER_ALREADY_EXISTS');
                     res.end(JSON.stringify(response));
                  }
               } else {
                  response.errors.push('DATABASE_ERROR');
                  res.end(JSON.stringify(response));
               }
            });
         } else {
            res.end(JSON.stringify(response));
         }
      } else {
         response = {
            errors: ['NO_DATA'],
            event: 'REGISTER',
         };
         res.end(JSON.stringify(response));
      }
   } catch (exc) {
      res.end({ state: 'OTHER_ERROR' });
   }
}
