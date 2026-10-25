import { Picker } from '@react-native-picker/picker';

const INK = '#1F2937';

export default function ReadablePicker({ children, style, ...props }) {
  return <Picker {...props} mode="dropdown" style={[{ color: INK, backgroundColor: '#FFFFFF' }, style]} dropdownIconColor={INK}>{children}</Picker>;
}

ReadablePicker.Item = function ReadablePickerItem(props) {
  return <Picker.Item {...props} color={props.color || INK} />;
};
