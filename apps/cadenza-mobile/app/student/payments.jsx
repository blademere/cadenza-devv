import { ScrollView, Text, View } from 'react-native';
import useMobileResource from '../../hooks/useMobileResource';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';
import { getStudentPayments } from '../../services/studentService';

const ACCENT = '#0C447C';

function money(value, currency = 'PHP') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0);
}

function statusColors(status = '') {
  if (status.toUpperCase() === 'PAID') return { background: 'bg-green-100', text: 'text-green-800' };
  if (['DUE', 'PENDING', 'OVERDUE'].includes(status.toUpperCase())) return { background: 'bg-amber-100', text: 'text-amber-800' };
  return { background: 'bg-gray-100', text: 'text-gray-700' };
}

export default function StudentPaymentsPage() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentPayments);
  const currency = data?.currency || 'PHP';
  const records = Array.isArray(data?.records) ? data.records : [];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>Payments</Text>
      <Text className="mt-2 text-gray-500">View your payment status and history.</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {data && <>
        <View className="mt-6 rounded-3xl bg-[#E6F1FB] p-5">
          <Text className="text-sm text-gray-600">Outstanding balance</Text>
          <Text className="mt-2 text-3xl font-bold" style={{ color: ACCENT }}>{money(data.outstandingAmount, currency)}</Text>
          {data.nextDueDate && <Text className="mt-2 text-gray-600">Next due {new Date(data.nextDueDate).toLocaleDateString()}</Text>}
        </View>
        <Text className="mb-1 mt-7 text-lg font-bold text-gray-800">Payment history</Text>
        {!records.length && <Text className="mt-3 text-gray-500">No payment records available.</Text>}
        {records.map((record) => <View key={record.id} className="mt-3 rounded-2xl border border-gray-200 p-4">
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="font-semibold text-gray-900">{record.description || 'Payment'}</Text>
              <Text className="mt-1 text-sm text-gray-500">{record.paidAt ? `Paid ${new Date(record.paidAt).toLocaleDateString()}` : record.dueDate ? `Due ${new Date(record.dueDate).toLocaleDateString()}` : 'Date unavailable'}</Text>
            </View>
            <Text className="font-bold text-gray-900">{money(record.amount, currency)}</Text>
          </View>
          <View className={`mt-3 self-start rounded-full px-3 py-1 ${statusColors(record.status).background}`}>
            <Text className={`text-xs font-semibold ${statusColors(record.status).text}`}>{String(record.status || 'UNKNOWN').replaceAll('_', ' ')}</Text>
          </View>
        </View>)}
      </>}
    </ScrollView>
  );
}
