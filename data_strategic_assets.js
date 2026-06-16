// data_strategic_assets.js
const STRATEGIC_ASSETS = {
  
  // 1. ELEKTRİK & ENERJİ SANTRALLERİ
  powerPlants: [
    { name: "Three Gorges Dam", country: "China", lat: 30.82, lng: 111.00, type: "hydroelectric", capacity: "22,500 MW", strategic_value: "CRITICAL" },
    { name: "Kashiwazaki-Kariwa Nuclear", country: "Japan", lat: 37.42, lng: 138.59, type: "nuclear", capacity: "7,965 MW", strategic_value: "HIGH" },
    { name: "Palo Verde Nuclear", country: "USA", lat: 33.38, lng: -112.86, type: "nuclear", capacity: "3,937 MW", strategic_value: "HIGH" },
    { name: "Zaporizhzhia Nuclear", country: "Ukraine", lat: 47.51, lng: 34.58, type: "nuclear", capacity: "5,700 MW", strategic_value: "CRITICAL" },
    { name: "Akkuyu Nükleer Santrali", country: "Turkey", lat: 36.14, lng: 33.32, type: "nuclear", capacity: "4,800 MW", strategic_value: "HIGH" },
    { name: "Bhadla Solar Park", country: "India", lat: 27.53, lng: 71.91, type: "solar", capacity: "2,245 MW", strategic_value: "MED" },
    { name: "Itaipu Dam", country: "Brazil/Paraguay", lat: -25.40, lng: -54.58, type: "hydroelectric", capacity: "14,000 MW", strategic_value: "HIGH" }
  ],

  // 2. SU KAYNAKLARI VE BARAJLAR
  waterResources: [
    { name: "Atatürk Barajı", country: "Turkey", lat: 37.48, lng: 38.31, type: "dam", capacity: "48.7 km³", description: "Fırat havzasının en büyük su rezervi." },
    { name: "Grand Ethiopian Renaissance Dam", country: "Ethiopia", lat: 11.21, lng: 35.09, type: "dam", capacity: "74 km³", description: "Nil nehrinin kontrolü için jeopolitik kriz noktası." },
    { name: "Aswan High Dam", country: "Egypt", lat: 23.97, lng: 32.87, type: "dam", capacity: "132 km³", description: "Mısır'ın ana tatlı su ve enerji kaynağı." },
    { name: "Hoover Dam", country: "USA", lat: 36.01, lng: -114.73, type: "dam", capacity: "35.2 km³", description: "ABD Batı yakası su şebekesi." },
    { name: "Ras Al Khair Desalination", country: "Saudi Arabia", lat: 27.54, lng: 49.20, type: "desalination", capacity: "1M m³/day", description: "Dünyanın en büyük su arıtma tesisi." }
  ],

  // 3. STRATEJİK PETROKİMYA TESİSLERİ
  petroChem: [
    { name: "Ghawar Field Infrastructure", country: "Saudi Arabia", lat: 25.93, lng: 49.16, type: "oil_field", capacity: "5M barrels/day", strategic_value: "CRITICAL" },
    { name: "Abqaiq Processing Plant", country: "Saudi Arabia", lat: 25.93, lng: 49.67, type: "refinery", capacity: "7M barrels/day", strategic_value: "CRITICAL" },
    { name: "Jamnagar Refinery", country: "India", lat: 22.34, lng: 69.87, type: "refinery", capacity: "1.24M barrels/day", strategic_value: "HIGH" },
    { name: "Ulsan Refinery", country: "South Korea", lat: 35.51, lng: 129.35, type: "refinery", capacity: "1.12M barrels/day", strategic_value: "HIGH" },
    { name: "Port Arthur Refinery", country: "USA", lat: 29.87, lng: -93.94, type: "refinery", capacity: "636k barrels/day", strategic_value: "HIGH" },
    { name: "STAR Rafineri", country: "Turkey", lat: 38.79, lng: 26.93, type: "refinery", capacity: "214k barrels/day", strategic_value: "MED" }
  ],

  // 4. KRİTİK TEKNOLOJİ MERKEZLERİ
  techCenters: [
    { name: "TSMC Fab 18", country: "Taiwan", lat: 23.11, lng: 120.28, type: "semiconductor", tech: "3nm/2nm Processes", strategic_value: "CRITICAL" },
    { name: "ASML Headquarters", country: "Netherlands", lat: 51.40, lng: 5.42, type: "lithography", tech: "EUV Systems", strategic_value: "CRITICAL" },
    { name: "Shenzhen Tech Hub", country: "China", lat: 22.54, lng: 114.05, type: "hardware_ai", tech: "Electronics Manufacturing & R&D", strategic_value: "HIGH" },
    { name: "Zelenograd Microelectronics", country: "Russia", lat: 55.98, lng: 37.18, type: "semiconductor", tech: "Military Grade Chips", strategic_value: "MED" },
    { name: "Bangalore IT Corridor", country: "India", lat: 12.97, lng: 77.59, type: "software", tech: "Global IT Outsourcing & Aerospace", strategic_value: "HIGH" }
  ],

  // 5. DİJİTAL ALTYAPI VE VERİ MERKEZLERİ
  dataCenters: [
    { name: "Ashburn Data Center Alley", country: "USA", lat: 39.04, lng: -77.48, type: "cloud_hub", description: "Küresel internet trafiğinin %70'i buradan geçer." },
    { name: "DE-CIX Frankfurt", country: "Germany", lat: 50.11, lng: 8.68, type: "ixp", description: "Dünyanın en yoğun internet değişim noktası." },
    { name: "Guizhou Big Data Hub", country: "China", lat: 26.64, lng: 106.63, type: "cloud_hub", description: "Tencent ve Apple'ın devasa veri depolama tesisleri." },
    { name: "Equinix TY2 Tokyo", country: "Japan", lat: 35.68, lng: 139.76, type: "data_center", description: "Asya-Pasifik ana veri omurgası." }
  ],

  // 6. BEŞERİ SERMAYE VE AR-GE BİRİKİMLERİ
  humanCapital: [
    { name: "MIT / Boston Biotech Hub", country: "USA", lat: 42.36, lng: -71.09, type: "research", description: "İleri teknoloji, yapay zeka ve biyo-savunma merkezi." },
    { name: "CERN", country: "Switzerland/France", lat: 46.23, lng: 6.05, type: "research", description: "Dünyanın en büyük parçacık fiziği laboratuvarı." },
    { name: "Zhongguancun Science Park", country: "China", lat: 39.98, lng: 116.31, type: "research", description: "Çin'in 'Silikon Vadisi', yapay zeka ve kuantum üssü." },
    { name: "Oxford-Cambridge Arc", country: "UK", lat: 51.95, lng: -0.65, type: "research", description: "Küresel sağlık ve yüksek teknoloji mühendisliği üssü." }
  ],

  // 7. FİNANSAL VE JEOSTRATEJİK KONUM KAYNAKLARI
  financialCenters: [
    { name: "SWIFT Headquarters", country: "Belgium", lat: 50.73, lng: 4.48, type: "financial", description: "Küresel bankalararası transfer sisteminin kalbi." },
    { name: "Wall Street / Federal Reserve", country: "USA", lat: 40.70, lng: -74.00, type: "financial", description: "Küresel dolar rezervinin ve piyasaların yönetildiği merkez." },
    { name: "City of London", country: "UK", lat: 51.51, lng: -0.09, type: "financial", description: "Küresel döviz ve emtia ticaret merkezi." },
    { name: "Shanghai Stock Exchange", country: "China", lat: 31.23, lng: 121.50, type: "financial", description: "Asya'nın en büyük sermaye piyasası." }
  ],

  geostrategicChokepoints: [
    { name: "Strait of Malacca", lat: 1.43, lng: 102.89, description: "Küresel ticaretin ana damarı, Hint Okyanusu'nu Güney Çin Denizi'ne bağlar." },
    { name: "Strait of Hormuz", lat: 26.56, lng: 56.46, description: "Dünyanın en kritik petrol geçiş noktası." },
    { name: "Suez Canal", lat: 29.93, lng: 32.55, description: "Avrupa ve Asya arasındaki kritik deniz kısayolu." },
    { name: "Panama Canal", lat: 9.08, lng: -79.68, description: "Atlantik ve Pasifik okyanuslarını bağlayan stratejik geçit." },
    { name: "İstanbul ve Çanakkale Boğazları", lat: 41.02, lng: 29.00, description: "Karadeniz'in sıcak denizlere ve küresel ticarete açılan tek kapısı." },
    { name: "Bab-el-Mandeb Strait", lat: 12.58, lng: 43.33, description: "Kızıldeniz ile Hint Okyanusu arası enerji ve kargo dar boğazı." },
    { name: "Strait of Gibraltar", lat: 35.97, lng: -5.50, description: "Akdeniz'in Atlantik Okyanusu'na çıkışı." }
  ]
};

window.STRATEGIC_ASSETS = STRATEGIC_ASSETS;