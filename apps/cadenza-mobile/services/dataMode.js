import { getAccount } from './authStorage';

const MOCK_DATA_MODE = process.env.EXPO_PUBLIC_MOBILE_DATA_MODE !== 'api';

export async function isMockDataEnabled() {
  const account = await getAccount();
  return MOCK_DATA_MODE || account?.isMock === true;
}
