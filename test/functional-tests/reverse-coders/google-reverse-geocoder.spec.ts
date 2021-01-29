import { GoogleReverseGeocoder } from '../../../app/reverse-geocoding/google-reverse-geocoder';

describe('Google-based reverse geocoder', () => {
  let googleReverseGeocode: GoogleReverseGeocoder;

  beforeAll(() => {
    googleReverseGeocode = new GoogleReverseGeocoder();
  });

  it('Should return with an error (billing information)', async () => {
    let message = null;
    try {
      await googleReverseGeocode.getGeoInformation([19, 47]);
    } catch (e) {
      message = e.message;
    }
    expect(message).toEqual('400');
  });
});
