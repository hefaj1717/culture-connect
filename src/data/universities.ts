import type { CityId } from '@/data/culture';

export type University = {
  description: string;
  id: string;
  cityId: CityId;
  name: string;
  shortName: string;
  domains: string[];
};

export const universities: University[] = [
  {
    description: 'A historic Lublin university where students connect culture, ideas, and city life.',
    id: 'kul',
    cityId: 'lublin',
    name: 'The John Paul II Catholic University of Lublin',
    shortName: 'KUL',
    domains: ['kul.pl', 'student.kul.pl'],
  },
  {
    description: 'A large public university community at the heart of student life in Lublin.',
    id: 'umcs',
    cityId: 'lublin',
    name: 'Maria Curie-Sklodowska University',
    shortName: 'UMCS',
    domains: ['umcs.pl', 'student.umcs.pl'],
  },
  {
    description: 'A hands-on technology campus bringing engineering students into the city’s cultural life.',
    id: 'pollub',
    cityId: 'lublin',
    name: 'Lublin University of Technology',
    shortName: 'Politechnika Lubelska',
    domains: ['pollub.pl', 'student.pollub.pl'],
  },
  {
    description: 'A medical university community exploring the city beyond lectures and clinical practice.',
    id: 'umlub',
    cityId: 'lublin',
    name: 'Medical University of Lublin',
    shortName: 'UMLub',
    domains: ['umlub.pl', 'student.umlub.pl'],
  },
  {
    description: 'A Lublin campus community rooted in nature, science, and local culture.',
    id: 'up-lublin',
    cityId: 'lublin',
    name: 'University of Life Sciences in Lublin',
    shortName: 'UP Lublin',
    domains: ['up.lublin.pl', 'student.up.lublin.pl'],
  },
  {
    description: 'An entrepreneurial Lublin university community discovering the city together.',
    id: 'wsei-lublin',
    cityId: 'lublin',
    name: 'University of Economics and Innovation in Lublin',
    shortName: 'WSEI',
    domains: ['wsei.lublin.pl', 'student.wsei.lublin.pl'],
  },
  {
    description: 'An international-minded Lublin campus community for curious city explorers.',
    id: 'vpu-lublin',
    cityId: 'lublin',
    name: 'Vincent Pol University in Lublin',
    shortName: 'VPU',
    domains: ['vpu.edu.pl', 'student.vpu.edu.pl'],
  },
  {
    description: 'A close-knit Lublin university community combining learning, enterprise, and culture.',
    id: 'wspa-lublin',
    cityId: 'lublin',
    name: 'University College of Enterprise and Administration in Lublin',
    shortName: 'WSPA',
    domains: ['wspa.pl', 'student.wspa.pl'],
  },
  {
    description: 'A Leuven university community connecting research, student life, and local culture.',
    id: 'ku-leuven',
    cityId: 'leuven',
    name: 'KU Leuven',
    shortName: 'KU Leuven',
    domains: ['kuleuven.be', 'student.kuleuven.be'],
  },
  {
    description: 'A practical Leuven student community discovering culture beyond the classroom.',
    id: 'ucll',
    cityId: 'leuven',
    name: 'UCLL University of Applied Sciences',
    shortName: 'UCLL',
    domains: ['ucll.be', 'student.ucll.be'],
  },
  {
    description: 'A creative Leuven campus community exploring art, design, and the city.',
    id: 'luca-leuven',
    cityId: 'leuven',
    name: 'LUCA School of Arts',
    shortName: 'LUCA',
    domains: ['luca-arts.be', 'student.luca-arts.be'],
  },
  {
    description: 'A Leuven academic community bringing thoughtful conversations into the city.',
    id: 'etf-leuven',
    cityId: 'leuven',
    name: 'Evangelical Theological Faculty Leuven',
    shortName: 'ETF Leuven',
    domains: ['etf.edu', 'student.etf.edu'],
  },
  {
    description: 'A business-school community exploring Leuven’s ideas, people, and culture together.',
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
