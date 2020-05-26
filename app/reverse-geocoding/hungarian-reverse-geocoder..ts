import * as fs from 'fs';
import { IHungarianRegionalInformation } from '../contracts/entities';
import { IHungarianRegionalReverseGeoCoder } from '../contracts/service-interfaces';
const wherewolf = require('wherewolf');

/*
    magyarországi megyét, és járást meghatározó osztály.
*/
class HungarianRegionalReverseGeocoder implements IHungarianRegionalReverseGeoCoder {
   private static hungarianBoundingBox: number[][] = [
      [16.1138867, 45.737128],
      [22.8974573, 48.585257],
   ];
   private whereWolfInstance: any;
   constructor() {
      const countyData = JSON.parse(fs.readFileSync('./static-json-data/huCounties.json', 'utf8'));
      const regionalUnitData = JSON.parse(fs.readFileSync('./static-json-data/huRegionalUnits.json', 'utf8'));
      this.whereWolfInstance = wherewolf();
      this.whereWolfInstance.add('county', countyData);
      this.whereWolfInstance.add('regionalUnit', regionalUnitData);
   }

   public getRegionalInformation(latLonPair: number[]): Promise<IHungarianRegionalInformation> {
      if (
         latLonPair[0] >= HungarianRegionalReverseGeocoder.hungarianBoundingBox[0][0] &&
         latLonPair[0] <= HungarianRegionalReverseGeocoder.hungarianBoundingBox[1][0] &&
         latLonPair[1] >= HungarianRegionalReverseGeocoder.hungarianBoundingBox[0][1] &&
         latLonPair[1] <= HungarianRegionalReverseGeocoder.hungarianBoundingBox[1][1]
      ) {
         const result = this.whereWolfInstance.find(
            { lat: latLonPair[1], lng: latLonPair[0] },
            { wholeFeature: true }
         );
         if (result.county != null && result.regionalUnit != null) {
            return Promise.resolve({
               isInHungary: true,
               regionalData: {
                  countyName: result.county.properties.localname,
                  regionalUnitName: result.regionalUnit.properties.localname,
               },
            });
         } else {
            return Promise.resolve({ isInHungary: false });
         }
      } else {
         return Promise.resolve({ isInHungary: false });
      }
   }
}
export const huRegReverseGeocoder: IHungarianRegionalReverseGeoCoder = new HungarianRegionalReverseGeocoder();
