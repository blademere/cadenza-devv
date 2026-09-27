import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
} from "react-native";

import { fonts } from "../../themes/fonts";


interface Props {
    lesson: string;
    student: string;
    time: string;
}


export default function AttendanceCard({
    lesson,
    student,
    time,
}: Props) {

    return (

        <View className="mb-3 rounded-2xl bg-white p-4">


            {/* Lesson Header */}
            <Text
                className="mb-3 text-base text-[#1A1A1A]"
                style={{
                    fontFamily: fonts.bold
                }}
            >
                {lesson}
            </Text>



            {/* Student + Attendance Button */}
            <View className="flex-row items-center justify-between">


                <Text
                    className="text-sm text-[#555]"
                    style={{
                        fontFamily: fonts.regular
                    }}
                >
                    {student}
                </Text>



                <View className="flex-row">

                    <TouchableOpacity
                        className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-green-100"
                    >
                        <Text
                            className="text-green-600"
                            style={{
                                fontFamily: fonts.bold
                            }}
                        >
                            ✓
                        </Text>
                    </TouchableOpacity>



                    <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-full bg-red-100"
                    >
                        <Text
                            className="text-red-600"
                            style={{
                                fontFamily: fonts.bold
                            }}
                        >
                            ✕
                        </Text>
                    </TouchableOpacity>


                </View>


            </View>



            {/* Time */}
            <Text
                className="mt-3 text-sm text-[#777]"
                style={{
                    fontFamily: fonts.regular
                }}
            >
                {time}
            </Text>


        </View>

    );

}