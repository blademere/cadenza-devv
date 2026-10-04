import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import { fonts } from "../../themes/fonts";
import { days } from "../../constants/days";

import AvailabilityCard from "../../components/instructor/AvailabilityCard";

import {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "../../services/instructorAvailabilityService";

import { getTimeSlots } from "../../services/timeSlotService";

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
}

interface Slot {
  id: number;
  timeSlotId: number;
  start: string;
  end: string;
}

interface DayAvailability {
  day: string;
  slots: Slot[];
}

function extractArray<T = any>(response: any): T[] {
  const payload = response?.data;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (Array.isArray(payload?.data)) {
    return payload.data as T[];
  }

  return [];
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const [modalVisible, setModalVisible] = useState(false);

  const [selectedDay, setSelectedDay] = useState("");
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);

  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // =========================
  // LOAD TIME SLOTS
  // =========================

  async function loadTimeSlots() {
    try {
      const response = await getTimeSlots();

      console.log("TIME SLOTS:", response);

      setTimeSlots(extractArray<TimeSlot>(response));
    } catch (error: any) {
      console.error("Time slots error:", error?.response?.data || error);

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load time slots.",
      );
    }
  }

  // =========================
  // LOAD AVAILABILITY
  // =========================

  async function loadAvailability() {
    try {
      setLoading(true);

      const response = await getAvailability();

      const rows = extractArray(response);

      const grouped: DayAvailability[] = days.map((day) => {
        const slots = rows
          .filter(
            (item: any) =>
              item.day_of_week?.toLowerCase() === day.label.toLowerCase(),
          )
          .map((item: any) => ({
            id: item.id,
            timeSlotId: item.time_slot_id,
            start: formatTime(item.time_slot?.start_time),
            end: formatTime(item.time_slot?.end_time),
          }));

        return {
          day: day.label,
          slots,
        };
      });

      setAvailability(grouped);
    } catch (error: any) {
      console.error("Availability error:", error?.response?.data || error);

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load availability.",
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadAvailability();
    loadTimeSlots();
  }, []);

  // =========================
  // ADD
  // =========================

  function handleAdd(day: string) {
    setSelectedDay(day);
    setEditingSlot(null);
    setSelectedTimeSlotId(null);
    setModalVisible(true);
  }

  // =========================
  // EDIT
  // =========================

  function handleEdit(day: string, slot: Slot) {
    setSelectedDay(day);
    setEditingSlot(slot);

    // Select existing backend time slot
    setSelectedTimeSlotId(slot.timeSlotId);

    setModalVisible(true);
  }

  function isTimeSlotUsed(timeSlotId: number) {
    const dayData = availability.find((item) => item.day === selectedDay);

    if (!dayData) {
      return false;
    }

    return dayData.slots.some((slot) => slot.timeSlotId === timeSlotId);
  }

  // =========================
  // DELETE
  // =========================

  async function handleDelete(day: string, slot: Slot) {
    Alert.alert("Delete Availability", `Delete ${slot.start} - ${slot.end}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        async onPress() {
          try {
            await deleteAvailability(slot.id);

            await loadAvailability();
          } catch (error: any) {
            console.error(
              "Delete availability error:",
              error?.response?.data || error,
            );

            Alert.alert(
              "Error",
              error?.response?.data?.message ||
                "Failed to delete availability.",
            );
          }
        },
      },
    ]);
  }

  // =========================
  // SAVE
  // =========================

  async function handleSave() {
    if (!selectedTimeSlotId) {
      Alert.alert("Select Time Slot", "Please select a time slot.");

      return;
    }

    try {
      setSaving(true);

      if (editingSlot) {
        await updateAvailability(
          editingSlot.id,
          selectedDay,
          selectedTimeSlotId,
        );
      } else {
        await createAvailability(selectedDay, selectedTimeSlotId);
      }

      setModalVisible(false);

      setSelectedTimeSlotId(null);
      setEditingSlot(null);

      await loadAvailability();
    } catch (error: any) {
      console.error("Save availability error:", error?.response?.data || error);

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to save availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // RENDER
  // =========================

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-4">
        <Text
          className="mb-4 text-lg uppercase tracking-[0.5px] text-[#1A1A1A]"
          style={{ fontFamily: fonts.bold }}
        >
          Time Availability
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          days.map((day) => {
            const data = availability.find((item) => item.day === day.label);

            return (
              <AvailabilityCard
                key={day.label}
                day={day.label}
                slots={data?.slots ?? []}
                onAdd={() => handleAdd(day.label)}
                onEdit={(slot) => handleEdit(day.label, slot)}
                onDelete={(slot) => handleDelete(day.label, slot)}
              />
            );
          })
        )}
      </ScrollView>

      {/* ========================= */}
      {/* ADD / EDIT MODAL */}
      {/* ========================= */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-6">
            <Text
              className="mb-1 text-xl text-[#1A1A1A]"
              style={{ fontFamily: fonts.bold }}
            >
              {editingSlot ? "Edit Time Slot" : "Add Time Slot"}
            </Text>

            <Text
              className="mb-5 text-sm text-[#777]"
              style={{ fontFamily: fonts.regular }}
            >
              {selectedDay}
            </Text>

            <Text
              className="mb-2 text-sm text-[#333]"
              style={{ fontFamily: fonts.bold }}
            >
              Select Time
            </Text>

            {/* TIME SLOT OPTIONS */}

            <ScrollView
              className="mb-6 max-h-60"
              showsVerticalScrollIndicator={false}
            >
              {timeSlots.map((slot) => {
                const selected = selectedTimeSlotId === slot.id;

                const alreadyUsed =
                  isTimeSlotUsed(slot.id) &&
                  editingSlot?.timeSlotId !== slot.id;

                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={alreadyUsed || saving}
                    onPress={() => setSelectedTimeSlotId(slot.id)}
                    className={`mb-2 rounded-xl border p-4 ${
                      alreadyUsed
                        ? "border-gray-100 bg-gray-100"
                        : selected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <Text
                      className={
                        alreadyUsed
                          ? "text-gray-400"
                          : selected
                            ? "text-blue-600"
                            : "text-[#333]"
                      }
                      style={{
                        fontFamily: fonts.bold,
                      }}
                    >
                      {formatTime(slot.start_time)} -{" "}
                      {formatTime(slot.end_time)}
                    </Text>

                    {alreadyUsed && (
                      <Text
                        className="mt-1 text-xs text-gray-400"
                        style={{ fontFamily: fonts.regular }}
                      >
                        Already added
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* BUTTONS */}

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="mr-3 flex-1 items-center rounded-xl bg-gray-100 py-3"
                disabled={saving}
              >
                <Text
                  className="text-gray-700"
                  style={{ fontFamily: fonts.bold }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 items-center rounded-xl bg-blue-600 py-3"
                disabled={saving}
              >
                <Text className="text-white" style={{ fontFamily: fonts.bold }}>
                  {saving ? "Saving..." : editingSlot ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =========================
// FORMAT TIME
// =========================

function formatTime(value: any) {
  if (!value) {
    return "";
  }

  // MySQL TIME
  if (typeof value === "string" && /^\d{2}:\d{2}:\d{2}$/.test(value)) {
    const [hour, minute] = value.split(":");

    const h = Number(hour);
    const m = Number(minute);

    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;

    return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  // Prisma DateTime representation
  if (typeof value === "string" && value.includes("T")) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  return String(value);
}
