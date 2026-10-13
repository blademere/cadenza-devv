import { TextInput } from 'react-native';
export default function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
}) {
  return (
    <TextInput
      className="
        mb-2
        rounded-xl
        border
        border-[#063970]
        bg-white
        px-4
        py-3
        text-gray-900
      "
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
    />
  );
}
