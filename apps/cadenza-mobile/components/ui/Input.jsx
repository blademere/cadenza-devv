import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';
import { useState } from 'react';
export default function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="mb-2 rounded-xl border border-[#063970] bg-white">
      <TextInput
        className="
        mb-2
        px-4
        py-3
        pr-12
        text-gray-900
      "
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !visible}
      />
      {secureTextEntry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((current) => !current)}
          className="absolute right-3 top-0 h-12 w-10 items-center justify-center"
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color="#64748B" />
        </Pressable>
      ) : null}
    </View>
  );
}
