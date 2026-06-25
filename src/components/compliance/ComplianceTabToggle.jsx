// Tab toggle: My Status / Checklist
export default function ComplianceTabToggle({ activeTab, onChange }) {
  return (
    <div className="flex gap-2 mb-6 bg-[#F0F0F0] p-1 rounded-full w-full">
      <button
        onClick={() => onChange('status')}
        className={`flex-1 py-2 px-4 rounded-full font-bold text-sm transition-all ${
          activeTab === 'status'
            ? 'bg-[#EA580C] text-white'
            : 'bg-transparent text-[#666]'
        }`}
      >
        My Status
      </button>
      <button
        onClick={() => onChange('checklist')}
        className={`flex-1 py-2 px-4 rounded-full font-bold text-sm transition-all ${
          activeTab === 'checklist'
            ? 'bg-[#EA580C] text-white'
            : 'bg-transparent text-[#666]'
        }`}
      >
        Checklist
      </button>
    </div>
  );
}