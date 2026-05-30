import { format } from 'date-fns'

const BN_DAYS_SHORT  = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি']
const BN_DAYS_LONG   = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার']
const BN_MONTHS_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
const BN_MONTHS_LONG  = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

const EN_DIGITS = '0123456789'
const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

export function toBnDigits(n: number | string): string {
  return String(n).split('').map(c => {
    const i = EN_DIGITS.indexOf(c)
    return i >= 0 ? BN_DIGITS[i] : c
  }).join('')
}

export function fmtDateBn(d: Date, form: 'short' | 'long' | 'daymonth' | 'full' = 'daymonth'): string {
  const day   = d.getDay()
  const date  = d.getDate()
  const month = d.getMonth()
  const year  = d.getFullYear()

  if (form === 'short') return `${BN_DAYS_SHORT[day]}, ${toBnDigits(date)} ${BN_MONTHS_SHORT[month]}`
  if (form === 'long')  return `${BN_DAYS_LONG[day]}, ${toBnDigits(date)} ${BN_MONTHS_LONG[month]} ${toBnDigits(year)}`
  if (form === 'daymonth') return `${BN_DAYS_LONG[day]}, ${toBnDigits(date)} ${BN_MONTHS_SHORT[month]}`
  return `${toBnDigits(date)} ${BN_MONTHS_SHORT[month]} ${toBnDigits(year)}`
}

export function fmtDayShort(d: Date, lang: 'en' | 'bn'): string {
  return lang === 'bn' ? BN_DAYS_SHORT[d.getDay()] : format(d, 'EEE')
}

export function fmtDayFull(d: Date, lang: 'en' | 'bn'): string {
  return lang === 'bn' ? BN_DAYS_LONG[d.getDay()] : format(d, 'EEEE')
}

export function fmtMonthDay(d: Date, lang: 'en' | 'bn'): string {
  if (lang === 'bn') return `${toBnDigits(d.getDate())} ${BN_MONTHS_SHORT[d.getMonth()]}`
  return format(d, 'MMM d')
}

export function fmtMonthYear(d: Date, lang: 'en' | 'bn'): string {
  if (lang === 'bn') return `${BN_MONTHS_LONG[d.getMonth()]} ${toBnDigits(d.getFullYear())}`
  return format(d, 'MMMM yyyy')
}

export function fmtMonthShort(d: Date, lang: 'en' | 'bn'): string {
  return lang === 'bn' ? BN_MONTHS_SHORT[d.getMonth()] : format(d, 'MMM')
}

export function fmtDayNum(d: Date, lang: 'en' | 'bn'): string {
  return lang === 'bn' ? toBnDigits(d.getDate()) : String(d.getDate())
}

export function fmtTopBarDate(d: Date, lang: 'en' | 'bn'): string {
  if (lang === 'bn') return fmtDateBn(d, 'short').toUpperCase()
  return format(d, 'EEE, MMM d').toUpperCase()
}
