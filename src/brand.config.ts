export interface BrandConfig {
  hospitalName: string;
  subTitle: string;
  logoAsset: string;
  accentColor: string;
  accentColorHover: string;
  accentColorActive: string;
  accentColorLight: string;
  accentColorDark: string;
  topBarBg: string;
  topBarBorder: string;
  showHeaderUserBlock: boolean;
  showHeaderHospitalTitle: boolean;
}

export const BRAND_CONFIG: BrandConfig = {
  hospitalName: 'Beacon Health Care',
  subTitle: 'Outpatient Clinic Operations',
  logoAsset: '',
  accentColor: '#0d9488',
  accentColorHover: '#0f766e',
  accentColorActive: '#115e59',
  accentColorLight: '#f0fdfa',
  accentColorDark: '#134e4a',
  topBarBg: '#ffffff',
  topBarBorder: '#e2e8f0',
  showHeaderUserBlock: true,
  showHeaderHospitalTitle: true,
};
