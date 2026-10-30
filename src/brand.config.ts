export interface BrandConfig {
  hospitalName: string;
  subTitle: string;
  logoAsset: string;
  accentColor: string;
  accentColorHover: string;
  accentColorActive: string;
  accentColorLight: string;
  accentColorDark: string;
  showHeaderUserBlock: boolean;
}

export const BRAND_CONFIG: BrandConfig = {
  hospitalName: 'Subiksham Speciality Hospital',
  subTitle: 'SOEZY Clinic Operations',
  logoAsset: '/soezy-logo.png',
  accentColor: '#00c060',
  accentColorHover: '#00ab55',
  accentColorActive: '#00964b',
  accentColorLight: '#e6f9f0',
  accentColorDark: '#008542',
  showHeaderUserBlock: true,
};
