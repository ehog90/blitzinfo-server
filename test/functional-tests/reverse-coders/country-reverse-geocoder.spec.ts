import { CountryBasedReverseGeocoder } from '../../../app/reverse-geocoding/country-based-reverse-geocoder';

describe('Google-based reverse geocoder', () => {
  let geocoder: CountryBasedReverseGeocoder;

  beforeAll(() => {
    geocoder = new CountryBasedReverseGeocoder();
  });

  it('Should geocode a place in Hungary', async () => {
    const hungaryTest = await geocoder.getCountryData([19, 47]);
    expect(hungaryTest).toEqual({ cc: 'hu', seaData: null });
  });

  it('Should geocode in sea', async () => {
    const hungaryTest = await geocoder.getCountryData([3.419435, 56.730061]);
    expect(hungaryTest).toEqual({ cc: 'xx', seaData: 'North Sea' });
  });
});
