import * as mongoose from "mongoose";

export module MongoDbPrimitives {

    export const GeoAddress = {
        cc: String,
        regDef: String,
        sRegDef: String,
        smDef: String,
        strDef: String,
        suburbDef: String,
        sm_hun: String
    };
    export const AlertRegions =
        {
            countyName: String,
            regionalUnitName: String
        };

    export const HunData = {
        isInHungary: Boolean,
        regionalData: AlertRegions
    };
    export const UserData = {
        uid: mongoose.Schema.Types.ObjectId,
        dt: String
    };

    export const SunData = {
        sunElev: Number,
        azimuth: Number,
        sunState: String
    }

}