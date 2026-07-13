const styles = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  SUBMITTED:   'bg-indigo-100 text-indigo-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
  ACTIVE:      'bg-green-100 text-green-700',
  SUSPENDED:   'bg-red-100 text-red-700',
  APPROVED:    'bg-green-100 text-green-700',
  REJECTED:    'bg-red-100 text-red-700',
  AVAILABLE:   'bg-green-100 text-green-700',
  UNAVAILABLE: 'bg-gray-100 text-gray-600',
  ON_LEAVE:    'bg-orange-100 text-orange-700',
};

export default function Badge({ status }) {
  const label = status?.replace('_', ' ') ?? status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}