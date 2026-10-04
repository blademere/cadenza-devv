import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { fonts } from "../../themes/fonts";

interface Slot {
  id: number;
  start: string;
  end: string;
}

interface Props {
  day: string;
  slots: Slot[];
  onAdd: () => void;
  onEdit: (slot: Slot) => void;
  onDelete: (slot: Slot) => void;
}

export default function AvailabilityCard({
  day,
  slots,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  return (
    <View className="mb-4 rounded-2xl bg-white p-4">
      <Text
        className="mb-3 text-base text-[#1A1A1A]"
        style={{ fontFamily: fonts.bold }}
      >
        {day}
      </Text>

      {slots.length > 0 ? (
        slots.map((slot) => (
          <View
            key={slot.id}
            className="mb-3 flex-row items-center justify-between"
          >
            <Text
              className="text-sm text-[#555]"
              style={{ fontFamily: fonts.regular }}
            >
              {slot.start} - {slot.end}
            </Text>

            <View className="flex-row">
              <TouchableOpacity className="mr-3" onPress={() => onEdit(slot)}>
                <Text
                  className="text-blue-600"
                  style={{ fontFamily: fonts.regular }}
                >
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => onDelete(slot)}>
                <Text
                  className="text-red-500"
                  style={{ fontFamily: fonts.regular }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <Text
          className="mb-3 text-sm text-[#999]"
          style={{ fontFamily: fonts.regular }}
        >
          No availability set
        </Text>
      )}

      <TouchableOpacity onPress={onAdd}>
        <Text
          className="mt-1 text-sm text-blue-600"
          style={{ fontFamily: fonts.regular }}
        >
          + Add Time Slot
        </Text>
      </TouchableOpacity>
    </View>
  );
}
