import { Calculator, Globe, History, MoonStar, BookMarked, Feather, Zap } from 'lucide-react';

export const lgsCurriculum = [
  {
    name: 'Okuma',
    icon: BookMarked,
    color: 'text-green-600', // Yeşil renk
    gradient: 'from-green-500 to-emerald-500', // Yeşil gradient
    hexColor: '#22c55e', // Green-500
    subtopics: [],
  },
  {
    name: 'Türkçe',
    icon: Feather,
    color: 'text-red-600',
    gradient: 'from-red-500 to-rose-500',
    hexColor: '#ef4444', // Red-500
    subtopics: [
      { name: 'Sözcükte Anlam', icon: Feather, color: 'text-red-500' },
      { name: 'Cümlede Anlam', icon: Feather, color: 'text-rose-500' },
      { name: 'Paragrafta Anlam', icon: Feather, color: 'text-red-400' },
      { name: 'Sözcük Türleri', icon: Feather, color: 'text-rose-400' },
      { name: 'Cümle Türleri', icon: Feather, color: 'text-red-500' },
      { name: 'Yazım Kuralları', icon: Feather, color: 'text-rose-500' },
      { name: 'Noktalama İşaretleri', icon: Feather, color: 'text-red-400' },
      { name: 'Anlatım Bozuklukları', icon: Feather, color: 'text-rose-400' },
    ],
  },
  {
    name: 'Matematik',
    icon: Calculator,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-sky-500',
    hexColor: '#3b82f6', // Blue-500
    subtopics: [
      { name: 'Çarpanlar ve Katlar', icon: Calculator, color: 'text-blue-500' },
      { name: 'Üslü İfadeler', icon: Calculator, color: 'text-sky-500' },
      { name: 'Kareköklü İfadeler', icon: Calculator, color: 'text-blue-400' },
      { name: 'Veri Analizi', icon: Calculator, color: 'text-sky-400' },
      { name: 'Basit Olayların Olma Olasılığı', icon: Calculator, color: 'text-blue-500' },
      { name: 'Cebirsel İfadeler ve Denklemler', icon: Calculator, color: 'text-sky-500' },
      { name: 'Eşitsizlikler', icon: Calculator, color: 'text-blue-400' },
      { name: 'Üçgenler', icon: Calculator, color: 'text-sky-400' },
      { name: 'Dönüşüm Geometrisi', icon: Calculator, color: 'text-blue-500' },
      { name: 'Geometrik Cisimler', icon: Calculator, color: 'text-sky-500' },
    ],
  },
  {
    name: 'Fen Bilimleri',
    icon: Zap,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-violet-500',
    hexColor: '#a855f7', // Purple-500
    subtopics: [
      { name: 'Mevsimler ve İklim', icon: Zap, color: 'text-green-500' },
      { name: 'DNA ve Genetik Kod', icon: Zap, color: 'text-emerald-500' },
      { name: 'Basınç', icon: Zap, color: 'text-green-400' },
      { name: 'Madde ve Endüstri', icon: Zap, color: 'text-emerald-400' },
      { name: 'Basit Makineler', icon: Zap, color: 'text-green-500' },
      { name: 'Enerji Dönüşümleri', icon: Zap, color: 'text-emerald-500' },
      { name: 'Elektrik Yükleri ve Elektriklenme', icon: Zap, color: 'text-green-400' },
      { name: 'Ses ve Işık', icon: Zap, color: 'text-emerald-400' },
    ],
  },
  {
    name: 'T.C. İnkılap Tarihi ve Atatürkçülük',
    icon: History,
    color: 'text-yellow-600', // Sarı renk
    gradient: 'from-yellow-500 to-amber-500', // Sarı gradient
    hexColor: '#eab308', // Yellow-500
    subtopics: [
        { name: 'Bir Kahraman Doğuyor', icon: History, color: 'text-amber-500' },
        { name: 'Milli Uyanış: Yurdumuzun İşgaline Tepkiler', icon: History, color: 'text-orange-500' },
        { name: 'Ya İstiklal Ya Ölüm', icon: History, color: 'text-amber-400' },
        { name: 'Çağdaş Türkiye Yolunda Adımlar', icon: History, color: 'text-orange-400' },
        { name: 'Atatürkçülük ve İlkeleri', icon: History, color: 'text-amber-500' },
        { name: 'Atatürk Dönemi Türk Dış Politikası', icon: History, color: 'text-orange-500' },
    ]
  },
  {
    name: 'Din Kültürü ve Ahlak Bilgisi',
    icon: MoonStar,
    color: 'text-teal-600', // Turkuaz renk
    gradient: 'from-teal-500 to-cyan-500', // Turkuaz gradient
    hexColor: '#14b8a6', // Teal-500
    subtopics: [
        { name: 'Kader ve Kaza İnancı', icon: MoonStar, color: 'text-teal-500' },
        { name: 'Zekât, Hac ve Kurban İbadeti', icon: MoonStar, color: 'text-cyan-500' },
        { name: 'Din ve Hayat', icon: MoonStar, color: 'text-teal-400' },
        { name: 'Kur’an’da Akıl ve Bilgi', icon: MoonStar, color: 'text-cyan-400' },
        { name: 'Peygamber ve İlahi Kitaplara İnanç', icon: MoonStar, color: 'text-teal-500' },
    ]
  },
  {
    name: 'İngilizce',
    icon: Globe,
    color: 'text-indigo-600', // Çivit mavisi renk
    gradient: 'from-indigo-500 to-fuchsia-500', // Çivit mavisi gradient
    hexColor: '#6366f1', // Indigo-500
    subtopics: [
        { name: 'Friendship', icon: Globe, color: 'text-purple-500' },
        { name: 'Teen Life', icon: Globe, color: 'text-violet-500' },
        { name: 'In the Kitchen', icon: Globe, color: 'text-purple-400' },
        { name: 'On the Phone', icon: Globe, color: 'text-violet-400' },
        { name: 'The Internet', icon: Globe, color: 'text-purple-500' },
        { name: 'Adventures', icon: Globe, color: 'text-violet-500' },
        { name: 'Tourism', icon: Globe, color: 'text-purple-400' },
        { name: 'Chores', icon: Globe, color: 'text-violet-400' },
        { name: 'Science', icon: Globe, color: 'text-purple-500' },
    ]
  }
];