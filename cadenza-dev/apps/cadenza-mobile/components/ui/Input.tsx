import { TextInput } from "react-native";

interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
}

export default function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
}: InputProps) {
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