export const WEAPON_PRESETS = {
  1: 1000,
  2: 1450,
  3: 2000,
  4: 2500,
  5: 3000
} as const;

export interface LaunchSite {
  id: string;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  group: string;
}

export const LAUNCH_SITE_GROUPS: { group: string; sites: LaunchSite[] }[] = [
  {
    group: 'IRAN — MISSILE BELT (WEST)',
    sites: [
      { id: 'ir-ilam',       label: 'Ilam',            sublabel: 'IRGC forward base, Iraq border',  lat: 33.637, lng: 46.422, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-qasr',       label: 'Qasr-e Shirin',   sublabel: 'Border crossing, western IRG',     lat: 34.515, lng: 45.577, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-mehran',     label: 'Mehran',           sublabel: 'IRGC staging, Iraqi border',       lat: 33.122, lng: 46.164, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-khorramabad',label: 'Khorramabad',      sublabel: 'Missile depot, Lorestan',          lat: 33.487, lng: 48.355, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-kermanshah', label: 'Kermanshah',       sublabel: 'IRGC Aerospace base',             lat: 34.314, lng: 47.065, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-hamadan',    label: 'Hamadan',          sublabel: 'Shahid Nojeh air base',            lat: 34.799, lng: 48.515, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-dezful',     label: 'Dezful',           sublabel: 'Underground missile city',         lat: 32.381, lng: 48.400, group: 'IRAN — MISSILE BELT (WEST)' },
      { id: 'ir-andimeshk',  label: 'Andimeshk',        sublabel: 'IRGC launch complex',              lat: 32.457, lng: 48.352, group: 'IRAN — MISSILE BELT (WEST)' },
    ]
  },
  {
    group: 'IRAN — GULF COAST',
    sites: [
      { id: 'ir-ahvaz',      label: 'Ahvaz',            sublabel: 'Khuzestan, Gulf proximity',        lat: 31.320, lng: 48.671, group: 'IRAN — GULF COAST' },
      { id: 'ir-bushehr',    label: 'Bushehr',           sublabel: 'Naval base + nuclear site',        lat: 28.921, lng: 50.826, group: 'IRAN — GULF COAST' },
      { id: 'ir-bandar-abbas',label:'Bandar Abbas',      sublabel: 'IRGC Navy HQ, Strait of Hormuz',  lat: 27.183, lng: 56.270, group: 'IRAN — GULF COAST' },
      { id: 'ir-hormuz-strait',label:'Hormuz Strait',   sublabel: 'Chokepoint, missile battery',      lat: 26.560, lng: 56.250, group: 'IRAN — GULF COAST' },
      { id: 'ir-qeshm',      label: 'Qeshm Island',     sublabel: 'IRGC base, Gulf island',           lat: 26.956, lng: 56.270, group: 'IRAN — GULF COAST' },
      { id: 'ir-jask',       label: 'Jask',              sublabel: 'IRGC Navy, Gulf of Oman',          lat: 25.643, lng: 57.769, group: 'IRAN — GULF COAST' },
    ]
  },
  {
    group: 'IRAN — INTERIOR',
    sites: [
      { id: 'ir-tehran',     label: 'Tehran',            sublabel: 'IRGC Aerospace HQ',               lat: 35.689, lng: 51.389, group: 'IRAN — INTERIOR' },
      { id: 'ir-qom',        label: 'Qom',               sublabel: 'Underground missile facilities',   lat: 34.640, lng: 50.876, group: 'IRAN — INTERIOR' },
      { id: 'ir-isfahan',    label: 'Isfahan',            sublabel: 'Missile production, IRGC sites',  lat: 32.661, lng: 51.680, group: 'IRAN — INTERIOR' },
      { id: 'ir-semnan',     label: 'Semnan',             sublabel: 'Space + long-range missile test',  lat: 35.571, lng: 53.397, group: 'IRAN — INTERIOR' },
      { id: 'ir-shiraz',     label: 'Shiraz',             sublabel: 'Fars province, IRGC base',         lat: 29.591, lng: 52.584, group: 'IRAN — INTERIOR' },
      { id: 'ir-tabriz',     label: 'Tabriz',             sublabel: 'Northwest Iran, IRGC base',        lat: 38.080, lng: 46.299, group: 'IRAN — INTERIOR' },
      { id: 'ir-mashhad',    label: 'Mashhad',            sublabel: 'Northeast strategic depth',        lat: 36.310, lng: 59.599, group: 'IRAN — INTERIOR' },
      { id: 'ir-yazd',       label: 'Yazd',               sublabel: 'Central Iran, drone facility',     lat: 31.898, lng: 54.368, group: 'IRAN — INTERIOR' },
      { id: 'ir-karaj',      label: 'Karaj',              sublabel: 'Defense industries complex',       lat: 35.835, lng: 50.999, group: 'IRAN — INTERIOR' },
      { id: 'ir-parchin',    label: 'Parchin',            sublabel: 'Military-nuclear complex',         lat: 35.529, lng: 51.779, group: 'IRAN — INTERIOR' },
    ]
  },
  {
    group: 'IRAQ — PMF / PRO-IRAN MILITIA',
    sites: [
      { id: 'iq-baghdad',    label: 'Baghdad',            sublabel: 'PMF political + logistics hub',   lat: 33.312, lng: 44.361, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-karbala',    label: 'Karbala',            sublabel: 'Kata\'ib Hezbollah area',          lat: 32.616, lng: 44.024, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-najaf',      label: 'Najaf',              sublabel: 'PMF recruiting, IRGC influence',  lat: 31.995, lng: 44.315, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-basra',      label: 'Basra',              sublabel: 'PMF stronghold, Gulf access',     lat: 30.508, lng: 47.783, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-alqaim',     label: 'Al-Qa\'im',          sublabel: 'Syria border, PMF corridor',      lat: 34.397, lng: 40.917, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-tikrit',     label: 'Tikrit',             sublabel: 'PMF garrison, Salah ad-Din',      lat: 34.596, lng: 43.678, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-mosul',      label: 'Mosul',              sublabel: 'PMF presence, north Iraq',        lat: 36.340, lng: 43.130, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-kirkuk',     label: 'Kirkuk',             sublabel: 'PMF contested area',              lat: 35.468, lng: 44.392, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-fallujah',   label: 'Fallujah',           sublabel: 'Kata\'ib area, Anbar',            lat: 33.350, lng: 43.776, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-jurf',       label: 'Jurf al-Sakhar',     sublabel: 'PMF fort, closed military zone',  lat: 32.649, lng: 44.111, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
      { id: 'iq-diwaniyah',  label: 'Diwaniyah',         sublabel: 'PMF stronghold, south Iraq',      lat: 31.989, lng: 44.929, group: 'IRAQ — PMF / PRO-IRAN MILITIA' },
    ]
  },
  {
    group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS',
    sites: [
      { id: 'sy-damascus',   label: 'Damascus',           sublabel: 'IRGC HQ Syria, T4/Mezzeh base',  lat: 33.510, lng: 36.291, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-albukamal',  label: 'Al-Bukamal',         sublabel: 'Iraq border, IRGC land corridor', lat: 34.462, lng: 40.930, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-deir-ezzor', label: 'Deir ez-Zor',        sublabel: 'IRGC garrison, Euphrates',        lat: 35.336, lng: 40.139, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-palmyra',    label: 'Palmyra (T4 base)',  sublabel: 'T4 air base, Iran-Russia use',    lat: 34.562, lng: 38.283, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-homs',       label: 'Homs',               sublabel: 'IRGC logistics hub',              lat: 34.730, lng: 36.710, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-aleppo',     label: 'Aleppo',             sublabel: 'Hezbollah/IRGC presence',        lat: 36.202, lng: 37.161, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-latakia',    label: 'Latakia',            sublabel: 'Hmaimim air base (Russian/Iran)',  lat: 35.524, lng: 35.791, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
      { id: 'sy-zabadani',   label: 'Zabadani',           sublabel: 'Hezbollah stronghold, Qalamoun',  lat: 33.722, lng: 36.097, group: 'SYRIA — IRGC / HEZBOLLAH POSITIONS' },
    ]
  },
  {
    group: 'LEBANON — HEZBOLLAH',
    sites: [
      { id: 'lb-baalbek',    label: 'Baalbek',            sublabel: 'Hezbollah capital, missile stores',lat: 34.004, lng: 36.210, group: 'LEBANON — HEZBOLLAH' },
      { id: 'lb-beirut-south',label:'Beirut South Suburbs',sublabel: 'Dahieh, Hezbollah HQ',           lat: 33.855, lng: 35.488, group: 'LEBANON — HEZBOLLAH' },
      { id: 'lb-tyre',       label: 'Tyre (Sour)',        sublabel: 'South Lebanon, coastal access',   lat: 33.271, lng: 35.194, group: 'LEBANON — HEZBOLLAH' },
      { id: 'lb-bintjbeil',  label: 'Bint Jbeil',         sublabel: 'Hezbollah stronghold, south',     lat: 33.115, lng: 35.432, group: 'LEBANON — HEZBOLLAH' },
      { id: 'lb-hermel',     label: 'Hermel',             sublabel: 'Bekaa valley, Hezbollah base',    lat: 34.394, lng: 36.389, group: 'LEBANON — HEZBOLLAH' },
      { id: 'lb-nabatieh',   label: 'Nabatieh',           sublabel: 'South Lebanon command',           lat: 33.378, lng: 35.483, group: 'LEBANON — HEZBOLLAH' },
    ]
  },
  {
    group: 'YEMEN — HOUTHI (ANSARALLAH)',
    sites: [
      { id: 'ye-sanaa',      label: 'Sana\'a',            sublabel: 'Houthi capital, missile command', lat: 15.369, lng: 44.191, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-sadah',      label: 'Sa\'dah',            sublabel: 'Houthi heartland, north Yemen',   lat: 16.940, lng: 43.760, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-hodeidah',   label: 'Hodeidah',           sublabel: 'Red Sea port, missile launch site',lat: 14.798, lng: 42.954, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-hajjah',     label: 'Hajjah',             sublabel: 'Northwest Yemen, drone ops',      lat: 15.693, lng: 43.603, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-dhamar',     label: 'Dhamar',             sublabel: 'Central Yemen, Houthi control',   lat: 14.542, lng: 44.404, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-amran',      label: 'Amran',              sublabel: 'North Yemen, Houthi territory',   lat: 15.659, lng: 43.943, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-taiz',       label: 'Taiz',               sublabel: 'Contested, Houthi siege lines',   lat: 13.578, lng: 44.021, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
      { id: 'ye-ras-isa',    label: 'Ras Isa',            sublabel: 'Oil terminal, Houthi naval ops',  lat: 15.100, lng: 42.860, group: 'YEMEN — HOUTHI (ANSARALLAH)' },
    ]
  },
  {
    group: 'GAZA / WEST BANK',
    sites: [
      { id: 'gz-rafah',      label: 'Rafah',              sublabel: 'Gaza south, tunnel network',      lat: 31.296, lng: 34.242, group: 'GAZA / WEST BANK' },
      { id: 'gz-khan-younis',label: 'Khan Younis',        sublabel: 'Gaza south command',              lat: 31.344, lng: 34.306, group: 'GAZA / WEST BANK' },
      { id: 'gz-city',       label: 'Gaza City',          sublabel: 'Hamas/PIJ political center',      lat: 31.525, lng: 34.466, group: 'GAZA / WEST BANK' },
      { id: 'gz-jabaliya',   label: 'Jabalia',            sublabel: 'North Gaza, launch sites',        lat: 31.530, lng: 34.482, group: 'GAZA / WEST BANK' },
    ]
  },
];

// Flat list for easy lookup
export const ALL_LAUNCH_SITES: LaunchSite[] = LAUNCH_SITE_GROUPS.flatMap(g => g.sites);

// Legacy compat for existing code
export const LAUNCH_SITES = {
  WESTERN_IRAN: { lat: 33.637, lng: 46.422, label: 'Ilam (IRGC)' },
  HORMUZ: { lat: 27.183, lng: 56.270, label: 'Bandar Abbas' },
  YEMEN: { lat: 15.369, lng: 44.191, label: 'Sana\'a (Houthi)' }
} as const;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

import type { InfraNode } from '../types';
export function nodesWithinRadius(nodes: InfraNode[], originLat: number, originLng: number, radiusKm: number): string[] {
  return nodes
    .filter(n => haversineKm(originLat, originLng, n.lat, n.lng) <= radiusKm)
    .map(n => n.id);
}
