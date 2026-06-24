import { User, Calendar, FileText, MapPin, Globe } from 'lucide-react';

/**
 * Confidence badge thresholds per PRD:
 *   >=0.95 green, 0.80-0.94 amber, <0.80 red
 */
function confidenceColor(c) {
  if (c == null) return null;
  if (c >= 0.95) return 'green';
  if (c >= 0.80) return 'amber';
  return 'red';
}

const BADGE_STYLES = {
  green: 'bg-success/10 text-success',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-destructive/10 text-destructive',
};

function ConfidenceBadge({ confidence }) {
  const color = confidenceColor(confidence);
  if (!color) return null;
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[color]}`}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

function FieldCell({ label, field }) {
  if (!field || field.value == null || field.value === '') return null;
  const value = String(field.value);
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold truncate" title={value}>{value}</span>
        <ConfidenceBadge confidence={field.confidence} />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
      <Icon className="w-3 h-3" /> {title}
    </p>
  );
}

const SECTION_CONFIG = [
  {
    title: 'Identity',
    icon: User,
    fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'middleName', label: 'Middle Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'age', label: 'Age' },
      { key: 'dayOfBirth', label: 'Day of Birth' },
      { key: 'monthOfBirth', label: 'Month of Birth' },
      { key: 'yearOfBirth', label: 'Year of Birth' },
      { key: 'sex', label: 'Gender' },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'personalNumber', label: 'Personal Number' },
    ],
  },
  {
    title: 'Document',
    icon: FileText,
    fields: [
      { key: 'documentName', label: 'Document Name' },
      { key: 'documentType', label: 'Document Type' },
      { key: 'documentSide', label: 'Document Side' },
      { key: 'documentNumber', label: 'Document Number' },
      { key: 'internalId', label: 'Internal ID' },
      { key: 'issuingAuthority', label: 'Issuing Authority' },
      { key: 'issued', label: 'Date of Issue' },
      { key: 'daysFromIssue', label: 'Days From Issue' },
      { key: 'expiry', label: 'Expiry Date' },
      { key: 'mrz', label: 'MRZ' },
    ],
  },
  {
    title: 'Address / Location',
    icon: MapPin,
    fields: [
      { key: 'address1', label: 'Address 1 (District, Division, Location)' },
      { key: 'address2', label: 'Address 2 (Sub-Location)' },
      { key: 'postcode', label: 'Postcode' },
      { key: 'district', label: 'District' },
      { key: 'division', label: 'Division' },
      { key: 'location', label: 'Location' },
      { key: 'subLocation', label: 'Sub-Location' },
    ],
  },
  {
    title: 'Nationality & Country',
    icon: Globe,
    fields: [
      { key: 'country', label: 'Issued Country' },
      { key: 'issuedCountryIso2', label: 'ISO2' },
      { key: 'issuedCountryIso3', label: 'ISO3' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'nationalityIso2', label: 'Nationality ISO2' },
      { key: 'nationalityIso3', label: 'Nationality ISO3' },
      { key: 'optionalData1', label: 'Optional Data 1' },
      { key: 'optionalData2', label: 'Optional Data 2' },
    ],
  },
];

/**
 * Comprehensive extracted data grid.
 * Parses the id_extracted_data JSON blob and renders all known fields
 * with confidence badges, grouped into logical sections.
 *
 * @param {object} extractedData - Parsed JSON from user.id_extracted_data
 */
export default function ExtractedDataGrid({ extractedData }) {
  if (!extractedData) return null;

  const fields = extractedData.fields || extractedData.values || {};
  const hasAnyField = SECTION_CONFIG.some(section =>
    section.fields.some(f => fields[f.key] && (fields[f.key].value != null || (typeof fields[f.key] === 'string' && fields[f.key])))
  );

  if (!hasAnyField) return null;

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <SectionHeader icon={FileText} title="Extracted Document Data" />
      {SECTION_CONFIG.map(section => {
        const sectionFields = section.fields.filter(f => {
          const val = fields[f.key];
          if (!val) return false;
          if (typeof val === 'object') return val.value != null && val.value !== '';
          return val != null && val !== '';
        });
        if (sectionFields.length === 0) return null;
        return (
          <div key={section.title}>
            <SectionHeader icon={section.icon} title={section.title} />
            <div className="grid grid-cols-3 gap-x-3 gap-y-2">
              {sectionFields.map(f => {
                const val = fields[f.key];
                const field = typeof val === 'object' ? val : { value: val, confidence: null };
                return <FieldCell key={f.key} label={f.label} field={field} />;
              })}
            </div>
          </div>
        );
      })}
      {/* Extra fields from the payload we didn't explicitly list */}
      {extractedData.extraFields && Object.keys(extractedData.extraFields).length > 0 && (
        <div>
          <SectionHeader icon={FileText} title="Additional Fields" />
          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
            {Object.entries(extractedData.extraFields).map(([key, field]) => (
              <FieldCell key={key} label={key} field={field} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}