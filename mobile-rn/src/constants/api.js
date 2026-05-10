const BASE_URL = 'https://travelplanner-oturmzec0-sandria-nuriyas-projects.vercel.app';

export const API = {
  BASE_URL,
  LOGIN: `${BASE_URL}/api/auth/login`,
  REGISTER: `${BASE_URL}/api/auth/register`,
  GENERATE: `${BASE_URL}/api/itinerary/generate`,
  ITINERARY: `${BASE_URL}/api/itinerary`,
  RIWAYAT: `${BASE_URL}/api/itinerary/riwayat`,
  DESTINASI: `${BASE_URL}/api/destinasi`,
  KOTA: `${BASE_URL}/api/destinasi/kota`,
  TOKEN_KEY: 'jwt_token',
};
