import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, ChevronDown, Check } from 'lucide-react';

/**
 * Searchable county picker with sticky search bar and scrollable list.
 *
 * Props:
 *  - counties: Array<{ id, name }>
 *  - value: string (selected county id)
 *  - onChange: (id) => void
 *  - label?: string
 */
export default function CountyPicker({ counties, value, onChange, label = 'County You Operate From' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = counties.find(c => c.id === value);
  const filtered = counties.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full mt-1 px-3 py-2.5 rounded-xl border bg-background text-sm flex items-center justify-between transition-colors ${selected ? 'border-primary/40 ring-1 ring-primary/20' : 'border-input'} ${open ? 'ring-2 ring-primary border-primary' : ''}`}
      >
        <span className={`flex items-center gap-2 ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          <MapPin className={`w-4 h-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
          {selected ? selected.name : 'Select county'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-fade-in">
          <div className="sticky top-0 bg-popover border-b border-border p-2">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search county..."
                className="flex-1 py-2 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No county found
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-primary/5 active:bg-primary/10 transition-colors ${c.id === value ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'}`}
                >
                  {c.name}
                  {c.id === value && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}