/** Holds risky public text for a person to review. It does not refuse the submission. */

import { risky } from "./moderation.js";

const PROFANITY =
  /\b(?:fuck(?:ing|ed|er|s)?|motherfucker|cunt|shit(?:ty|s)?|bullshit|asshole|arsehole|dickhead|wanker|bastard|bitch(?:es)?|slut|whore|nigger|nigga|faggot|fag|retard|retarded|spastic|chink|coon|kike|abo)\b/i;

const SELF_HARM =
  /\b(?:suicid\w*|self[-\s]?harm\w*|kill myself|kms|end my life|want to die|wanna die|better off dead|do not want to live|don't want to live|dont want to live)\b/i;

const WARD =
  /\b(?:ward|unit|wing)\s*[a-z]?\d{1,2}[a-z]?\b|\b(?:ward|unit|wing)\s+\d{1,2}[a-z]?\b|\b\d{1,2}[a-z]\s+(?:ward|unit)\b/i;

const BED = /\bbeds?\s*(?:no\.?|number|#)?\s*\d{1,4}[a-z]?\b/i;

const MRN = /\b(?:mrn|u\.?r\.?n\.?)\s*[:#-]?\s*\d{4,12}\b/i;

const DOB =
  /\b(?:d\.?\s?o\.?\s?b\.?|date of birth|born on)\b|\b(?:0?[1-9]|[12]\d|3[01])[\/\-.](?:0?[1-9]|1[0-2])[\/\-.](?:19|20)\d{2}\b/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const PHONE = /(?:\+?61|0)\d[\d\s()-]{7,}/;

const CLINICIAN = /\b(?:[Dd]r|[Dd]octor|RN|RM|[Nn]urse|[Mm]idwife)\.?\s+[A-Z][a-z]{2,}\b/;

const LINK = /https?:\/\//i;

const LONG_NUMBER = /\b\d{8,}\b/;

const NAME_STOP = new Set(
  `monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december
  royal prince alfred melbourne sydney brisbane perth adelaide hobart darwin canberra australia australian
  hospital health local district service public private medical general base community regional university
  children childrens women woman gold coast sunshine central northern southern western eastern north south east west new wales
  nurse midwife doctor student graduate grad night shift thank thanks please hello only scrubs good morning afternoon evening
  pen pens coffee scrub scrubs the and for with from this that when what your they them were will just not
  victoria queensland tasmania nsw qld vic wa sa act nt healthdirect fairwork`.split(/\s+/)
);

const SERVICES = [
  "Royal Prince Alfred",
  "RPA",
  "Prince of Wales Hospital",
  "Royal North Shore",
  "RNSH",
  "Westmead",
  "Liverpool Hospital",
  "Nepean Hospital",
  "Blacktown Hospital",
  "Concord Hospital",
  "Canterbury Hospital",
  "Royal Hospital for Women",
  "Sydney Children's Hospital",
  "Children's Hospital at Westmead",
  "John Hunter",
  "Wollongong Hospital",
  "Gosford Hospital",
  "Lismore Base",
  "Tamworth Hospital",
  "Orange Health Service",
  "Dubbo Hospital",
  "Bankstown-Lidcombe",
  "Campbelltown Hospital",
  "Fairfield Hospital",
  "St George Hospital",
  "Sutherland Hospital",
  "Hornsby Hospital",
  "St Vincent's",
  "Royal Melbourne",
  "RMH",
  "The Alfred",
  "Alfred Health",
  "Alfred Hospital",
  "Austin Health",
  "Austin Hospital",
  "Monash Medical",
  "Monash Health",
  "Monash Children's",
  "Royal Women's Hospital",
  "Royal Children's Hospital",
  "Sunshine Hospital",
  "Footscray Hospital",
  "Western Health",
  "Northern Health",
  "Eastern Health",
  "Peninsula Health",
  "Barwon Health",
  "Box Hill Hospital",
  "Frankston Hospital",
  "Peter MacCallum",
  "Peter Mac",
  "Ballarat Base",
  "Bendigo Hospital",
  "Royal Brisbane",
  "RBWH",
  "Princess Alexandra",
  "Mater Hospital",
  "Mater Mothers",
  "Mater Brisbane",
  "Queensland Children's Hospital",
  "Gold Coast University Hospital",
  "GCUH",
  "Logan Hospital",
  "Ipswich Hospital",
  "Townsville University Hospital",
  "Townsville Hospital",
  "Cairns Hospital",
  "Sunshine Coast University Hospital",
  "The Prince Charles Hospital",
  "Prince Charles Hospital",
  "Queen Elizabeth II Jubilee",
  "Robina Hospital",
  "Royal Perth",
  "RPH",
  "Fiona Stanley",
  "FSH",
  "Sir Charles Gairdner",
  "SCGH",
  "King Edward Memorial",
  "Perth Children's Hospital",
  "Fremantle Hospital",
  "Joondalup Health Campus",
  "Royal Adelaide",
  "RAH",
  "Flinders Medical Centre",
  "The Queen Elizabeth Hospital",
  "Queen Elizabeth Hospital",
  "Women's and Children's Hospital",
  "Lyell McEwin",
  "Modbury Hospital",
  "Royal Hobart",
  "Launceston General",
  "North West Regional Hospital",
  "Mersey Community Hospital",
  "Canberra Hospital",
  "North Canberra Hospital",
  "University of Canberra Hospital",
  "Canberra Health Services",
  "Royal Darwin",
  "Palmerston Regional Hospital",
  "Alice Springs Hospital",
  "Katherine Hospital",
  "Gove District Hospital",
  "Tennant Creek Hospital",
  "Sydney Local Health District",
  "South Eastern Sydney",
  "South Western Sydney",
  "Western Sydney Local Health",
  "Northern Sydney Local Health",
  "Nepean Blue Mountains",
  "Illawarra Shoalhaven",
  "Hunter New England",
  "Mid North Coast Local Health",
  "Northern NSW Local Health",
  "Murrumbidgee",
  "Sydney Children's Hospitals Network",
  "Metro North Health",
  "Metro South Health",
  "Gold Coast Health",
  "West Moreton Health",
  "Darling Downs Health",
  "Cairns and Hinterland",
  "East Metropolitan Health Service",
  "North Metropolitan Health Service",
  "South Metropolitan Health Service",
  "WA Country Health",
  "Central Adelaide Local Health",
  "Northern Adelaide Local Health",
  "Southern Adelaide Local Health",
  "Women's and Children's Health Network",
  "NSW Health",
  "Queensland Health",
  "SA Health",
  "NT Health",
  "Tasmanian Health Service",
  "local health district",
  "local health network",
  "hospital and health service"
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HOSPITALS = new RegExp(
  SERVICES.map((name) => `(?<![A-Za-z])${escapeRegExp(name).replace(/\s+/g, "\\s+")}(?![A-Za-z])`).join("|"),
  "i"
);

export function supportNotice() {
  return {
    message:
      "If you are struggling or thinking about suicide, please reach out now. This post has been held for a moderator and will not be published as it is. If you are in immediate danger in Australia, call 000.",
    lines: [
      { name: "Emergency", phone: "000", href: "tel:000" },
      { name: "Lifeline", phone: "13 11 14", href: "https://www.lifeline.org.au/get-help/" },
      { name: "Nurse & Midwife Support", phone: "1800 667 877", href: "https://www.nmsupport.org.au/" },
      { name: "Beyond Blue", phone: "1300 22 4636", href: "https://www.beyondblue.org.au/get-support" },
      { name: "13YARN", phone: "13 92 76", href: "https://www.13yarn.org.au/" }
    ]
  };
}

function hasPersonalName(text) {
  const pairs = String(text || "").match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+\b/g) || [];
  for (const pair of pairs) {
    const meaningful = pair.split(/\s+/).filter((part) => !NAME_STOP.has(part.toLowerCase()));
    if (meaningful.length >= 2) return true;
  }
  const introduced = String(text || "").match(/\bmy name is\s+([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})+)/i);
  if (!introduced) return false;
  const meaningful = introduced[1].split(/\s+/).filter((part) => !NAME_STOP.has(part.toLowerCase()));
  return meaningful.length >= 2;
}

export function screenText(text) {
  const value = String(text || "");
  const reasons = [];
  const add = (code, label) => {
    if (!reasons.some((item) => item.code === code)) reasons.push({ code, label });
  };
  if (PROFANITY.test(value)) add("profanity", "Profanity or slur");
  if (SELF_HARM.test(value)) add("self-harm", "Possible self-harm language");
  if (HOSPITALS.test(value)) add("hospital", "Hospital or health service name");
  if (WARD.test(value)) add("ward", "Ward or unit number");
  if (BED.test(value)) add("bed", "Bed number");
  if (MRN.test(value)) add("mrn", "MRN, URN or similar number");
  if (DOB.test(value)) add("dob", "Date of birth");
  if (EMAIL.test(value)) add("email", "Email address");
  if (PHONE.test(value)) add("phone", "Phone number");
  if (CLINICIAN.test(value)) add("clinician", "Named clinician");
  if (hasPersonalName(value)) add("name", "Possible full name");
  if (LINK.test(value)) add("link", "Web link");
  if (LONG_NUMBER.test(value)) add("number", "Long identifying number");
  if (risky(value)) add("clinical", "Possible patient, workplace or clinical wording");
  const selfHarm = reasons.some((item) => item.code === "self-harm");
  return {
    flagged: reasons.length > 0,
    reasons,
    flagReason: reasons.map((item) => item.label).join("; "),
    selfHarm,
    support: selfHarm ? supportNotice() : null
  };
}

export function attachScreen(record, screen) {
  return {
    ...record,
    flagged: Boolean(screen.flagged),
    flagReason: screen.flagReason || "",
    flagCodes: (screen.reasons || []).map((item) => item.code)
  };
}
