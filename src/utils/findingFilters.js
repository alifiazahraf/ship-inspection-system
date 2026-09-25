// Shared filter helpers for finding lists (ship detail and all-findings pages)

export const EMPTY_FINDING_FILTERS = {
  year: '',
  search: '',
  category: '',
  picShip: '',
  picOffice: '',
  status: ''
};

// Date is stored as midnight UTC; read the year directly to avoid timezone shifts
export const getFindingYear = (date) => (date ? String(date).slice(0, 4) : '');

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

// Keep a currently selected value listed even when it no longer occurs in the data
const withSelected = (options, selected) =>
  selected && !options.includes(selected) ? [...options, selected] : options;

/**
 * Dropdown options built from the values present in the given findings.
 * @param {Array} findings
 * @param {Object} [selected] - current filters, kept in the options if missing from the data
 */
export const buildFindingFilterOptions = (findings, selected = EMPTY_FINDING_FILTERS) => ({
  years: withSelected(
    [...new Set(findings.map(f => getFindingYear(f.date)).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    selected.year
  ),
  categories: withSelected(uniqueSorted(findings.map(f => f.category)), selected.category),
  picShips: withSelected(uniqueSorted(findings.map(f => f.pic_ship)), selected.picShip),
  picOffices: withSelected(uniqueSorted(findings.map(f => f.pic_office)), selected.picOffice),
  statuses: withSelected(uniqueSorted(findings.map(f => f.status)), selected.status)
});

/**
 * Whether a finding matches the dropdown filters and the finding-text search.
 * Pages with their own search can pass filters with an empty `search`.
 */
export const matchesFindingFilters = (finding, filters) => {
  const search = (filters.search || '').trim().toLowerCase();
  return (
    (!filters.year || getFindingYear(finding.date) === filters.year) &&
    (!search || (finding.finding || '').toLowerCase().includes(search)) &&
    (!filters.category || finding.category === filters.category) &&
    (!filters.picShip || finding.pic_ship === filters.picShip) &&
    (!filters.picOffice || finding.pic_office === filters.picOffice) &&
    (!filters.status || finding.status === filters.status)
  );
};

export const hasActiveFindingFilters = (filters) =>
  Object.values(filters).some(value => String(value || '').trim() !== '');
