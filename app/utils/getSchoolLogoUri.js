import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const schoolDomainMap = {
  
  'Boğaziçi Üniversitesi': 'boun.edu.tr',
  'Orta Doğu Teknik Üniversitesi': 'metu.edu.tr',
  'İstanbul Teknik Üniversitesi': 'itu.edu.tr',
  'Hacettepe Üniversitesi': 'hacettepe.edu.tr',
  'Marmara Üniversitesi': 'marmara.edu.tr',
  'Yıldız Teknik Üniversitesi': 'yildiz.edu.tr',
  'Ankara Üniversitesi': 'ankara.edu.tr',
  'Gazi Üniversitesi': 'gazi.edu.tr',
  'Dokuz Eylül Üniversitesi': 'deu.edu.tr',
  'Ege Üniversitesi': 'ege.edu.tr',
  'izmir yüksek teknoloji enstitüsü': 'iyte.edu.tr',
  'Karadeniz Teknik Üniversitesi': 'ktu.edu.tr',
  'Selçuk Üniversitesi': 'selcuk.edu.tr',
  'Erciyes Üniversitesi': 'erciyes.edu.tr',
  'Akdeniz Üniversitesi': 'akdeniz.edu.tr',
  'Çukurova Üniversitesi': 'cukurova.edu.tr',
  'Koç Üniversitesi': 'ku.edu.tr',
  'Sabancı Üniversitesi': 'sabanciuniv.edu',
  'Bilkent Üniversitesi': 'bilkent.edu.tr',
  'Galatasaray Üniversitesi': 'gsu.edu.tr',
  'İstanbul Üniversitesi': 'istanbul.edu.tr',
  'Yeditepe Üniversitesi': 'yeditepe.edu.tr',
  'Bahçeşehir Üniversitesi': 'bau.edu.tr',
  'Işık Üniversitesi': 'isikun.edu.tr',
  'Özyeğin Üniversitesi': 'ozyegin.edu.tr',
  'TOBB ETÜ': 'etu.edu.tr',
  'Kadir Has Üniversitesi': 'khas.edu.tr',

  
  'Harvard University': 'harvard.edu',
  'Stanford University': 'stanford.edu',
  'MIT': 'mit.edu',
  'Oxford University': 'ox.ac.uk',
  'Cambridge University': 'cam.ac.uk',
  'Yale University': 'yale.edu',
  'Princeton University': 'princeton.edu',
  'UCLA': 'ucla.edu',
  'UC Berkeley': 'berkeley.edu',
  'Columbia University': 'columbia.edu',
  'University of Chicago': 'uchicago.edu',
  'University of Toronto': 'utoronto.ca',
  'ETH Zurich': 'ethz.ch',
  'Imperial College London': 'imperial.ac.uk',
  'National University of Singapore': 'nus.edu.sg',
  'Tsinghua University': 'tsinghua.edu.cn',

  
  'Ankara Atatürk Lisesi': 'ankara.meb.k12.tr',
  'İstanbul Erkek Lisesi': 'istanbulerkeklisesi.k12.tr',
  'Kabataş Erkek Lisesi': 'kabataserkeklisesi.k12.tr',
  'Galatasaray Lisesi': 'galatasaraylisesi.k12.tr',
  'Robert Kolej': 'robertcollege.org',
  'Saint Joseph Lisesi': 'saintjoseph.k12.tr',
  'Üsküdar Amerikan Lisesi': 'uskudaramerican.k12.tr',
  'İzmir Fen Lisesi': 'izmirfl.meb.k12.tr',
  'İstanbul Fen Lisesi': 'istanbulfl.meb.k12.tr',
  'Bornova Anadolu Lisesi': 'bal.meb.k12.tr',
  'TED Ankara Koleji': 'tedankara.k12.tr',
  'Beşiktaş Anadolu Lisesi': 'besiktasanadolulisesi.meb.k12.tr',
  'Kadıköy Anadolu Lisesi': 'kal.k12.tr',
  'Sainte Pulchérie Fransız Lisesi': 'saintepulcherie.k12.tr',
  'Notre Dame de Sion': 'nds.k12.tr',
  'Alanya Mesleki ve Teknik Anadolu Lisesi': 'alanyamtal.meb.k12.tr',

  
  'Phillips Exeter Academy': 'exeter.edu',
  'Phillips Academy Andover': 'andover.edu',
  'Eton College': 'etoncollege.com',
  'Harrow School': 'harrowschool.org.uk',
  'Stuyvesant High School': 'stuy.enschool.org',
  'Raffles Institution': 'raffles.edu.sg'
};

export const schoolNames = Object.keys(schoolDomainMap);


let remoteSchoolMapCache = null;

async function fetchRemoteSchoolMap() {
  if (remoteSchoolMapCache) return remoteSchoolMapCache;
  try {
    const ref = doc(db, 'schoolDomainMap', 'UyLeiZRGBdxXLYqqqbVg');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    
    const mapCandidate = data.schoolData || data.schools || data.map || data;
    if (mapCandidate && typeof mapCandidate === 'object') {
      remoteSchoolMapCache = mapCandidate;
      return remoteSchoolMapCache;
    }
  } catch (e) {
    console.warn('schoolDomainMap fetch failed:', e);
  }
  return null;
}

export async function getSchoolLogoUri(schoolName) {
  const name = schoolName?.trim();
  if (!name) return null;

  const lowerName = name.toLowerCase();

  const exactKey = Object.keys(schoolDomainMap).find(
    k => k.toLowerCase() === lowerName
  );
  if (exactKey) {
    return `https://logos.hunter.io/${schoolDomainMap[exactKey]}`;
  }

  const fuzzyKey = Object.keys(schoolDomainMap).find(
    k => k.toLowerCase().includes(lowerName) || lowerName.includes(k.toLowerCase())
  );
  if (fuzzyKey) {
    return `https://logos.hunter.io/${schoolDomainMap[fuzzyKey]}`;
  }

  const remoteMap = await fetchRemoteSchoolMap();
  if (remoteMap) {
    const remoteExactKey = Object.keys(remoteMap).find(
      k => k.toLowerCase() === lowerName
    );
    if (remoteExactKey) {
      return `https://logos.hunter.io/${remoteMap[remoteExactKey]}`;
    }
    const remoteFuzzyKey = Object.keys(remoteMap).find(
      k => k.toLowerCase().includes(lowerName) || lowerName.includes(k.toLowerCase())
    );
    if (remoteFuzzyKey) {
      return `https://logos.hunter.io/${remoteMap[remoteFuzzyKey]}`;
    }
  }

  const cleanDomain = lowerName.replace(/[^a-z0-9]/g, '');
  if (cleanDomain.length > 1) {
    return `https://logos.hunter.io/${cleanDomain}.edu`;
  }

  return null;
}