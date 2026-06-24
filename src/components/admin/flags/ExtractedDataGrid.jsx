import { User, FileText, MapPin, Globe } from 'lucide-react';

/**
 * Confidence badge thresholds:
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

// Field names match IDAnalyzer v2 API Data Fields doc:
// https://developer.idanalyzer.com/help/data-fields
const SECTION_CONFIG = [
  {
    title: 'Names',
    icon: User,
    fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'firstName', label: 'First Name' },
      { key: 'middleName', label: 'Middle Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'firstNameLocal', label: 'First Name (Local)' },
      { key: 'middleNameLocal', label: 'Middle Name (Local)' },
      { key: 'lastNameLocal', label: 'Last Name (Local)' },
      { key: 'fullNameLocal', label: 'Full Name (Local)' },
    ],
  },
  {
    title: 'Dates',
    icon: FileText,
    fields: [
      { key: 'dob', label: 'Date of Birth' },
      { key: 'dob_day', label: 'DOB Day' },
      { key: 'dob_month', label: 'DOB Month' },
      { key: 'dob_year', label: 'DOB Year' },
      { key: 'age', label: 'Age' },
      { key: 'expiry', label: 'Expiry Date' },
      { key: 'expiry_day', label: 'Expiry Day' },
      { key: 'expiry_month', label: 'Expiry Month' },
      { key: 'expiry_year', label: 'Expiry Year' },
      { key: 'daysToExpiry', label: 'Days to Expiry' },
      { key: 'issued', label: 'Date of Issue' },
      { key: 'issued_day', label: 'Issue Day' },
      { key: 'issued_month', label: 'Issue Month' },
      { key: 'issued_year', label: 'Issue Year' },
      { key: 'daysFromIssue', label: 'Days from Issue' },
    ],
  },
  {
    title: 'Personal Information',
    icon: User,
    fields: [
      { key: 'sex', label: 'Gender' },
      { key: 'height', label: 'Height' },
      { key: 'weight', label: 'Weight' },
      { key: 'hairColor', label: 'Hair Color' },
      { key: 'eyeColor', label: 'Eye Color' },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'religion', label: 'Religion' },
    ],
  },
  {
    title: 'Address',
    icon: MapPin,
    fields: [
      { key: 'address1', label: 'Address Line 1' },
      { key: 'address2', label: 'Address Line 2' },
      { key: 'postcode', label: 'Postcode' },
    ],
  },
  {
    title: 'Document Information',
    icon: FileText,
    fields: [
      { key: 'documentNumber', label: 'Document Number' },
      { key: 'personalNumber', label: 'Personal Number' },
      { key: 'documentSide', label: 'Document Side' },
      { key: 'documentType', label: 'Document Type' },
      { key: 'documentName', label: 'Document Name' },
      { key: 'internalId', label: 'Internal ID' },
      { key: 'issueAuthority', label: 'Issuing Authority' },
      { key: 'stateFull', label: 'State/Region' },
      { key: 'stateShort', label: 'State Code' },
      { key: 'vehicleClass', label: 'Vehicle Class' },
      { key: 'restrictions', label: 'Restrictions' },
      { key: 'endorsement', label: 'Endorsement' },
    ],
  },
  {
    title: 'Country & Nationality',
    icon: Globe,
    fields: [
      { key: 'countryFull', label: 'Country' },
      { key: 'countryIso2', label: 'Country ISO2' },
      { key: 'countryIso3', label: 'Country ISO3' },
      { key: 'nationalityFull', label: 'Nationality' },
      { key: 'nationalityIso2', label: 'Nationality ISO2' },
      { key: 'nationalityIso3', label: 'Nationality ISO3' },
    ],
  },
  {
    title: 'Other Data',
    icon: FileText,
    fields: [
      { key: 'optionalData', label: 'Optional Data 1' },
      { key: 'optionalData2', label: 'Optional Data 2' },
      { key: 'optionalData3', label: 'Optional Data 3' },
      { key: 'optionalData4', label: 'Optional Data 4' },
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
    section.fields.some(f => {
      const val = fields[f.key];
      if (!val) return false;
      if (typeof val === 'object') return val.value != null && val.value !== '';
      return val != null && val !== '';
    })
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