import { describe, it, expect } from 'vitest';
import {
  FACILITY_CLASSIFICATIONS,
  FACILITY_TYPE_BUNDLES,
  calculateModulesForClassifications,
  normalizeClassifications,
  formatClassifications,
  getClinicClassifications,
} from '../src/lib/facilityClassifications';

describe('Facility Classifications and Automated Module Assignment', () => {
  it('strictly defines only 3 allowed facility types: OPD, IPD, and Lab', () => {
    expect(FACILITY_CLASSIFICATIONS).toEqual(['OPD', 'IPD', 'Lab']);
    expect(Object.keys(FACILITY_TYPE_BUNDLES).sort()).toEqual(['IPD', 'Lab', 'OPD']);
  });

  it('provides predefined module bundle for OPD including specialized billing', () => {
    const opdBundle = FACILITY_TYPE_BUNDLES.OPD;
    expect(opdBundle.modules).toContain('OPD Billing & Invoicing');
    expect(opdBundle.modules).toContain('Patient Registration');
    expect(opdBundle.modules).toContain('Appointment Scheduling');
    expect(opdBundle.modules).toContain('Consultation Workstation');
    expect(opdBundle.modules).toContain('EMR Clinical Records');
    expect(opdBundle.modules).toContain('Prescription Authoring');
    expect(opdBundle.modules.length).toBe(6);
  });

  it('provides predefined module bundle for IPD including specialized billing', () => {
    const ipdBundle = FACILITY_TYPE_BUNDLES.IPD;
    expect(ipdBundle.modules).toContain('IPD Billing & Discharge Settlements');
    expect(ipdBundle.modules).toContain('Patient Registration');
    expect(ipdBundle.modules).toContain('Inpatient Admissions');
    expect(ipdBundle.modules).toContain('Bed Allocation & Wards');
    expect(ipdBundle.modules).toContain('Nursing Station');
    expect(ipdBundle.modules).toContain('EMR Clinical Records');
    expect(ipdBundle.modules.length).toBe(6);
  });

  it('provides predefined module bundle for Lab including specialized billing', () => {
    const labBundle = FACILITY_TYPE_BUNDLES.Lab;
    expect(labBundle.modules).toContain('Diagnostic Billing & Invoicing');
    expect(labBundle.modules).toContain('Patient Registration');
    expect(labBundle.modules).toContain('Specimen Intake & Barcoding');
    expect(labBundle.modules).toContain('Diagnostic Lab Workstation');
    expect(labBundle.modules).toContain('Pathology Report Authoring');
    expect(labBundle.modules.length).toBe(5);
  });

  it('combines multiple facility types without duplicating shared modules', () => {
    // Shared modules: 'Patient Registration' (in OPD, IPD, Lab), 'EMR Clinical Records' (in OPD, IPD)
    const opdOnly = calculateModulesForClassifications(['OPD']);
    expect(opdOnly.length).toBe(6);

    const opdAndIpd = calculateModulesForClassifications(['OPD', 'IPD']);
    // 6 (OPD) + 6 (IPD) - 2 shared (Registration, EMR) = 10 modules
    expect(opdAndIpd.length).toBe(10);
    expect(opdAndIpd.filter((m) => m === 'Patient Registration').length).toBe(1);
    expect(opdAndIpd.filter((m) => m === 'EMR Clinical Records').length).toBe(1);
    expect(opdAndIpd).toContain('OPD Billing & Invoicing');
    expect(opdAndIpd).toContain('IPD Billing & Discharge Settlements');

    // All three facility types
    const allThree = calculateModulesForClassifications(['OPD', 'IPD', 'Lab']);
    // 6 (OPD) + 4 (IPD unique) + 4 (Lab unique) = 14 deduplicated modules
    expect(allThree.length).toBe(14);
    expect(allThree).toContain('OPD Billing & Invoicing');
    expect(allThree).toContain('IPD Billing & Discharge Settlements');
    expect(allThree).toContain('Diagnostic Billing & Invoicing');
    expect(allThree.filter((m) => m === 'Patient Registration').length).toBe(1);
  });

  it('normalizes facility types and strips unsupported facility categories', () => {
    expect(normalizeClassifications(['OPD', 'Pharmacy', 'Emergency', 'Laboratory'])).toEqual(['OPD', 'Lab']);
    expect(normalizeClassifications(['ipd', 'lab'])).toEqual(['IPD', 'Lab']);
    expect(normalizeClassifications([])).toEqual(['OPD']);
    expect(normalizeClassifications(undefined)).toEqual(['OPD']);
  });

  it('formats classifications into clean comma-separated text', () => {
    expect(formatClassifications(['OPD'])).toBe('OPD');
    expect(formatClassifications(['OPD', 'IPD'])).toBe('OPD, IPD');
    expect(formatClassifications(['OPD', 'IPD', 'Lab'])).toBe('OPD, IPD, Lab');
  });

  it('safely extracts clinic classifications falling back gracefully', () => {
    expect(getClinicClassifications({ facilityClassifications: ['IPD', 'Lab'] })).toEqual(['IPD', 'Lab']);
    expect(getClinicClassifications({ optedFacilities: ['Laboratory'] })).toEqual(['Lab']);
    expect(getClinicClassifications({})).toEqual(['OPD']);
  });
});
