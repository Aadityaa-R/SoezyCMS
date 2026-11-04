/**
 * Centralized Facility Classification and Automatic Module Assignment
 *
 * Rules:
 * 1. Clinics/branches are classified strictly using three facility types: OPD, IPD, and Lab.
 * 2. Any combination of these three types is permitted.
 * 3. Each facility type has a predefined bundle of required functional modules,
 *    including its relevant billing functionality and other mandatory features.
 * 4. When a classification is assigned, its complete predefined module bundle is automatically enabled.
 * 5. Combining multiple facility types combines their module bundles without duplicating shared modules.
 * 6. Super Admin manages only the facility classification; operational modules cannot be individually toggled.
 */

export type FacilityClassification = 'OPD' | 'IPD' | 'Lab';

export const FACILITY_CLASSIFICATIONS: readonly FacilityClassification[] = ['OPD', 'IPD', 'Lab'] as const;

export interface FacilityBundleDefinition {
  type: FacilityClassification;
  shortCode: string;
  name: string;
  description: string;
  modules: string[];
}

export const FACILITY_TYPE_BUNDLES: Record<FacilityClassification, FacilityBundleDefinition> = {
  OPD: {
    type: 'OPD',
    shortCode: 'OPD',
    name: 'Outpatient Department',
    description: 'Outpatient queue management, patient scheduling, clinical consultations, e-prescribing, and outpatient billing.',
    modules: [
      'Patient Registration',
      'Appointment Scheduling',
      'Consultation Workstation',
      'EMR Clinical Records',
      'Prescription Authoring',
      'OPD Billing & Invoicing',
    ],
  },
  IPD: {
    type: 'IPD',
    shortCode: 'IPD',
    name: 'Inpatient Department',
    description: 'Inpatient admissions, ward bed management, clinical nursing station, progress rounds, and inpatient billing.',
    modules: [
      'Patient Registration',
      'Inpatient Admissions',
      'Bed Allocation & Wards',
      'Nursing Station',
      'EMR Clinical Records',
      'IPD Billing & Discharge Settlements',
    ],
  },
  Lab: {
    type: 'Lab',
    shortCode: 'LAB',
    name: 'Diagnostic Laboratory',
    description: 'Specimen accessioning, diagnostic test processing, certified pathology reporting, and diagnostic billing.',
    modules: [
      'Patient Registration',
      'Specimen Intake & Barcoding',
      'Diagnostic Lab Workstation',
      'Pathology Report Authoring',
      'Diagnostic Billing & Invoicing',
    ],
  },
};

/**
 * Normalizes an array of facility strings into strictly valid FacilityClassification values.
 * Maps legacy 'Laboratory' -> 'Lab'. Ignores any facility types outside OPD, IPD, and Lab.
 */
export function normalizeClassifications(rawFacilities?: string[]): FacilityClassification[] {
  if (!rawFacilities || rawFacilities.length === 0) {
    return ['OPD'];
  }

  const valid = new Set<FacilityClassification>();
  for (const item of rawFacilities) {
    const upper = (item || '').trim().toUpperCase();
    if (upper === 'OPD') {
      valid.add('OPD');
    } else if (upper === 'IPD') {
      valid.add('IPD');
    } else if (upper === 'LAB' || upper === 'LABORATORY') {
      valid.add('Lab');
    }
  }

  return valid.size > 0 ? Array.from(valid) : ['OPD'];
}

/**
 * Safely extracts classifications from a clinic record, falling back to optedFacilities or ['OPD'].
 */
export function getClinicClassifications(clinic: {
  facilityClassifications?: FacilityClassification[];
  optedFacilities?: string[];
  entitledFacilities?: string[];
}): FacilityClassification[] {
  if (clinic.facilityClassifications && clinic.facilityClassifications.length > 0) {
    return normalizeClassifications(clinic.facilityClassifications);
  }
  if (clinic.optedFacilities && clinic.optedFacilities.length > 0) {
    return normalizeClassifications(clinic.optedFacilities);
  }
  if (clinic.entitledFacilities && clinic.entitledFacilities.length > 0) {
    return normalizeClassifications(clinic.entitledFacilities);
  }
  return ['OPD'];
}

/**
 * Calculates the complete, deduplicated list of enabled operational modules
 * for the provided facility classifications.
 */
export function calculateModulesForClassifications(classifications: string[]): string[] {
  const normalized = normalizeClassifications(classifications);
  const moduleSet = new Set<string>();

  // Ensure consistent predefined module bundle combination
  normalized.forEach((type) => {
    const bundle = FACILITY_TYPE_BUNDLES[type];
    if (bundle) {
      bundle.modules.forEach((mod) => moduleSet.add(mod));
    }
  });

  return Array.from(moduleSet);
}

/**
 * Formats a list of classifications into a clean comma-separated string (e.g. "OPD, IPD, Lab").
 */
export function formatClassifications(classifications?: string[]): string {
  const normalized = normalizeClassifications(classifications);
  return normalized.join(', ');
}
