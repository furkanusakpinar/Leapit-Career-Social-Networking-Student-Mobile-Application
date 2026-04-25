import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const companyDomainMap = {
  'Google': 'google.com',
  'Microsoft': 'microsoft.com',
  'Apple': 'apple.com',
  'Amazon': 'amazon.com',
  'Meta_Facebook_Instagram': 'meta.com',
  'Tesla': 'tesla.com',
  'SpaceX': 'spacex.com',
  'Turkcell': 'turkcell.com.tr',
  'Vodafone': 'vodafone.com.tr',
  'Türk Telekom': 'turktelekom.com.tr',
  'Arçelik': 'arcelik.com.tr',
  'Bim': 'bim.com.tr',
  'Vestel': 'vestel.com.tr',
  'Samsung': 'samsung.com',
  'Huawei': 'huawei.com',
  'Sony': 'sony.com',
  'Siemens': 'siemens.com',
  'Bosch': 'bosch.com',
  'Philips': 'philips.com',
  'General Electric': 'ge.com',
  'Ford': 'ford.com',
  'Toyota': 'toyota.com',
  'Volkswagen': 'vw.com',
  'BMW': 'bmw.com',
  'Mercedes-Benz': 'mercedes-benz.com',
  'Hyundai': 'hyundai.com',
  'Renault': 'renault.com',
  'PepsiCo': 'pepsico.com',
  'Coca-Cola': 'coca-cola.com',
  'Unilever': 'unilever.com',
  'Procter & Gamble': 'pg.com',
  'Nestle': 'nestle.com',
  'Danone': 'danone.com',
  'Garanti BBVA': 'garantibbva.com.tr',
  'İş Bankası': 'isbank.com.tr',
  'Akbank': 'akbank.com',
  'Yapı Kredi': 'yapikredi.com.tr',
  'Ziraat Bankası': 'ziraatbank.com.tr',
  'Halkbank': 'halkbank.com.tr',
  'Vakıfbank': 'vakifbank.com.tr',
  'THY - Türk Hava Yolları': 'thy.com',
  'Pegasus Hava Yolları': 'flypgs.com',
  'SunExpress': 'sunexpress.com',
  'Eczacıbaşı Holding': 'eczacibasi.com.tr',
  'Koç Holding': 'koc.com.tr',
  'Sabancı Holding': 'sabanci.com',
  'Doğan Holding': 'doganholding.com.tr',
  'Yıldız Holding': 'yildizholding.com.tr',
  'Migros': 'migros.com.tr',
  'CarrefourSA': 'carrefoursa.com',
  'Şok Marketler': 'sokmarket.com.tr',
  'A101': 'a101.com.tr',
  'Getir': 'getir.com',
  'Yemeksepeti': 'yemeksepeti.com',
  'Trendyol': 'trendyol.com',
  'Hepsiburada': 'hepsiburada.com',
  'N11': 'n11.com',
  'ASELSAN': 'aselsan.com.tr',
  'TUSAŞ': 'tusas.com',
  'ROKETSAN': 'roketsan.com.tr',
  'HAVELSAN': 'havelsan.com.tr',
  'FNSS': 'fnss.com.tr',
  'JobsCheck': 'jobscheck.com.tr',
  'Gürcom': 'gurcomyazilim.com',
  'DarkHost': 'darkhost.com.tr',
  'AlanyaNet': 'alanyanet.com.tr',
  'BKM': 'bkm.com.tr',
  'Param': 'param.com.tr',
  'Papara': 'papara.com',
  'İyzico': 'iyzico.com',
  'MediaMarkt': 'mediamarkt.com.tr',
  'Teknosa': 'teknosa.com',
  'Vatan Bilgisayar': 'vatanbilgisayar.com',
  'LC Waikiki': 'lcwaikiki.com',
  'DeFacto': 'defacto.com.tr',
  'Mavi': 'mavi.com',
  'Colin\'s': 'colins.com.tr',
  'Koton': 'koton.com',
  'Anadolu Efes': 'anadoluefes.com',
  'Coca-Cola İçecek': 'cci.com.tr',
  'Efes Pilsen': 'efespilsen.com.tr',
  'Emlak Konut GYO': 'emlakkonut.com.tr',
  'Sinpaş GYO': 'sinpasgyo.com',
  'Torunlar GYO': 'torunlar.com.tr',
  'Doğuş Otomotiv': 'dogusotomotiv.com.tr',
  'Tofaş': 'tofas.com.tr',
  'Oyak Renault': 'oyakrenault.com',
  'TPI Kompozit': 'tpi-composites.com',
  'Çimsa': 'cimsa.com.tr',
  'Akçansa': 'akcansa.com.tr',
  'Netflix': 'netflix.com',
  'Spotify': 'spotify.com',
  'Amazon Web Services (AWS)': 'aws.amazon.com',
  'Microsoft Azure': 'azure.microsoft.com',
  'Google Cloud Platform (GCP)': 'cloud.google.com',
  'IBM': 'ibm.com',
  'Oracle': 'oracle.com',
  'SAP': 'sap.com',
  'Adobe': 'adobe.com',
  'Salesforce': 'salesforce.com',
  'JPMorgan Chase': 'jpmorganchase.com',
  'Goldman Sachs': 'goldmansachs.com',
  'Bank of America': 'bankofamerica.com',
  'Citigroup': 'citigroup.com',
  'HSBC': 'hsbc.com',
  'BP': 'bp.com',
  'Shell': 'shell.com',
  'ExxonMobil': 'exxonmobil.com',
  'Chevron': 'chevron.com',
  'Pfizer': 'pfizer.com',
  'Johnson & Johnson': 'jnj.com',
  'Roche': 'roche.com',
  'Novartis': 'novartis.com',
  'Merck & Co': 'merck.com',
  'Accenture': 'accenture.com',
  'Deloitte': 'deloitte.com',
  'EY': 'ey.com',
  'KPMG': 'kpmg.com',
  'PwC': 'pwc.com',
  'McKinsey & Company': 'mckinsey.com',
  'Boston_Consulting_Group_BCG': 'bcg.com',
  'Bain & Company': 'bain.com',
  'Lufthansa': 'lufthansa.com',
  'Emirates': 'emirates.com',
  'Qatar Airways': 'qatarairways.com',
  'British Airways': 'britishairways.com',
  'Mars': 'mars.com',
  'Kraft Heinz': 'kraftheinzcompany.com',
  'Coca-Cola Company': 'coca-colacompany.com',
  'Red Bull': 'redbull.com',
  'Monster Beverage': 'monsterbevcorp.com',
  'Nike': 'nike.com',
  'Adidas': 'adidas.com',
  'Under Armour': 'underarmour.com',
  'Puma': 'puma.com',
  'Starbucks': 'starbucks.com',
  'McDonald\'s': 'mcdonalds.com',
  'KFC': 'kfc.com',
  'Burger King': 'bk.com',
  'Subway': 'subway.com',
  'Marriott International': 'marriott.com',
  'Hilton Worldwide': 'hilton.com',
  'Accor': 'group.accor.com',
  'Hyatt Hotels': 'hyatt.com',
};

export const companyNames = Object.keys(companyDomainMap);


let remoteCompanyMapCache = null;

async function fetchRemoteCompanyMap() {
  if (remoteCompanyMapCache) return remoteCompanyMapCache;
  try {
    const ref = doc(db, 'companyDomainMap', 'QGNT1HAF7DDnrp7B6kvo');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    
    const mapCandidate = data.companyData || data.companies || data.map || data;
    if (mapCandidate && typeof mapCandidate === 'object') {
      remoteCompanyMapCache = mapCandidate;
      return remoteCompanyMapCache;
    }
  } catch (e) {
    console.warn('companyDomainMap fetch failed:', e);
  }
  return null;
}

export async function getCompanyLogoUri(companyName) {
  const name = companyName?.trim();
  if (!name) return null;
  if (name === 'JobsCheck') {
    return 'https://jobscheck.com.tr/JobsCheckLogo.png';
  }

  
  const localDomain = companyDomainMap[name];
  if (localDomain) return `https://logo.clearbit.com/${localDomain}`;

  
  const remoteMap = await fetchRemoteCompanyMap();
  const domain = remoteMap ? remoteMap[name] : null;
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}