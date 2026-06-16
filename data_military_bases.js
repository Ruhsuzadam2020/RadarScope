// Military Air Bases - Global Dataset
const MILITARY_AIR_BASES = [
  // USA
  { name: "Andrews AFB", country: "USA", lat: 38.8108, lng: -76.8669, type: "air", size: "major", aircraft: ["F-16","F-35","C-17"] },
  { name: "Edwards AFB", country: "USA", lat: 34.9054, lng: -117.8836, type: "air", size: "major", aircraft: ["F-22","B-2"] },
  { name: "Langley AFB", country: "USA", lat: 37.0832, lng: -76.3605, type: "air", size: "major", aircraft: ["F-22"] },
  { name: "Nellis AFB", country: "USA", lat: 36.2361, lng: -115.0339, type: "air", size: "major", aircraft: ["F-35","F-16"] },
  { name: "Tinker AFB", country: "USA", lat: 35.4147, lng: -97.3866, type: "air", size: "major", aircraft: ["B-52","E-3"] },
  { name: "Barksdale AFB", country: "USA", lat: 32.5018, lng: -93.6627, type: "air", size: "major", aircraft: ["B-52"] },
  { name: "Whiteman AFB", country: "USA", lat: 38.7272, lng: -93.5483, type: "air", size: "major", aircraft: ["B-2","F-15E"] },
  { name: "McConnell AFB", country: "USA", lat: 37.6218, lng: -97.2682, type: "air", size: "major", aircraft: ["KC-135"] },
  { name: "Travis AFB", country: "USA", lat: 38.2627, lng: -121.9268, type: "air", size: "major", aircraft: ["C-17","KC-10"] },
  { name: "Ramstein AB", country: "USA", lat: 49.4369, lng: 7.6003, type: "air", size: "major", aircraft: ["F-16","C-130"] },
  { name: "Incirlik AB", country: "USA", lat: 37.0021, lng: 35.4259, type: "air", size: "major", aircraft: ["A-10","F-16"] },
  { name: "Kadena AB", country: "USA", lat: 26.3556, lng: 127.7688, type: "air", size: "major", aircraft: ["F-15C","E-3"] },
  { name: "Osan AB", country: "USA", lat: 37.0906, lng: 127.0296, type: "air", size: "major", aircraft: ["A-10","F-16"] },
  { name: "Al Udeid AB", country: "USA", lat: 25.1173, lng: 51.3150, type: "air", size: "major", aircraft: ["F-15","B-1"] },
  { name: "Bagram AB", country: "USA", lat: 34.9460, lng: 69.2647, type: "air", size: "major", aircraft: ["F-16","A-10"] },

  // Russia
  { name: "Kubinka AB", country: "Russia", lat: 55.6127, lng: 36.6500, type: "air", size: "major", aircraft: ["Su-27","MiG-29"] },
  { name: "Akhtubinsk", country: "Russia", lat: 48.2747, lng: 46.2030, type: "air", size: "major", aircraft: ["Su-57","Tu-160"] },
  { name: "Engels AB", country: "Russia", lat: 51.8603, lng: 46.1778, type: "air", size: "major", aircraft: ["Tu-160","Tu-95"] },
  { name: "Shagol AB", country: "Russia", lat: 55.2497, lng: 61.5700, type: "air", size: "major", aircraft: ["MiG-31"] },
  { name: "Mozdok AB", country: "Russia", lat: 43.7885, lng: 44.6099, type: "air", size: "major", aircraft: ["Su-25","Su-24"] },
  { name: "Khmeimim AB", country: "Russia", lat: 35.4012, lng: 35.9487, type: "air", size: "major", aircraft: ["Su-35","Su-34"] },
  { name: "Lipetsk AFB", country: "Russia", lat: 52.7025, lng: 39.6170, type: "air", size: "major", aircraft: ["Su-34","Su-24"] },
  { name: "Savasleika AB", country: "Russia", lat: 55.5461, lng: 43.4383, type: "air", size: "major", aircraft: ["MiG-31"] },

  // China
  { name: "Shenyang AB", country: "China", lat: 41.7833, lng: 123.4833, type: "air", size: "major", aircraft: ["J-16","J-11"] },
  { name: "Lanzhou AB", country: "China", lat: 36.0833, lng: 103.6667, type: "air", size: "major", aircraft: ["J-11"] },
  { name: "Chengdu AB", country: "China", lat: 30.5728, lng: 103.9900, type: "air", size: "major", aircraft: ["J-20","J-10"] },
  { name: "Wuhan AB", country: "China", lat: 30.5900, lng: 114.2100, type: "air", size: "major", aircraft: ["J-11","J-16"] },
  { name: "Haikou AB", country: "China", lat: 20.0311, lng: 110.3589, type: "air", size: "major", aircraft: ["J-10","H-6"] },
  { name: "Urumqi AB", country: "China", lat: 43.9091, lng: 87.4742, type: "air", size: "major", aircraft: ["J-11"] },
  { name: "Jiuquan AB", country: "China", lat: 40.9614, lng: 100.2914, type: "air", size: "major", aircraft: ["H-6K"] },

  // Turkey
  { name: "Akıncı Hava Üssü", country: "Turkey", lat: 40.0792, lng: 32.5658, type: "air", size: "major", aircraft: ["F-16","TB2"] },
  { name: "Eskişehir Hava Üssü", country: "Turkey", lat: 39.7840, lng: 30.5819, type: "air", size: "major", aircraft: ["F-16","CN235"] },
  { name: "Konya Hava Üssü", country: "Turkey", lat: 37.9792, lng: 32.5628, type: "air", size: "major", aircraft: ["F-16","NF-5"] },
  { name: "Diyarbakır Hava Üssü", country: "Turkey", lat: 37.8939, lng: 40.2010, type: "air", size: "major", aircraft: ["F-16"] },
  { name: "Erzurum Hava Üssü", country: "Turkey", lat: 39.9565, lng: 41.1702, type: "air", size: "major", aircraft: ["F-16"] },
  { name: "Mürted Hava Üssü", country: "Turkey", lat: 40.0795, lng: 32.5630, type: "air", size: "major", aircraft: ["F-16"] },
  { name: "İzmir Çiğli Hava Üssü", country: "Turkey", lat: 38.5100, lng: 27.0100, type: "air", size: "major", aircraft: ["F-16"] },
  { name: "Batman Hava Üssü", country: "Turkey", lat: 37.9290, lng: 41.1160, type: "air", size: "major", aircraft: ["F-16"] },

  // UK
  { name: "RAF Lakenheath", country: "UK", lat: 52.4093, lng: 0.5610, type: "air", size: "major", aircraft: ["F-35","F-15E"] },
  { name: "RAF Marham", country: "UK", lat: 52.6483, lng: 0.5504, type: "air", size: "major", aircraft: ["F-35B"] },
  { name: "RAF Lossiemouth", country: "UK", lat: 57.7052, lng: -3.3391, type: "air", size: "major", aircraft: ["Typhoon"] },
  { name: "RAF Coningsby", country: "UK", lat: 53.0930, lng: -0.1664, type: "air", size: "major", aircraft: ["Typhoon"] },
  { name: "RAF Brize Norton", country: "UK", lat: 51.7500, lng: -1.5833, type: "air", size: "major", aircraft: ["A400M","C-17"] },

  // France
  { name: "BA 116 Luxeuil", country: "France", lat: 47.7808, lng: 6.3636, type: "air", size: "major", aircraft: ["Rafale"] },
  { name: "BA 118 Mont-de-Marsan", country: "France", lat: 43.9067, lng: -0.5006, type: "air", size: "major", aircraft: ["Rafale","Alpha Jet"] },
  { name: "BA 120 Cazaux", country: "France", lat: 44.5330, lng: -1.1250, type: "air", size: "major", aircraft: ["Rafale","Alpha Jet"] },
  { name: "BA 123 Orléans", country: "France", lat: 47.9878, lng: 1.7606, type: "air", size: "major", aircraft: ["C-160","C-130"] },
  { name: "BA 125 Istres", country: "France", lat: 43.5228, lng: 4.9239, type: "air", size: "major", aircraft: ["Rafale","MRTT"] },

  // Germany
  { name: "Wittmund AB", country: "Germany", lat: 53.5483, lng: 7.6674, type: "air", size: "major", aircraft: ["Eurofighter"] },
  { name: "Neuburg AB", country: "Germany", lat: 48.7144, lng: 11.2125, type: "air", size: "major", aircraft: ["Eurofighter"] },
  { name: "Nörvenich AB", country: "Germany", lat: 50.8314, lng: 6.6578, type: "air", size: "major", aircraft: ["Eurofighter","Tornado"] },
  { name: "Büchel AB", country: "Germany", lat: 50.1736, lng: 7.0633, type: "air", size: "major", aircraft: ["Tornado"] },

  // Israel
  { name: "Nevatim AB", country: "Israel", lat: 31.2080, lng: 34.9939, type: "air", size: "major", aircraft: ["F-35I","F-15I"] },
  { name: "Tel Nof AB", country: "Israel", lat: 31.8395, lng: 34.8222, type: "air", size: "major", aircraft: ["F-16","AH-64"] },
  { name: "Hatzor AB", country: "Israel", lat: 31.7633, lng: 34.7278, type: "air", size: "major", aircraft: ["F-16"] },
  { name: "Ramon AB", country: "Israel", lat: 30.7761, lng: 34.6667, type: "air", size: "major", aircraft: ["F-16I"] },

  // India
  { name: "Ambala AFB", country: "India", lat: 30.3683, lng: 76.8178, type: "air", size: "major", aircraft: ["Rafale","MiG-21"] },
  { name: "Gwalior AFB", country: "India", lat: 26.2956, lng: 78.1500, type: "air", size: "major", aircraft: ["Mirage 2000"] },
  { name: "Jodhpur AFB", country: "India", lat: 26.2511, lng: 73.0489, type: "air", size: "major", aircraft: ["MiG-27","Su-30"] },
  { name: "Adampur AFB", country: "India", lat: 31.4339, lng: 75.7586, type: "air", size: "major", aircraft: ["Su-30MKI"] },
  { name: "Pune AFB", country: "India", lat: 18.5822, lng: 73.9197, type: "air", size: "major", aircraft: ["Tejas"] },

  // Pakistan
  { name: "PAF Peshawar", country: "Pakistan", lat: 33.9161, lng: 71.5147, type: "air", size: "major", aircraft: ["JF-17","F-16"] },
  { name: "PAF Kamra", country: "Pakistan", lat: 33.8690, lng: 72.4004, type: "air", size: "major", aircraft: ["JF-17"] },
  { name: "PAF Masroor", country: "Pakistan", lat: 24.8933, lng: 66.9381, type: "air", size: "major", aircraft: ["F-7PG","Mirage III"] },
  { name: "PAF Sargodha", country: "Pakistan", lat: 32.0490, lng: 72.6650, type: "air", size: "major", aircraft: ["JF-17","F-16"] },

  // Saudi Arabia
  { name: "RSAF Dhahran", country: "Saudi Arabia", lat: 26.2654, lng: 50.1520, type: "air", size: "major", aircraft: ["F-15S","Eurofighter"] },
  { name: "RSAF Riyadh", country: "Saudi Arabia", lat: 24.4760, lng: 46.6973, type: "air", size: "major", aircraft: ["F-15SA"] },
  { name: "RSAF Taif", country: "Saudi Arabia", lat: 21.4833, lng: 40.5444, type: "air", size: "major", aircraft: ["F-15SA","Typhoon"] },

  // North Korea
  { name: "Sunchon AB", country: "North Korea", lat: 39.4125, lng: 125.9019, type: "air", size: "major", aircraft: ["MiG-29","MiG-23"] },
  { name: "Uiju AB", country: "North Korea", lat: 40.2100, lng: 124.4800, type: "air", size: "major", aircraft: ["MiG-19","MiG-21"] },
  { name: "Wonsan AB", country: "North Korea", lat: 39.1833, lng: 127.4833, type: "air", size: "major", aircraft: ["Su-25","MiG-21"] },

  // Japan
  { name: "JASDF Misawa", country: "Japan", lat: 40.7033, lng: 141.3681, type: "air", size: "major", aircraft: ["F-35A","F-2"] },
  { name: "JASDF Hyakuri", country: "Japan", lat: 36.1811, lng: 140.4147, type: "air", size: "major", aircraft: ["F-2","F-15J"] },
  { name: "JASDF Chitose", country: "Japan", lat: 42.7950, lng: 141.6660, type: "air", size: "major", aircraft: ["F-15J"] },
  { name: "JASDF Nyutabaru", country: "Japan", lat: 32.0836, lng: 131.4511, type: "air", size: "major", aircraft: ["F-15J"] },

  // South Korea
  { name: "ROKAF Cheongju", country: "South Korea", lat: 36.7158, lng: 127.4994, type: "air", size: "major", aircraft: ["F-35A","T-50"] },
  { name: "ROKAF Suwon", country: "South Korea", lat: 37.2394, lng: 127.0069, type: "air", size: "major", aircraft: ["KF-16"] },
  { name: "ROKAF Gwangju", country: "South Korea", lat: 35.1231, lng: 126.8081, type: "air", size: "major", aircraft: ["F-5","T-50"] },

  // Iran
  { name: "IRIAF Isfahan", country: "Iran", lat: 32.7508, lng: 51.8614, type: "air", size: "major", aircraft: ["F-14","Su-24"] },
  { name: "IRIAF Tabriz", country: "Iran", lat: 38.1339, lng: 46.2350, type: "air", size: "major", aircraft: ["F-5","F-7"] },
  { name: "IRIAF Shiraz", country: "Iran", lat: 29.5394, lng: 52.5893, type: "air", size: "major", aircraft: ["F-14","Mirage F1"] },
  { name: "IRIAF Hamadan", country: "Iran", lat: 35.2100, lng: 48.6530, type: "air", size: "major", aircraft: ["Su-24","F-5"] },
];

// Naval Bases - Global Dataset
const NAVAL_BASES = [
  // USA
  { name: "Naval Station Norfolk", country: "USA", lat: 36.9451, lng: -76.3233, type: "naval", size: "major", vessels: ["CVN","DDG","SSN"] },
  { name: "Naval Base San Diego", country: "USA", lat: 32.6939, lng: -117.1350, type: "naval", size: "major", vessels: ["CVN","CG","DDG"] },
  { name: "Naval Station Bremerton", country: "USA", lat: 47.5630, lng: -122.6257, type: "naval", size: "major", vessels: ["CVN","DDG","SSN"] },
  { name: "Naval Base Pearl Harbor", country: "USA", lat: 21.3600, lng: -157.9700, type: "naval", size: "major", vessels: ["CVN","SSN","DDG"] },
  { name: "Naval Station Rota", country: "USA", lat: 36.6406, lng: -6.3492, type: "naval", size: "major", vessels: ["DDG","FFG"] },
  { name: "Naval Base Guam", country: "USA", lat: 13.4443, lng: 144.6558, type: "naval", size: "major", vessels: ["SSN","DDG","LHD"] },
  { name: "NS Yokosuka", country: "USA", lat: 35.2956, lng: 139.6658, type: "naval", size: "major", vessels: ["CVN","DDG","CG"] },
  { name: "Naval Base Kitsap", country: "USA", lat: 47.5444, lng: -122.6572, type: "naval", size: "major", vessels: ["SSBN","SSN"] },
  { name: "NS Kings Bay", country: "USA", lat: 30.7947, lng: -81.5586, type: "naval", size: "major", vessels: ["SSBN"] },

  // Russia
  { name: "Sevmorput - Murmansk", country: "Russia", lat: 68.9833, lng: 33.0833, type: "naval", size: "major", vessels: ["Oscar II","Akula","Kirov"] },
  { name: "Vladivostok Naval Base", country: "Russia", lat: 43.1158, lng: 131.8747, type: "naval", size: "major", vessels: ["Kilo","Udaloy","Slava"] },
  { name: "Sevastopol Naval Base", country: "Russia", lat: 44.6122, lng: 33.5228, type: "naval", size: "major", vessels: ["Kilo","Slava"] },
  { name: "Baltiysk Naval Base", country: "Russia", lat: 54.6517, lng: 19.9033, type: "naval", size: "major", vessels: ["Steregushchy","Kilo"] },
  { name: "Tartus Naval Base", country: "Russia", lat: 34.8917, lng: 35.8861, type: "naval", size: "major", vessels: ["Kilo","Neustrashimy"] },
  { name: "Gadzhiyevo", country: "Russia", lat: 69.2531, lng: 33.3022, type: "naval", size: "major", vessels: ["Delta IV","Borei"] },

  // China
  { name: "Yulin Naval Base", country: "China", lat: 18.2278, lng: 109.6003, type: "naval", size: "major", vessels: ["Type 094","Type 095","Type 052D"] },
  { name: "Sanya Naval Base", country: "China", lat: 18.2489, lng: 109.6056, type: "naval", size: "major", vessels: ["Type 093","Liaoning CV"] },
  { name: "Zhoushan Naval Base", country: "China", lat: 29.9853, lng: 122.2064, type: "naval", size: "major", vessels: ["Type 052D","Type 055"] },
  { name: "Qingdao Naval Base", country: "China", lat: 36.0333, lng: 120.3333, type: "naval", size: "major", vessels: ["Shandong CV","Type 052"] },
  { name: "Djibouti Naval Base", country: "China", lat: 11.5310, lng: 43.1532, type: "naval", size: "major", vessels: ["Type 054A"] },
  { name: "Jianggezhuang", country: "China", lat: 36.1592, lng: 120.5939, type: "naval", size: "major", vessels: ["Type 039","Type 093"] },

  // UK
  { name: "HMNB Portsmouth", country: "UK", lat: 50.8153, lng: -1.1253, type: "naval", size: "major", vessels: ["QEC","T45","T23"] },
  { name: "HMNB Devonport", country: "UK", lat: 50.3728, lng: -4.1856, type: "naval", size: "major", vessels: ["T23","Astute SSN"] },
  { name: "HMNB Clyde", country: "UK", lat: 55.9586, lng: -4.8592, type: "naval", size: "major", vessels: ["Vanguard SSBN","Astute SSN"] },

  // France
  { name: "Brest Naval Base", country: "France", lat: 48.3814, lng: -4.4867, type: "naval", size: "major", vessels: ["SSBN","CDG CV","Fremm"] },
  { name: "Toulon Naval Base", country: "France", lat: 43.1136, lng: 5.8944, type: "naval", size: "major", vessels: ["CDG CV","Barracuda SSN","Fremm"] },

  // Turkey
  { name: "İzmit Deniz Üssü", country: "Turkey", lat: 40.7667, lng: 29.9167, type: "naval", size: "major", vessels: ["F-125","G-class"] },
  { name: "Aksaz Deniz Üssü", country: "Turkey", lat: 36.9833, lng: 28.1167, type: "naval", size: "major", vessels: ["F-class","Submarine"] },
  { name: "Gölcük Deniz Üssü", country: "Turkey", lat: 40.6947, lng: 29.8231, type: "naval", size: "major", vessels: ["Type 209","Gabya-class"] },
  { name: "İskenderun Deniz Üssü", country: "Turkey", lat: 36.5833, lng: 36.1667, type: "naval", size: "major", vessels: ["Patrol","Minelayer"] },
  { name: "Foça Deniz Harp Okulu", country: "Turkey", lat: 38.6667, lng: 26.7500, type: "naval", size: "major", vessels: ["Training"] },

  // India
  { name: "INS Karanja", country: "India", lat: 18.8656, lng: 72.9444, type: "naval", size: "major", vessels: ["INS Vikrant","Kolkata DDG"] },
  { name: "INS Chilka", country: "India", lat: 19.7050, lng: 85.3194, type: "naval", size: "major", vessels: ["Training"] },
  { name: "INS Kattabomman", country: "India", lat: 8.4022, lng: 77.8950, type: "naval", size: "major", vessels: ["Arihant SSBN"] },
  { name: "INS Varsha", country: "India", lat: 17.6400, lng: 83.2300, type: "naval", size: "major", vessels: ["SSBN","SSN"] },

  // Japan
  { name: "JMSDF Yokosuka", country: "Japan", lat: 35.2811, lng: 139.6594, type: "naval", size: "major", vessels: ["Izumo DDH","Kongo DDG"] },
  { name: "JMSDF Sasebo", country: "Japan", lat: 33.1600, lng: 129.7200, type: "naval", size: "major", vessels: ["Osumi LPD","Soryu SS"] },
  { name: "JMSDF Kure", country: "Japan", lat: 34.2489, lng: 132.5656, type: "naval", size: "major", vessels: ["Soryu SS","Takanami DD"] },

  // South Korea
  { name: "ROKN Jinhae", country: "South Korea", lat: 35.1583, lng: 128.6389, type: "naval", size: "major", vessels: ["Sejong DDG","Type 214 SS"] },
  { name: "ROKN Busan", country: "South Korea", lat: 35.0999, lng: 129.0439, type: "naval", size: "major", vessels: ["FFX","PKX"] },

  // Iran
  { name: "Bandar Abbas Naval Base", country: "Iran", lat: 27.1832, lng: 56.2619, type: "naval", size: "major", vessels: ["Kilo SS","Moudge FFG"] },
  { name: "Bushehr Naval Base", country: "Iran", lat: 28.9689, lng: 50.8368, type: "naval", size: "major", vessels: ["Houdong FAC"] },
  { name: "Chabahar Naval Base", country: "Iran", lat: 25.2944, lng: 60.6236, type: "naval", size: "major", vessels: ["Alvand FF"] },

  // North Korea
  { name: "Mayang-do Naval Base", country: "North Korea", lat: 40.1300, lng: 128.9100, type: "naval", size: "major", vessels: ["Romeo SS","Sang-O SS"] },
  { name: "Nampo Naval Base", country: "North Korea", lat: 38.7347, lng: 125.3900, type: "naval", size: "major", vessels: ["Whiskey SS","FAC"] },

  // Italy
  { name: "La Spezia Naval Base", country: "Italy", lat: 44.1053, lng: 9.8439, type: "naval", size: "major", vessels: ["Cavour CV","Fremm FFG"] },
  { name: "Taranto Naval Base", country: "Italy", lat: 40.4717, lng: 17.2169, type: "naval", size: "major", vessels: ["Garibaldi","Sauro SS"] },
  { name: "Augusta Naval Base", country: "Italy", lat: 37.2311, lng: 15.2181, type: "naval", size: "major", vessels: ["Fremm","Sauro SS"] },

  // Germany
  { name: "Kiel Naval Base", country: "Germany", lat: 54.3233, lng: 10.1394, type: "naval", size: "major", vessels: ["F125","Type 212 SS"] },
  { name: "Rostock Naval Base", country: "Germany", lat: 54.0792, lng: 12.1264, type: "naval", size: "major", vessels: ["K130","Minesweeper"] },

  // Brazil
  { name: "Base Naval do Rio", country: "Brazil", lat: -22.8978, lng: -43.2267, type: "naval", size: "major", vessels: ["NAe São Paulo","Scorpène SS"] },
  { name: "Base Naval de Natal", country: "Brazil", lat: -5.7893, lng: -35.1947, type: "naval", size: "major", vessels: ["Patrol","Corvette"] },

  // Australia
  { name: "HMAS Stirling", country: "Australia", lat: -32.2019, lng: 115.6767, type: "naval", size: "major", vessels: ["Collins SS","Anzac FFH"] },
  { name: "HMAS Creswell", country: "Australia", lat: -35.5178, lng: 150.4428, type: "naval", size: "major", vessels: ["Training"] },
  { name: "Fleet Base East Sydney", country: "Australia", lat: -33.8556, lng: 151.2036, type: "naval", size: "major", vessels: ["DDG","FFH"] },
];



// ── RAILWAY LINES — Comprehensive Global Dataset ──────────
const RAILWAY_LINES = {

  // ────────────── RUSSIA ──────────────
  "Russia": [
    { name: "Trans-Siberian Railway (BAM)", path: [[55.75,37.62],[54.98,55.96],[54.98,73.37],[56.49,84.97],[56.01,92.89],[52.29,104.28],[51.83,107.60],[52.06,113.50],[52.27,119.75],[53.53,126.27],[48.48,135.07],[43.12,131.91]], color: "#ff6b6b" },
    { name: "Baikal-Amur Mainline", path: [[56.91,102.08],[56.25,110.67],[55.40,118.03],[52.90,128.77],[50.63,136.93]], color: "#ff9999" },
    { name: "Moscow–St. Petersburg", path: [[55.75,37.62],[56.33,37.93],[57.63,39.87],[58.52,31.27],[59.95,30.32]], color: "#ff4444" },
    { name: "Moscow–Kazan", path: [[55.75,37.62],[55.79,38.97],[55.91,42.68],[55.78,49.12],[55.80,48.99]], color: "#ff8800" },
    { name: "Moscow–Nizhny Novgorod HSR", path: [[55.75,37.62],[55.88,38.58],[56.30,40.99],[56.33,43.99]], color: "#ff6633" },
    { name: "St. Petersburg–Helsinki", path: [[59.95,30.32],[60.72,28.73],[60.17,24.94],[60.17,24.93]], color: "#ffaaaa" },
    { name: "Moscow–Minsk–Warsaw", path: [[55.75,37.62],[54.65,32.05],[53.90,27.56],[53.13,23.16],[52.23,21.01]], color: "#cc4444" },
    { name: "Trans-Mongolian Branch", path: [[52.29,104.28],[51.83,107.60],[50.45,106.18],[47.92,106.88],[47.88,107.00]], color: "#ff7755" },
  ],

  // ────────────── USA ──────────────
  "USA": [
    { name: "Northeast Corridor (Amtrak)", path: [[42.36,-71.05],[41.76,-72.68],[41.30,-72.93],[40.71,-74.00],[39.95,-75.16],[39.29,-76.61],[38.89,-77.04]], color: "#4ecdc4" },
    { name: "Transcontinental (Union Pacific)", path: [[40.71,-74.00],[40.87,-82.88],[41.26,-95.93],[41.77,-104.82],[40.76,-111.89],[40.76,-111.89],[39.73,-104.98],[37.77,-122.41]], color: "#45b7d1" },
    { name: "Southern Pacific", path: [[29.76,-95.37],[30.33,-89.12],[33.45,-86.80],[33.75,-84.39],[35.23,-80.84],[37.54,-77.44],[38.89,-77.04]], color: "#96ceb4" },
    { name: "Chicago Hub Lines", path: [[41.88,-87.62],[39.78,-86.15],[39.96,-82.99],[43.05,-76.14],[40.71,-74.00]], color: "#ffeaa7" },
    { name: "California Corridor", path: [[37.77,-122.41],[37.33,-121.89],[36.74,-119.77],[34.05,-118.24],[32.72,-117.15]], color: "#74b9ff" },
    { name: "Pacific Northwest", path: [[47.60,-122.33],[45.52,-122.68],[44.05,-123.09],[42.86,-124.56],[37.77,-122.41]], color: "#a29bfe" },
    { name: "Texas Eagle", path: [[29.76,-95.37],[30.27,-97.74],[32.78,-96.80],[32.30,-90.18],[37.63,-90.20],[38.63,-90.19],[41.88,-87.62]], color: "#fd79a8" },
    { name: "Sunset Limited", path: [[29.76,-95.37],[29.95,-90.07],[30.07,-89.08],[32.37,-86.30],[33.45,-84.40],[32.08,-81.10],[30.33,-81.66]], color: "#e17055" },
  ],

  // ────────────── CHINA ──────────────
  "China": [
    { name: "Beijing–Shanghai HSR", path: [[39.90,116.40],[37.46,117.09],[36.67,117.02],[35.05,117.29],[34.74,113.72],[32.05,118.77],[31.23,121.47]], color: "#ffd93d" },
    { name: "Beijing–Guangzhou HSR", path: [[39.90,116.40],[37.87,114.51],[34.75,113.62],[32.05,118.79],[30.58,114.27],[28.23,112.93],[26.07,114.93],[23.13,113.26]], color: "#ff8b94" },
    { name: "Silk Road Express (Yuxinou)", path: [[39.90,116.40],[40.54,89.18],[43.86,87.62],[43.45,80.25],[42.87,71.43],[43.25,76.91],[51.17,71.47]], color: "#a8e6cf" },
    { name: "Beijing–Harbin HSR", path: [[39.90,116.40],[40.78,111.65],[41.92,123.43],[43.88,125.32],[45.74,126.64],[47.35,123.96],[45.84,126.52]], color: "#ffb347" },
    { name: "Chengdu–Chongqing HSR", path: [[30.57,104.07],[29.56,106.55],[30.05,106.55]], color: "#dda0dd" },
    { name: "Lanzhou–Xinjiang HSR", path: [[36.06,103.83],[39.52,98.50],[40.14,94.68],[41.78,87.62],[43.86,87.62]], color: "#87ceeb" },
    { name: "Kunming–Vientiane Railway", path: [[25.04,102.71],[23.37,103.85],[22.36,103.84],[21.13,101.15],[20.45,102.97],[17.96,102.60]], color: "#90ee90" },
    { name: "Coastal HSR (Shanghai–Shenzhen)", path: [[31.23,121.47],[28.68,121.41],[26.07,119.31],[24.48,118.08],[23.55,116.39],[23.13,113.26],[22.54,114.06]], color: "#ff6347" },
  ],

  // ────────────── TURKEY ──────────────
  "Turkey": [
    { name: "Ankara–İstanbul YHT", path: [[39.92,32.85],[40.43,31.78],[40.63,30.39],[41.01,28.97]], color: "#ff6b9d" },
    { name: "Ankara–Konya YHT", path: [[39.92,32.85],[39.66,32.13],[38.55,31.70],[37.87,32.49]], color: "#ff9f43" },
    { name: "Ankara–Eskişehir YHT", path: [[39.92,32.85],[39.78,32.55],[39.77,30.52]], color: "#54a0ff" },
    { name: "Ankara–Sivas YHT", path: [[39.92,32.85],[39.94,33.47],[40.02,35.00],[39.75,37.01]], color: "#5f27cd" },
    { name: "İstanbul–Edirne", path: [[41.01,28.97],[41.40,27.79],[41.68,26.56]], color: "#ee5a24" },
    { name: "Ankara–Kayseri–Diyarbakır", path: [[39.92,32.85],[38.72,35.49],[38.37,37.38],[37.97,38.40],[37.89,40.20]], color: "#006266" },
    { name: "İzmir–Ankara", path: [[38.42,27.13],[38.35,28.11],[39.77,30.52],[39.92,32.85]], color: "#12CBC4" },
    { name: "Marmaray (İstanbul Metro)", path: [[41.01,28.65],[41.01,28.97],[41.02,29.02],[41.00,29.37]], color: "#D980FA" },
    { name: "Kurtalan Ekspresi (Ankara–Batman)", path: [[39.92,32.85],[38.72,35.49],[37.89,40.20],[37.93,41.12]], color: "#F9CA24" },
    { name: "Doğu Ekspresi (Ankara–Kars)", path: [[39.92,32.85],[39.94,33.47],[39.75,37.01],[39.91,41.28],[40.60,43.09],[40.61,43.10]], color: "#6C5CE7" },
  ],

  // ────────────── EUROPE ──────────────
  "Europe": [
    { name: "Paris–Berlin TGV/ICE", path: [[48.85,2.35],[50.45,4.00],[50.85,4.36],[51.21,4.40],[51.93,8.37],[52.52,13.40]], color: "#dcd3ff" },
    { name: "Paris–Madrid TGV/AVE", path: [[48.85,2.35],[47.22,1.55],[44.84,-0.57],[43.30,-1.86],[43.26,-3.80],[40.42,-3.70]], color: "#b8f0ff" },
    { name: "Eurostar (London–Paris)", path: [[51.50,-0.12],[51.26,1.07],[51.06,1.80],[50.94,1.86],[50.63,3.07],[49.00,2.55],[48.85,2.35]], color: "#ffdd59" },
    { name: "Munich–Vienna–Budapest", path: [[48.14,11.58],[48.20,16.37],[47.50,19.04]], color: "#ff6b6b" },
    { name: "Amsterdam–Frankfurt–Vienna", path: [[52.37,4.90],[51.45,5.48],[50.11,8.68],[48.14,11.58],[48.20,16.37]], color: "#a29bfe" },
    { name: "Stockholm–Malmö–Copenhagen", path: [[59.33,18.07],[55.60,13.00],[55.68,12.57]], color: "#74b9ff" },
    { name: "Warsaw–Prague–Vienna", path: [[52.23,21.01],[50.07,14.43],[48.20,16.37]], color: "#fd79a8" },
    { name: "Rome–Milan–Zurich", path: [[41.90,12.50],[45.46,9.19],[47.37,8.54]], color: "#55efc4" },
    { name: "Madrid–Barcelona AVE", path: [[40.42,-3.70],[41.38,2.18]], color: "#e17055" },
    { name: "Frankfurt–Basel–Lyon", path: [[50.11,8.68],[47.55,7.59],[45.75,4.84]], color: "#fdcb6e" },
    { name: "Athens–Thessaloniki", path: [[37.98,23.73],[40.64,22.94]], color: "#00cec9" },
    { name: "Bucharest–Budapest", path: [[44.43,26.10],[46.07,23.58],[47.50,19.04]], color: "#e84393" },
  ],

  // ────────────── JAPAN ──────────────
  "Japan": [
    { name: "Tōkaidō Shinkansen", path: [[35.68,139.69],[35.18,136.90],[34.72,135.50],[34.39,132.46],[33.59,130.42]], color: "#ff6b6b" },
    { name: "Tōhoku Shinkansen", path: [[35.68,139.69],[36.37,140.47],[38.26,140.87],[39.70,141.15],[40.82,141.40],[41.77,140.74]], color: "#feca57" },
    { name: "Hokuriku Shinkansen", path: [[35.68,139.69],[36.56,137.06],[36.69,137.21],[37.39,136.63],[36.69,136.80]], color: "#ff9ff3" },
    { name: "Kyushu Shinkansen", path: [[33.59,130.42],[32.75,130.74],[31.89,130.83],[31.56,130.55]], color: "#ffeaa7" },
    { name: "Hokkaido Shinkansen", path: [[41.77,140.74],[41.29,141.07],[42.31,141.36],[43.06,141.35],[42.74,141.69]], color: "#74b9ff" },
    { name: "San-yo Shinkansen", path: [[34.72,135.50],[34.39,132.46],[33.85,132.77],[33.80,130.73],[33.59,130.42]], color: "#a29bfe" },
    { name: "Yamagata Mini-Shinkansen", path: [[38.26,140.87],[38.25,140.33],[38.66,140.06],[38.92,139.83]], color: "#fd79a8" },
  ],

  // ────────────── INDIA ──────────────
  "India": [
    { name: "Mumbai–Delhi Golden Quadrilateral", path: [[18.97,72.82],[22.30,73.20],[24.58,73.71],[26.92,75.79],[28.64,77.22]], color: "#ffd93d" },
    { name: "Delhi–Kolkata", path: [[28.64,77.22],[27.18,78.02],[25.45,81.85],[25.59,85.14],[22.57,88.36]], color: "#ff6b6b" },
    { name: "Mumbai–Chennai", path: [[18.97,72.82],[17.38,78.47],[16.30,80.44],[15.84,78.48],[13.08,80.27]], color: "#a8e6cf" },
    { name: "Delhi–Mumbai Dedicated Freight", path: [[28.64,77.22],[27.49,74.62],[26.92,75.79],[23.02,72.58],[21.19,72.83],[18.97,72.82]], color: "#ffeaa7" },
    { name: "Konkan Railway (Mumbai–Mangalore)", path: [[18.97,72.82],[17.69,73.30],[16.98,73.31],[15.86,74.49],[14.48,74.86],[12.91,74.86]], color: "#74b9ff" },
    { name: "Howrah–Chennai", path: [[22.57,88.36],[20.27,85.84],[19.78,83.44],[17.69,83.22],[16.31,80.44],[15.83,78.49],[13.08,80.27]], color: "#e17055" },
    { name: "Delhi–Jammu Udhampur Rail", path: [[28.64,77.22],[30.22,75.72],[31.31,75.58],[32.73,74.86],[32.72,74.85]], color: "#d63031" },
    { name: "Mumbai–Ahmedabad HSR (Bullet)", path: [[18.97,72.82],[20.60,72.96],[22.30,73.20],[23.02,72.58]], color: "#ff79a8" },
  ],

  // ────────────── SOUTH KOREA ──────────────
  "South Korea": [
    { name: "Seoul–Busan KTX", path: [[37.57,126.98],[36.99,127.11],[36.35,127.38],[35.87,128.61],[35.10,129.04]], color: "#0984e3" },
    { name: "Seoul–Gwangju KTX", path: [[37.57,126.98],[36.99,127.11],[35.84,127.11],[35.18,126.91],[35.15,126.85]], color: "#6c5ce7" },
    { name: "Seoul–Incheon", path: [[37.57,126.98],[37.46,126.71],[37.45,126.45]], color: "#00b894" },
    { name: "Seoul–Gangneung KTX", path: [[37.57,126.98],[37.76,127.38],[37.42,128.30],[37.75,128.90],[37.75,128.88]], color: "#fdcb6e" },
  ],

  // ────────────── FRANCE ──────────────
  "France": [
    { name: "LGV Paris–Lyon–Marseille", path: [[48.85,2.35],[46.31,4.83],[45.75,4.84],[43.30,5.37]], color: "#74b9ff" },
    { name: "LGV Atlantique (Paris–Bordeaux)", path: [[48.85,2.35],[47.39,0.69],[47.22,1.55],[44.84,-0.57]], color: "#a29bfe" },
    { name: "LGV Est (Paris–Strasbourg)", path: [[48.85,2.35],[49.26,4.03],[49.03,6.18],[48.58,7.75]], color: "#fd79a8" },
    { name: "Paris–Rennes TGV", path: [[48.85,2.35],[48.11,1.68],[47.70,1.25],[48.11,-1.68],[48.11,-1.68]], color: "#55efc4" },
  ],

  // ────────────── GERMANY ──────────────
  "Germany": [
    { name: "Cologne–Frankfurt HSR", path: [[50.94,6.96],[50.23,7.10],[50.11,8.68]], color: "#fdcb6e" },
    { name: "Hannover–Würzburg HSR", path: [[52.37,9.73],[51.51,9.42],[50.94,9.94],[50.11,8.68],[49.80,9.94]], color: "#e17055" },
    { name: "Berlin–Munich HSR", path: [[52.52,13.40],[51.34,12.38],[50.83,12.92],[49.45,11.08],[48.14,11.58]], color: "#74b9ff" },
    { name: "Frankfurt–Basel", path: [[50.11,8.68],[49.47,8.47],[48.99,8.40],[47.55,7.59]], color: "#55efc4" },
    { name: "Hamburg–Berlin", path: [[53.55,10.00],[53.09,11.54],[52.52,13.40]], color: "#a29bfe" },
  ],

  // ────────────── UK ──────────────
  "UK": [
    { name: "East Coast Mainline", path: [[51.50,-0.12],[52.64,-1.15],[53.48,-2.24],[53.80,-1.55],[54.98,-1.61],[55.86,-3.19],[56.00,-3.78],[57.15,-2.10],[57.48,-4.23]], color: "#e17055" },
    { name: "West Coast Mainline", path: [[51.50,-0.12],[52.40,-1.51],[52.48,-1.89],[53.48,-2.24],[54.90,-2.94],[55.86,-4.25],[55.86,-4.24]], color: "#74b9ff" },
    { name: "Great Western Mainline", path: [[51.50,-0.12],[51.46,-1.00],[51.38,-2.36],[51.45,-2.59],[51.38,-3.18],[51.49,-3.17]], color: "#a29bfe" },
    { name: "HS1 (London–Channel Tunnel)", path: [[51.50,-0.12],[51.26,1.07],[51.06,1.80],[50.94,1.86]], color: "#ffdd59" },
  ],

  // ────────────── SPAIN ──────────────
  "Spain": [
    { name: "Madrid–Barcelona AVE", path: [[40.42,-3.70],[41.65,-0.89],[41.38,2.18]], color: "#ff6b6b" },
    { name: "Madrid–Sevilla AVE", path: [[40.42,-3.70],[39.86,-4.02],[39.47,-6.37],[37.39,-5.99]], color: "#ffd93d" },
    { name: "Madrid–Valencia AVE", path: [[40.42,-3.70],[39.93,-3.17],[39.47,-0.38],[39.47,-0.38]], color: "#a29bfe" },
    { name: "Madrid–Málaga AVE", path: [[40.42,-3.70],[39.86,-4.02],[38.00,-3.99],[37.39,-5.99],[36.72,-4.42]], color: "#74b9ff" },
    { name: "Madrid–Bilbao AVE", path: [[40.42,-3.70],[41.39,-1.69],[42.85,-2.67],[43.26,-2.93]], color: "#55efc4" },
  ],

  // ────────────── ITALY ──────────────
  "Italy": [
    { name: "Direttissima (Rome–Florence–Milan)", path: [[41.90,12.50],[43.78,11.25],[44.49,11.34],[45.46,9.19]], color: "#ff6b6b" },
    { name: "Turin–Salerno AV", path: [[45.07,7.68],[44.41,8.94],[45.46,9.19],[44.49,11.34],[43.78,11.25],[41.90,12.50],[40.64,15.80],[40.83,14.25]], color: "#ffd93d" },
    { name: "Venice–Trieste", path: [[45.44,12.33],[45.64,13.79],[45.65,13.77]], color: "#74b9ff" },
  ],

  // ────────────── BRAZIL ──────────────
  "Brazil": [
    { name: "São Paulo–Rio CPTM/Trem Bala", path: [[-23.55,-46.63],[-22.90,-43.17]], color: "#ffd93d" },
    { name: "FEPASA (SP–Campinas–BH)", path: [[-23.55,-46.63],[-22.90,-47.07],[-19.92,-43.94]], color: "#ff6b6b" },
    { name: "Norte–Sul Railway", path: [[-5.09,-42.80],[-10.93,-37.07],[-12.97,-38.51],[-15.78,-47.93],[-19.92,-43.94],[-23.55,-46.63]], color: "#a8e6cf" },
    { name: "EFC (Carajás Railway)", path: [[-5.35,-49.10],[-3.72,-43.35],[-2.54,-44.30]], color: "#e17055" },
    { name: "EFVM (Vitória–Minas)", path: [[-20.32,-40.33],[-19.92,-43.94],[-19.49,-44.20]], color: "#74b9ff" },
  ],

  // ────────────── AUSTRALIA ──────────────
  "Australia": [
    { name: "Indian Pacific (Sydney–Perth)", path: [[-33.87,151.21],[-33.87,148.00],[-33.87,140.72],[-31.95,141.47],[-32.45,137.77],[-33.87,121.63],[-31.95,115.86]], color: "#ffd93d" },
    { name: "The Ghan (Adelaide–Darwin)", path: [[-34.93,138.60],[-31.95,136.60],[-27.47,133.00],[-23.70,133.88],[-12.46,130.84]], color: "#ff6b6b" },
    { name: "Brisbane–Sydney", path: [[-27.47,153.03],[-30.50,152.15],[-33.87,151.21]], color: "#74b9ff" },
    { name: "Sydney–Melbourne", path: [[-33.87,151.21],[-35.31,149.13],[-36.37,148.24],[-37.81,144.96]], color: "#a29bfe" },
    { name: "Melbourne–Adelaide", path: [[-37.81,144.96],[-36.07,140.76],[-34.93,138.60]], color: "#55efc4" },
  ],

  // ────────────── CANADA ──────────────
  "Canada": [
    { name: "VIA Rail Corridor (Windsor–Quebec)", path: [[42.31,-83.05],[43.65,-79.38],[45.42,-75.70],[45.50,-73.57],[46.81,-71.21],[47.21,-70.22]], color: "#74b9ff" },
    { name: "Canadian Pacific Transcontinental", path: [[45.50,-73.57],[45.27,-75.70],[49.28,-82.88],[49.89,-97.14],[49.89,-104.62],[51.05,-114.07],[49.25,-123.11]], color: "#e17055" },
    { name: "Canadian National (Edmonton–Prince Rupert)", path: [[53.55,-113.50],[54.00,-118.80],[55.35,-120.75],[55.16,-127.38],[54.31,-130.32]], color: "#a29bfe" },
  ],

  // ────────────── SOUTH AFRICA ──────────────
  "South Africa": [
    { name: "Blue Train (Cape Town–Pretoria)", path: [[-33.93,18.42],[-33.93,19.44],[-30.56,23.91],[-25.75,28.19],[-25.75,28.18]], color: "#74b9ff" },
    { name: "Gautrain (Joburg–Pretoria)", path: [[-26.20,28.04],[-25.75,28.18]], color: "#ffd93d" },
    { name: "Durban–Joburg", path: [[-29.86,30.98],[-27.77,29.94],[-26.20,28.04]], color: "#a8e6cf" },
    { name: "Shosholoza Meyl (Cape–East London)", path: [[-33.93,18.42],[-34.18,22.04],[-32.99,27.91],[-33.02,27.90]], color: "#e17055" },
  ],

  // ────────────── IRAN ──────────────
  "Iran": [
    { name: "Tehran–Isfahan HSR", path: [[35.69,51.39],[34.08,50.00],[32.66,51.67]], color: "#ffd93d" },
    { name: "Tehran–Mashhad HSR", path: [[35.69,51.39],[35.69,53.38],[36.57,57.59],[36.30,59.61]], color: "#ff6b6b" },
    { name: "Trans-Iranian Railway", path: [[37.27,49.98],[35.69,51.39],[34.73,50.86],[33.57,56.22],[27.20,56.27]], color: "#a29bfe" },
    { name: "Tehran–Tabriz", path: [[35.69,51.39],[36.24,48.82],[37.22,49.57],[38.08,46.30]], color: "#74b9ff" },
  ],

  // ────────────── PAKISTAN ──────────────
  "Pakistan": [
    { name: "Karachi–Lahore (Main Line 1)", path: [[24.86,67.01],[25.55,68.77],[26.24,70.60],[29.39,71.68],[31.55,74.34]], color: "#ffd93d" },
    { name: "Lahore–Peshawar", path: [[31.55,74.34],[32.08,72.67],[33.60,73.05],[34.01,71.57],[34.01,71.56]], color: "#ff6b6b" },
    { name: "Pakistan Railways (Karachi–Quetta)", path: [[24.86,67.01],[26.32,66.49],[29.50,66.54],[30.20,66.97],[30.18,66.96]], color: "#74b9ff" },
  ],

  // ────────────── EGYPT ──────────────
  "Egypt": [
    { name: "Cairo–Alexandria", path: [[30.06,31.24],[30.60,31.24],[30.60,30.71],[31.20,29.92]], color: "#ffd93d" },
    { name: "Cairo–Aswan", path: [[30.06,31.24],[27.19,31.18],[26.55,31.70],[24.09,32.90],[23.69,32.79]], color: "#ff6b6b" },
    { name: "Cairo–Port Said", path: [[30.06,31.24],[30.27,31.60],[31.27,32.30]], color: "#74b9ff" },
  ],

  // ────────────── MOROCCO ──────────────
  "Morocco": [
    { name: "Al Boraq HSR (Casablanca–Tangier)", path: [[33.59,-7.62],[34.26,-6.59],[34.02,-5.00],[35.77,-5.80]], color: "#ffd93d" },
    { name: "Casablanca–Marrakech", path: [[33.59,-7.62],[32.90,-8.24],[31.63,-8.00]], color: "#ff6b6b" },
  ],

  // ────────────── NIGERIA ──────────────
  "Nigeria": [
    { name: "Abuja–Kaduna SGR", path: [[9.07,7.40],[9.52,7.43],[10.52,7.44]], color: "#ffd93d" },
    { name: "Lagos–Ibadan SGR", path: [[6.45,3.39],[6.89,3.52],[7.38,3.94]], color: "#ff6b6b" },
    { name: "Warri–Itakpe SGR", path: [[5.52,5.75],[6.13,6.78],[7.60,6.67]], color: "#a8e6cf" },
  ],

  // ────────────── KENYA / EAST AFRICA ──────────────
  "East Africa": [
    { name: "SGR Mombasa–Nairobi–Kisumu", path: [[-4.05,39.67],[-3.37,38.55],[-1.29,36.82],[0.10,35.00],[-0.09,34.75]], color: "#ffd93d" },
    { name: "Tanzania–Zambia TAZARA", path: [[-6.18,35.74],[-8.90,33.46],[-10.77,31.00],[-13.97,28.63],[-15.42,28.28]], color: "#a8e6cf" },
    { name: "Ethiopia Djibouti Railway", path: [[9.02,38.75],[11.59,41.87]], color: "#e17055" },
  ],

  // ────────────── SAUDI ARABIA ──────────────
  "Saudi Arabia": [
    { name: "Haramain HSR (Mecca–Medina)", path: [[21.42,39.83],[22.36,39.11],[24.47,39.61]], color: "#ffd93d" },
    { name: "Riyadh–Dammam", path: [[24.69,46.72],[26.05,49.80]], color: "#ff6b6b" },
    { name: "North–South Railway", path: [[24.69,46.72],[27.53,41.73],[30.64,38.05]], color: "#74b9ff" },
  ],

  // ────────────── ARGENTINA ──────────────
  "Argentina": [
    { name: "Tren Bala BA–Rosario", path: [[-34.61,-58.39],[-33.88,-59.43],[-32.95,-60.69]], color: "#ffd93d" },
    { name: "Buenos Aires–Mar del Plata", path: [[-34.61,-58.39],[-36.30,-57.71],[-38.00,-57.55]], color: "#74b9ff" },
    { name: "Belgrano Norte", path: [[-34.61,-58.39],[-31.40,-64.18],[-29.13,-67.51],[-24.80,-65.41]], color: "#a29bfe" },
  ],

  // ────────────── MEXICO ──────────────
  "Mexico": [
    { name: "Tren Maya", path: [[21.17,-86.85],[20.97,-87.51],[20.53,-88.00],[19.71,-88.19],[18.50,-88.30],[20.97,-89.62],[21.17,-89.66]], color: "#ffd93d" },
    { name: "Mexico City–Querétaro", path: [[19.43,-99.13],[20.58,-100.39],[20.59,-100.39]], color: "#ff6b6b" },
    { name: "FerroMex Pacific Line", path: [[32.50,-117.02],[29.08,-110.95],[27.47,-109.92],[24.80,-107.39],[23.22,-106.42],[21.51,-104.90],[20.68,-103.35],[19.43,-99.13]], color: "#74b9ff" },
  ],

};

window.MILITARY_AIR_BASES = MILITARY_AIR_BASES;
window.NAVAL_BASES = NAVAL_BASES;
window.RAILWAY_LINES = RAILWAY_LINES;
