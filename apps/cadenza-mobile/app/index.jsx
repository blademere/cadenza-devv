import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getInitialRoute } from '../lib/auth';

export default function Index() {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    getInitialRoute()
      .then(setRoute)
      .catch(() => setRoute('/login'));
  }, []);

  if (!route) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={route} />;
}
