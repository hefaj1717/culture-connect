import type { CityId } from '@/data/culture';

export type University = {
  id: string;
  cityId: CityId;
  name: string;
  shortName: string;
  domains: string[];
};

export const universities: University[] = [
  {
    id: 'kul',
    cityId: 'lublin',
    name: 'The John Paul II Catholic University of Lublin',
    shortName: 'KUL',
    domains: ['kul.pl', 'student.kul.pl'],
  },
  {
    id: 'umcs',
    cityId: 'lublin',
    name: 'Maria Curie-Sklodowska University',
    shortName: 'UMCS',
    domains: ['umcs.pl', 'student.umcs.pl'],
  },
  {
    id: 'pollub',
    cityId: 'lublin',
    name: 'Lublin University of Technology',
    shortName: 'Politechnika Lubelska',
    domains: ['pollub.pl', 'student.pollub.pl'],
  },
  {
    id: 'umlub',
    cityId: 'lublin',
    name: 'Medical University of Lublin',
    shortName: 'UMLub',
    domains: ['umlub.pl', 'student.umlub.pl'],
  },
  {
    id: 'up-lublin',
    cityId: 'lublin',
    name: 'University of Life Sciences in Lublin',
    shortName: 'UP Lublin',
    domains: ['up.lublin.pl', 'student.up.lublin.pl'],
  },
  {
    id: 'wsei-lublin',
    cityId: 'lublin',
    name: 'University of Economics and Innovation in Lublin',
    shortName: 'WSEI',
    domains: ['wsei.lublin.pl', 'student.wsei.lublin.pl'],
  },
  {
    id: 'vpu-lublin',
    cityId: 'lublin',
    name: 'Vincent Pol University in Lublin',
    shortName: 'VPU',
    domains: ['vpu.edu.pl', 'student.vpu.edu.pl'],
  },
  {
    id: 'wspa-lublin',
    cityId: 'lublin',
    name: 'University College of Enterprise and Administration in Lublin',
    shortName: 'WSPA',
    domains: ['wspa.pl', 'student.wspa.pl'],
  },
  {
    id: 'ku-leuven',
    cityId: 'leuven',
    name: 'KU Leuven',
    shortName: 'KU Leuven',
    domains: ['kuleuven.be', 'student.kuleuven.be'],
  },
  {
    id: 'ucll',
    cityId: 'leuven',
    name: 'UCLL University of Applied Sciences',
    shortName: 'UCLL',
    domains: ['ucll.be', 'student.ucll.be'],
  },
  {
    id: 'luca-leuven',
    cityId: 'leuven',
    name: 'LUCA School of Arts',
    shortName: 'LUCA',
    domains: ['luca-arts.be', 'student.luca-arts.be'],
  },
  {
    id: 'etf-leuven',
    cityId: 'leuven',
    name: 'Evangelical Theological Faculty Leuven',
    shortName: 'ETF Leuven',
    domains: ['etf.edu', 'student.etf.edu'],
  },
  {
    id: 'vlerick-leuven',
    cityId: 'leuven',
    name: 'Vlerick Business School - Leuven campus',
    shortName: 'Vlerick',
    domains: ['vlerick.com', 'student.vlerick.com'],
  },
];

export function getUniversitiesForCity(cityId: CityId) {
  return universities.filter((university) => university.cityId === cityId);
}

export function getUniversityById(id?: string | null) {
  if (!id) return null;
  return universities.find((university) => university.id === id) ?? null;
}
