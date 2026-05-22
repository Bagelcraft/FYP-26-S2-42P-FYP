const colorMap = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
};

export default function StatCard({ label, value, sub, icon, color = 'blue' }) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-10 h-10 rounded-lg ${c.icon} flex items-center justify-center text-lg flex-shrink-0`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${c.text}`}>{value}</p>
        {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}