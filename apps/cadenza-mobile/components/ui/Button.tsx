import { Pressable, Text } from "react-native";

type ButtonVariant = "primary" | "outline";

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
}

export function Button({
  children,
  onPress,
  variant = "primary",
}: ButtonProps) {
  const isOutline = variant === "outline";

  return (
    <Pressable
      className={`
        items-center
        justify-center
        rounded-xl
        px-4
        py-3
        active:opacity-80
        ${
          isOutline
            ? "border border-[#063970] bg-transparent"
            : "bg-[#063970]"
        }
      `}
      onPress={onPress}
    >
      <Text
        className={`
          font-semibold
          ${
            isOutline
              ? "text-[#063970]"
              : "text-white"
          }
        `}
      >
        {children}
      </Text>
    </Pressable>
  );
}