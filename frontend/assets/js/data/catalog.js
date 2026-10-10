// FILE TỰ SINH bởi tools/generate-catalog.mjs - không sửa tay.
// Giai đoạn 2: dữ liệu này sẽ được thay bằng API từ backend/admin.
window.DT = window.DT || {};
DT.brands = [
 {
  "id": "daikin",
  "name": "Daikin",
  "origin": "Nhật Bản",
  "color": "#0097e0"
 },
 {
  "id": "panasonic",
  "name": "Panasonic",
  "origin": "Nhật Bản",
  "color": "#0a3d91"
 },
 {
  "id": "mitsubishi",
  "name": "Mitsubishi Electric",
  "origin": "Nhật Bản",
  "color": "#e60012"
 },
 {
  "id": "toshiba",
  "name": "Toshiba",
  "origin": "Nhật Bản",
  "color": "#e60012"
 },
 {
  "id": "lg",
  "name": "LG",
  "origin": "Hàn Quốc",
  "color": "#a50034"
 },
 {
  "id": "samsung",
  "name": "Samsung",
  "origin": "Hàn Quốc",
  "color": "#1428a0"
 },
 {
  "id": "casper",
  "name": "Casper",
  "origin": "Thái Lan",
  "color": "#00a0e9"
 },
 {
  "id": "gree",
  "name": "Gree",
  "origin": "Trung Quốc",
  "color": "#004ea2"
 },
 {
  "id": "aqua",
  "name": "Aqua",
  "origin": "Nhật Bản",
  "color": "#0068b7"
 },
 {
  "id": "sharp",
  "name": "Sharp",
  "origin": "Nhật Bản",
  "color": "#e60012"
 },
 {
  "id": "hitachi",
  "name": "Hitachi",
  "origin": "Nhật Bản",
  "color": "#e60027"
 },
 {
  "id": "electrolux",
  "name": "Electrolux",
  "origin": "Thụy Điển",
  "color": "#041e50"
 },
 {
  "id": "sanaky",
  "name": "Sanaky",
  "origin": "Việt Nam",
  "color": "#0b6fb8"
 },
 {
  "id": "alaska",
  "name": "Alaska",
  "origin": "Việt Nam",
  "color": "#1b75bb"
 },
 {
  "id": "ariston",
  "name": "Ariston",
  "origin": "Ý",
  "color": "#00326e"
 },
 {
  "id": "kangaroo",
  "name": "Kangaroo",
  "origin": "Việt Nam",
  "color": "#00954c"
 },
 {
  "id": "dt",
  "name": "D&T Supply",
  "origin": "Việt Nam",
  "color": "#0b5ed7"
 }
];
DT.priceRanges = [
 {
  "v": "0-5",
  "label": "Dưới 5 triệu",
  "min": 0,
  "max": 5000000
 },
 {
  "v": "5-10",
  "label": "5 - 10 triệu",
  "min": 5000000,
  "max": 10000000
 },
 {
  "v": "10-15",
  "label": "10 - 15 triệu",
  "min": 10000000,
  "max": 15000000
 },
 {
  "v": "15-20",
  "label": "15 - 20 triệu",
  "min": 15000000,
  "max": 20000000
 },
 {
  "v": "20-30",
  "label": "20 - 30 triệu",
  "min": 20000000,
  "max": 30000000
 },
 {
  "v": "30-999",
  "label": "Trên 30 triệu",
  "min": 30000000,
  "max": null
 }
];
DT.categories = [
 {
  "id": "may-lanh",
  "name": "Máy lạnh - Điều hòa",
  "short": "Máy lạnh",
  "icon": "snow",
  "art": "ac",
  "subs": [
   {
    "id": "treo-tuong",
    "name": "Máy lạnh treo tường"
   },
   {
    "id": "am-tran",
    "name": "Máy lạnh âm trần cassette"
   },
   {
    "id": "tu-dung",
    "name": "Máy lạnh tủ đứng"
   },
   {
    "id": "ong-gio",
    "name": "Máy lạnh giấu trần ống gió"
   }
  ],
  "filters": [
   {
    "key": "capacity",
    "label": "Công suất",
    "options": [
     "1 HP",
     "1.5 HP",
     "2 HP",
     "2.5 HP",
     "3 HP",
     "4 HP",
     "5 HP"
    ]
   },
   {
    "key": "tech",
    "label": "Công nghệ",
    "options": [
     "Inverter",
     "Non-Inverter"
    ]
   },
   {
    "key": "type",
    "label": "Loại máy",
    "options": [
     "1 chiều",
     "2 chiều"
    ]
   },
   {
    "key": "room",
    "label": "Phạm vi làm lạnh",
    "options": [
     "Dưới 15 m²",
     "15 - 20 m²",
     "20 - 30 m²",
     "30 - 40 m²",
     "Trên 40 m²"
    ]
   }
  ]
 },
 {
  "id": "tu-lanh",
  "name": "Tủ lạnh",
  "short": "Tủ lạnh",
  "icon": "fridge",
  "art": "fridge",
  "subs": [
   {
    "id": "ngan-da-tren",
    "name": "Ngăn đá trên"
   },
   {
    "id": "ngan-da-duoi",
    "name": "Ngăn đá dưới"
   },
   {
    "id": "side-by-side",
    "name": "Side by side"
   },
   {
    "id": "nhieu-cua",
    "name": "Nhiều cửa (Multi door)"
   },
   {
    "id": "mini",
    "name": "Tủ lạnh mini"
   }
  ],
  "filters": [
   {
    "key": "volume",
    "label": "Dung tích",
    "options": [
     "Dưới 150 lít",
     "150 - 300 lít",
     "300 - 450 lít",
     "450 - 600 lít",
     "Trên 600 lít"
    ]
   },
   {
    "key": "tech",
    "label": "Công nghệ",
    "options": [
     "Inverter",
     "Non-Inverter"
    ]
   },
   {
    "key": "family",
    "label": "Số người dùng",
    "options": [
     "1 - 2 người",
     "3 - 4 người",
     "5 - 6 người",
     "Trên 6 người"
    ]
   }
  ]
 },
 {
  "id": "tu-dong-tu-mat",
  "name": "Tủ đông - Tủ mát",
  "short": "Tủ đông, tủ mát",
  "icon": "box",
  "art": "freezer",
  "subs": [
   {
    "id": "tu-dong",
    "name": "Tủ đông"
   },
   {
    "id": "tu-mat",
    "name": "Tủ mát"
   },
   {
    "id": "tu-dong-mat",
    "name": "Tủ đông mát 2 ngăn"
   }
  ],
  "filters": [
   {
    "key": "volume",
    "label": "Dung tích",
    "options": [
     "Dưới 200 lít",
     "200 - 400 lít",
     "400 - 600 lít",
     "Trên 600 lít"
    ]
   },
   {
    "key": "tech",
    "label": "Công nghệ",
    "options": [
     "Inverter",
     "Non-Inverter"
    ]
   },
   {
    "key": "door",
    "label": "Kiểu cửa",
    "options": [
     "Cửa kính",
     "Cửa lật",
     "Cửa trượt"
    ]
   }
  ]
 },
 {
  "id": "may-giat",
  "name": "Máy giặt - Máy sấy",
  "short": "Máy giặt",
  "icon": "washer",
  "art": "washer",
  "subs": [
   {
    "id": "cua-truoc",
    "name": "Máy giặt cửa trước"
   },
   {
    "id": "cua-tren",
    "name": "Máy giặt cửa trên"
   },
   {
    "id": "may-say",
    "name": "Máy sấy quần áo"
   }
  ],
  "filters": [
   {
    "key": "weight",
    "label": "Khối lượng giặt",
    "options": [
     "Dưới 8 kg",
     "8 - 9 kg",
     "9 - 10 kg",
     "Trên 10 kg"
    ]
   },
   {
    "key": "tech",
    "label": "Công nghệ",
    "options": [
     "Inverter",
     "Non-Inverter"
    ]
   }
  ]
 },
 {
  "id": "loc-khong-khi",
  "name": "Lọc không khí - Hút ẩm",
  "short": "Lọc không khí",
  "icon": "wind",
  "art": "purifier",
  "subs": [
   {
    "id": "loc-khong-khi",
    "name": "Máy lọc không khí"
   },
   {
    "id": "hut-am",
    "name": "Máy hút ẩm"
   }
  ],
  "filters": [
   {
    "key": "room",
    "label": "Diện tích phòng",
    "options": [
     "Dưới 30 m²",
     "30 - 50 m²",
     "Trên 50 m²"
    ]
   }
  ]
 },
 {
  "id": "may-nuoc-nong",
  "name": "Máy nước nóng",
  "short": "Máy nước nóng",
  "icon": "drop",
  "art": "heater",
  "subs": [
   {
    "id": "gian-tiep",
    "name": "Máy nước nóng gián tiếp"
   },
   {
    "id": "truc-tiep",
    "name": "Máy nước nóng trực tiếp"
   }
  ],
  "filters": [
   {
    "key": "volume",
    "label": "Dung tích",
    "options": [
     "Trực tiếp",
     "15 - 20 lít",
     "30 lít",
     "Trên 30 lít"
    ]
   }
  ]
 },
 {
  "id": "quat-dieu-hoa",
  "name": "Quạt điều hòa",
  "short": "Quạt điều hòa",
  "icon": "fan",
  "art": "cooler",
  "subs": [
   {
    "id": "gia-dinh",
    "name": "Quạt điều hòa gia đình"
   },
   {
    "id": "cong-nghiep",
    "name": "Quạt điều hòa công nghiệp"
   }
  ],
  "filters": [
   {
    "key": "tank",
    "label": "Dung tích bình",
    "options": [
     "Dưới 30 lít",
     "30 - 60 lít",
     "Trên 60 lít"
    ]
   }
  ]
 },
 {
  "id": "vat-tu-dien-lanh",
  "name": "Vật tư điện lạnh",
  "short": "Vật tư",
  "icon": "tool",
  "art": "supply",
  "subs": [
   {
    "id": "ong-dong",
    "name": "Ống đồng - Bảo ôn"
   },
   {
    "id": "gas",
    "name": "Gas lạnh"
   },
   {
    "id": "phu-kien",
    "name": "Giá đỡ - Phụ kiện"
   }
  ],
  "filters": [
   {
    "key": "kind",
    "label": "Loại vật tư",
    "options": [
     "Ống đồng",
     "Gas lạnh",
     "Giá đỡ",
     "Ống thoát nước",
     "Dụng cụ"
    ]
   }
  ]
 }
];
DT.products = [{"id":1001,"sku":"DT1001","slug":"may-lanh-daikin-inverter-1-hp-ftkb25yvmv","name":"Máy lạnh Daikin Inverter 1 HP FTKB25YVMV","cat":"may-lanh","sub":"treo-tuong","brand":"daikin","price":8930000,"oldPrice":10890000,"rating":4.3,"reviews":156,"sold":60,"stock":12,"badges":["hot"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"19 - 38 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-02-08"},{"id":1002,"sku":"DT1002","slug":"may-lanh-daikin-inverter-1-5-hp-ftkb35yvmv","name":"Máy lạnh Daikin Inverter 1.5 HP FTKB35YVMV","cat":"may-lanh","sub":"treo-tuong","brand":"daikin","price":12050000,"oldPrice":13390000,"rating":4,"reviews":130,"sold":712,"stock":35,"badges":["hot"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.82 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"20 - 39 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-07-19"},{"id":1003,"sku":"DT1003","slug":"may-lanh-daikin-inverter-2-hp-fthf50vavmv","name":"Máy lạnh Daikin Inverter 2 HP FTHF50VAVMV","cat":"may-lanh","sub":"treo-tuong","brand":"daikin","price":18770000,"oldPrice":22890000,"rating":4.1,"reviews":74,"sold":720,"stock":44,"badges":["new"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"2 HP","tech":"Inverter","type":"2 chiều","room":"20 - 30 m²"},"specs":{"Loại máy":"2 chiều, Inverter","Công suất":"2 HP","Công suất làm lạnh":"18.000 BTU","Phạm vi làm lạnh":"20 - 30 m²","Loại gas":"R32","Điện năng tiêu thụ":"1.23 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"21 - 40 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"2 HP (18.000 BTU) • Inverter tiết kiệm điện • 2 chiều","highlights":["Công suất 2 HP - phù hợp phòng 20 - 30 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-27"},{"id":1004,"sku":"DT1004","slug":"may-lanh-panasonic-inverter-1-hp-cu-cs-xu9zkh-8","name":"Máy lạnh Panasonic Inverter 1 HP CU/CS-XU9ZKH-8","cat":"may-lanh","sub":"treo-tuong","brand":"panasonic","price":13480000,"oldPrice":14980000,"rating":4.2,"reviews":7,"sold":1009,"stock":52,"badges":["premium"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"22 - 41 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Malaysia","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-08-15"},{"id":1005,"sku":"DT1005","slug":"may-lanh-panasonic-inverter-1-5-hp-cu-cs-pu12akh-8","name":"Máy lạnh Panasonic Inverter 1.5 HP CU/CS-PU12AKH-8","cat":"may-lanh","sub":"treo-tuong","brand":"panasonic","price":11540000,"oldPrice":13580000,"rating":4.9,"reviews":62,"sold":260,"stock":22,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.82 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"23 - 42 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-03"},{"id":1006,"sku":"DT1006","slug":"may-lanh-mitsubishi-electric-inverter-1-5-hp-msy-jw35vf","name":"Máy lạnh Mitsubishi Electric Inverter 1.5 HP MSY-JW35VF","cat":"may-lanh","sub":"treo-tuong","brand":"mitsubishi","price":12310000,"oldPrice":14480000,"rating":4.3,"reviews":204,"sold":1521,"stock":39,"badges":["hot"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.82 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"24 - 43 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-09-17"},{"id":1007,"sku":"DT1007","slug":"may-lanh-mitsubishi-electric-inverter-1-hp-msz-ht25vf","name":"Máy lạnh Mitsubishi Electric Inverter 1 HP MSZ-HT25VF","cat":"may-lanh","sub":"treo-tuong","brand":"mitsubishi","price":10640000,"oldPrice":12980000,"rating":4.1,"reviews":23,"sold":210,"stock":20,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"2 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"2 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"25 - 38 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 2 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-03-16"},{"id":1008,"sku":"DT1008","slug":"may-lanh-toshiba-inverter-1-hp-ras-h10c4kcvg-v","name":"Máy lạnh Toshiba Inverter 1 HP RAS-H10C4KCVG-V","cat":"may-lanh","sub":"treo-tuong","brand":"toshiba","price":8180000,"oldPrice":9980000,"rating":4.1,"reviews":23,"sold":1495,"stock":19,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"26 - 39 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Malaysia","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-03-23"},{"id":1009,"sku":"DT1009","slug":"may-lanh-lg-inverter-1-hp-v10win1","name":"Máy lạnh LG Inverter 1 HP V10WIN1","cat":"may-lanh","sub":"treo-tuong","brand":"lg","price":7110000,"oldPrice":9480000,"rating":4.2,"reviews":149,"sold":884,"stock":46,"badges":["bestseller"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"19 - 40 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-03-02"},{"id":1010,"sku":"DT1010","slug":"may-lanh-lg-inverter-1-5-hp-v13apiuv","name":"Máy lạnh LG Inverter 1.5 HP V13APIUV","cat":"may-lanh","sub":"treo-tuong","brand":"lg","price":12300000,"oldPrice":13980000,"rating":4.9,"reviews":146,"sold":1596,"stock":2,"badges":["new"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.82 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"20 - 41 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-11"},{"id":1011,"sku":"DT1011","slug":"may-lanh-samsung-inverter-1-hp-ar10dyhzawknsv","name":"Máy lạnh Samsung Inverter 1 HP AR10DYHZAWKNSV","cat":"may-lanh","sub":"treo-tuong","brand":"samsung","price":7860000,"oldPrice":10480000,"rating":4.4,"reviews":126,"sold":719,"stock":36,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"21 - 42 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Malaysia","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-02-16"},{"id":1012,"sku":"DT1012","slug":"may-lanh-samsung-inverter-1-5-hp-ar13dyhzawknsv","name":"Máy lạnh Samsung Inverter 1.5 HP AR13DYHZAWKNSV","cat":"may-lanh","sub":"treo-tuong","brand":"samsung","price":11850000,"oldPrice":12880000,"rating":4.7,"reviews":174,"sold":934,"stock":57,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.82 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"22 - 43 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-09-17"},{"id":1013,"sku":"DT1013","slug":"may-lanh-casper-inverter-1-hp-tc-09is36","name":"Máy lạnh Casper Inverter 1 HP TC-09IS36","cat":"may-lanh","sub":"treo-tuong","brand":"casper","price":5930000,"oldPrice":6980000,"rating":4.7,"reviews":168,"sold":1072,"stock":31,"badges":["bestseller"],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"23 - 38 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-01-25"},{"id":1014,"sku":"DT1014","slug":"may-lanh-casper-1-5-hp-kc-12fc32","name":"Máy lạnh Casper 1.5 HP KC-12FC32","cat":"may-lanh","sub":"treo-tuong","brand":"casper","price":5610000,"oldPrice":7480000,"rating":4.8,"reviews":180,"sold":367,"stock":14,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Non-Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Non-Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"1.10 kW/h","Nhãn năng lượng":"3 sao","Độ ồn dàn lạnh":"24 - 39 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Máy nén thường • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Làm lạnh nhanh, vận hành bền bỉ","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-07-27"},{"id":1015,"sku":"DT1015","slug":"may-lanh-gree-1-hp-gwc09pb-k3d0p4","name":"Máy lạnh Gree 1 HP GWC09PB-K3D0P4","cat":"may-lanh","sub":"treo-tuong","brand":"gree","price":5700000,"oldPrice":6480000,"rating":4.9,"reviews":52,"sold":1409,"stock":49,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Non-Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Non-Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.83 kW/h","Nhãn năng lượng":"3 sao","Độ ồn dàn lạnh":"25 - 40 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Máy nén thường • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Làm lạnh nhanh, vận hành bền bỉ","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-06-10"},{"id":1016,"sku":"DT1016","slug":"may-lanh-aqua-inverter-1-hp-aqa-rv10qe","name":"Máy lạnh Aqua Inverter 1 HP AQA-RV10QE","cat":"may-lanh","sub":"treo-tuong","brand":"aqua","price":7630000,"oldPrice":8480000,"rating":4,"reviews":12,"sold":1301,"stock":53,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1 HP","tech":"Inverter","type":"1 chiều","room":"Dưới 15 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1 HP","Công suất làm lạnh":"9.000 BTU","Phạm vi làm lạnh":"Dưới 15 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.61 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"26 - 41 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Malaysia","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1 HP (9.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1 HP - phù hợp phòng Dưới 15 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-03-05"},{"id":1017,"sku":"DT1017","slug":"may-lanh-sharp-inverter-1-5-hp-ah-xp13ymw","name":"Máy lạnh Sharp Inverter 1.5 HP AH-XP13YMW","cat":"may-lanh","sub":"treo-tuong","brand":"sharp","price":10380000,"oldPrice":11280000,"rating":4.4,"reviews":38,"sold":1569,"stock":18,"badges":[],"gift":"Tặng gói vệ sinh máy lạnh 1 năm (2 lần)","installment":true,"freeInstall":true,"attrs":{"capacity":"1.5 HP","tech":"Inverter","type":"1 chiều","room":"15 - 20 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"1.5 HP","Công suất làm lạnh":"12.000 BTU","Phạm vi làm lạnh":"15 - 20 m²","Loại gas":"R32","Điện năng tiêu thụ":"0.82 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"19 - 42 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac","color":"white"},"images":["art:0","art:1","art:2"],"short":"1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 1.5 HP - phù hợp phòng 15 - 20 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Chế độ ngủ đêm, hẹn giờ, tự làm sạch dàn lạnh","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-10"},{"id":1018,"sku":"DT1018","slug":"may-lanh-am-tran-daikin-inverter-3-hp-fcfc71dvm","name":"Máy lạnh âm trần Daikin Inverter 3 HP FCFC71DVM","cat":"may-lanh","sub":"am-tran","brand":"daikin","price":31890000,"oldPrice":38890000,"rating":4.3,"reviews":28,"sold":1498,"stock":28,"badges":["project"],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"3 HP","tech":"Inverter","type":"1 chiều","room":"Trên 40 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"3 HP","Công suất làm lạnh":"28.000 BTU","Phạm vi làm lạnh":"Trên 40 m²","Loại gas":"R32","Điện năng tiêu thụ":"1.91 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"20 - 43 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Malaysia","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac-cassette","color":"white"},"images":["art:0","art:1","art:2"],"short":"3 HP (28.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 3 HP - phù hợp phòng Trên 40 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-02-03"},{"id":1019,"sku":"DT1019","slug":"may-lanh-am-tran-panasonic-inverter-4-hp-s-3448pu3h","name":"Máy lạnh âm trần Panasonic Inverter 4 HP S-3448PU3H","cat":"may-lanh","sub":"am-tran","brand":"panasonic","price":37630000,"oldPrice":45890000,"rating":4.3,"reviews":169,"sold":650,"stock":31,"badges":["project"],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"4 HP","tech":"Inverter","type":"1 chiều","room":"Trên 40 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"4 HP","Công suất làm lạnh":"36.000 BTU","Phạm vi làm lạnh":"Trên 40 m²","Loại gas":"R32","Điện năng tiêu thụ":"2.46 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"21 - 38 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac-cassette","color":"white"},"images":["art:0","art:1","art:2"],"short":"4 HP (36.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 4 HP - phù hợp phòng Trên 40 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-08"},{"id":1020,"sku":"DT1020","slug":"may-lanh-am-tran-lg-inverter-2-hp-ztnq18gpla0","name":"Máy lạnh âm trần LG Inverter 2 HP ZTNQ18GPLA0","cat":"may-lanh","sub":"am-tran","brand":"lg","price":23710000,"oldPrice":27890000,"rating":4.5,"reviews":118,"sold":1581,"stock":17,"badges":["project"],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"2 HP","tech":"Inverter","type":"1 chiều","room":"20 - 30 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"2 HP","Công suất làm lạnh":"18.000 BTU","Phạm vi làm lạnh":"20 - 30 m²","Loại gas":"R32","Điện năng tiêu thụ":"1.23 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"22 - 39 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac-cassette","color":"white"},"images":["art:0","art:1","art:2"],"short":"2 HP (18.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 2 HP - phù hợp phòng 20 - 30 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-14"},{"id":1021,"sku":"DT1021","slug":"may-lanh-tu-dung-daikin-inverter-4-hp-fva100amvm","name":"Máy lạnh tủ đứng Daikin Inverter 4 HP FVA100AMVM","cat":"may-lanh","sub":"tu-dung","brand":"daikin","price":39670000,"oldPrice":52890000,"rating":4.3,"reviews":113,"sold":1203,"stock":2,"badges":["project"],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"4 HP","tech":"Inverter","type":"1 chiều","room":"Trên 40 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"4 HP","Công suất làm lạnh":"36.000 BTU","Phạm vi làm lạnh":"Trên 40 m²","Loại gas":"R32","Điện năng tiêu thụ":"2.46 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"23 - 40 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac-floor","color":"white"},"images":["art:0","art:1","art:2"],"short":"4 HP (36.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 4 HP - phù hợp phòng Trên 40 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-16"},{"id":1022,"sku":"DT1022","slug":"may-lanh-tu-dung-gree-2-5-hp-gvc24ag-k6nnc7a","name":"Máy lạnh tủ đứng Gree 2.5 HP GVC24AG-K6NNC7A","cat":"may-lanh","sub":"tu-dung","brand":"gree","price":24740000,"oldPrice":26890000,"rating":4.9,"reviews":32,"sold":246,"stock":57,"badges":[],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"2.5 HP","tech":"Non-Inverter","type":"1 chiều","room":"30 - 40 m²"},"specs":{"Loại máy":"1 chiều, Non-Inverter","Công suất":"2.5 HP","Công suất làm lạnh":"24.000 BTU","Phạm vi làm lạnh":"30 - 40 m²","Loại gas":"R32","Điện năng tiêu thụ":"2.20 kW/h","Nhãn năng lượng":"3 sao","Độ ồn dàn lạnh":"24 - 41 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 7 năm"},"art":{"type":"ac-floor","color":"white"},"images":["art:0","art:1","art:2"],"short":"2.5 HP (24.000 BTU) • Máy nén thường • 1 chiều","highlights":["Công suất 2.5 HP - phù hợp phòng 30 - 40 m²","Làm lạnh nhanh, vận hành bền bỉ","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 7 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-13"},{"id":1023,"sku":"DT1023","slug":"may-lanh-giau-tran-ong-gio-mitsubishi-electric-inverter-2-hp-pey-sm50ja","name":"Máy lạnh giấu trần ống gió Mitsubishi Electric Inverter 2 HP PEY-SM50JA","cat":"may-lanh","sub":"ong-gio","brand":"mitsubishi","price":26150000,"oldPrice":31890000,"rating":4.8,"reviews":66,"sold":1046,"stock":7,"badges":["project"],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"2 HP","tech":"Inverter","type":"1 chiều","room":"20 - 30 m²"},"specs":{"Loại máy":"1 chiều, Inverter","Công suất":"2 HP","Công suất làm lạnh":"18.000 BTU","Phạm vi làm lạnh":"20 - 30 m²","Loại gas":"R32","Điện năng tiêu thụ":"1.23 kW/h","Nhãn năng lượng":"5 sao (Hiệu suất năng lượng cao)","Độ ồn dàn lạnh":"25 - 42 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac-duct","color":"white"},"images":["art:0","art:1","art:2"],"short":"2 HP (18.000 BTU) • Inverter tiết kiệm điện • 1 chiều","highlights":["Công suất 2 HP - phù hợp phòng 20 - 30 m²","Công nghệ Inverter tiết kiệm đến 60% điện năng","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-03-06"},{"id":1024,"sku":"DT1024","slug":"may-lanh-giau-tran-ong-gio-daikin-5-hp-fdbnq48mv1","name":"Máy lạnh giấu trần ống gió Daikin 5 HP FDBNQ48MV1","cat":"may-lanh","sub":"ong-gio","brand":"daikin","price":39910000,"oldPrice":49890000,"rating":4.3,"reviews":238,"sold":501,"stock":14,"badges":["project"],"gift":"Khảo sát & tư vấn thiết kế miễn phí","installment":true,"freeInstall":false,"attrs":{"capacity":"5 HP","tech":"Non-Inverter","type":"1 chiều","room":"Trên 40 m²"},"specs":{"Loại máy":"1 chiều, Non-Inverter","Công suất":"5 HP","Công suất làm lạnh":"48.000 BTU","Phạm vi làm lạnh":"Trên 40 m²","Loại gas":"R32","Điện năng tiêu thụ":"4.40 kW/h","Nhãn năng lượng":"3 sao","Độ ồn dàn lạnh":"26 - 43 dB","Chế độ":"Làm lạnh nhanh, Ngủ đêm, Hẹn giờ, Hút ẩm","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 5 năm"},"art":{"type":"ac-duct","color":"white"},"images":["art:0","art:1","art:2"],"short":"5 HP (48.000 BTU) • Máy nén thường • 1 chiều","highlights":["Công suất 5 HP - phù hợp phòng Trên 40 m²","Làm lạnh nhanh, vận hành bền bỉ","Gas R32 thân thiện môi trường, hiệu suất cao","Phù hợp văn phòng, nhà xưởng, showroom","Bảo hành máy nén 5 năm chính hãng"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-10"},{"id":1025,"sku":"DT1025","slug":"tu-lanh-samsung-inverter-236-lit-rt22m4032bu-sv","name":"Tủ lạnh Samsung Inverter 236 lít RT22M4032BU/SV","cat":"tu-lanh","sub":"ngan-da-tren","brand":"samsung","price":5700000,"oldPrice":6480000,"rating":4.1,"reviews":92,"sold":1552,"stock":26,"badges":["bestseller"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"150 - 300 lít","tech":"Inverter","family":"3 - 4 người"},"specs":{"Kiểu tủ":"Ngăn đá trên","Dung tích tổng":"236 lít","Dung tích ngăn đá":"66 lít","Dung tích ngăn lạnh":"170 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.0 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Indonesia","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge","color":"silver"},"images":["art:0","art:1","art:2"],"short":"236 lít • 3 - 4 người • Inverter","highlights":["Dung tích 236 lít, phù hợp gia đình 3 - 4 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-08-06"},{"id":1026,"sku":"DT1026","slug":"tu-lanh-panasonic-inverter-306-lit-nr-bv331bpkv","name":"Tủ lạnh Panasonic Inverter 306 lít NR-BV331BPKV","cat":"tu-lanh","sub":"ngan-da-duoi","brand":"panasonic","price":10480000,"oldPrice":13980000,"rating":4.3,"reviews":75,"sold":1059,"stock":31,"badges":["hot"],"gift":"Tặng bộ hộp bảo quản thực phẩm cao cấp","installment":true,"freeInstall":false,"attrs":{"volume":"300 - 450 lít","tech":"Inverter","family":"5 - 6 người"},"specs":{"Kiểu tủ":"Ngăn đá dưới","Dung tích tổng":"306 lít","Dung tích ngăn đá":"86 lít","Dung tích ngăn lạnh":"220 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.1 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge","color":"black"},"images":["art:0","art:1","art:2"],"short":"306 lít • 5 - 6 người • Inverter","highlights":["Dung tích 306 lít, phù hợp gia đình 5 - 6 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-24"},{"id":1027,"sku":"DT1027","slug":"tu-lanh-lg-inverter-264-lit-gr-b256jds","name":"Tủ lạnh LG Inverter 264 lít GR-B256JDS","cat":"tu-lanh","sub":"ngan-da-tren","brand":"lg","price":6780000,"oldPrice":7980000,"rating":4.3,"reviews":172,"sold":996,"stock":40,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"150 - 300 lít","tech":"Inverter","family":"3 - 4 người"},"specs":{"Kiểu tủ":"Ngăn đá trên","Dung tích tổng":"264 lít","Dung tích ngăn đá":"74 lít","Dung tích ngăn lạnh":"190 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.0 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Indonesia","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge","color":"silver"},"images":["art:0","art:1","art:2"],"short":"264 lít • 3 - 4 người • Inverter","highlights":["Dung tích 264 lít, phù hợp gia đình 3 - 4 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-09-03"},{"id":1028,"sku":"DT1028","slug":"tu-lanh-lg-inverter-635-lit-gr-x257js","name":"Tủ lạnh LG Inverter 635 lít GR-X257JS","cat":"tu-lanh","sub":"side-by-side","brand":"lg","price":21730000,"oldPrice":28980000,"rating":4.5,"reviews":164,"sold":884,"stock":46,"badges":["premium"],"gift":"Tặng bộ hộp bảo quản thực phẩm cao cấp","installment":true,"freeInstall":false,"attrs":{"volume":"Trên 600 lít","tech":"Inverter","family":"Trên 6 người"},"specs":{"Kiểu tủ":"Side by side","Dung tích tổng":"635 lít","Dung tích ngăn đá":"178 lít","Dung tích ngăn lạnh":"457 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.7 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge-sbs","color":"silver"},"images":["art:0","art:1","art:2"],"short":"635 lít • Trên 6 người • Inverter","highlights":["Dung tích 635 lít, phù hợp gia đình Trên 6 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-19"},{"id":1029,"sku":"DT1029","slug":"tu-lanh-samsung-inverter-647-lit-rs62r5001b4-sv","name":"Tủ lạnh Samsung Inverter 647 lít RS62R5001B4/SV","cat":"tu-lanh","sub":"side-by-side","brand":"samsung","price":21230000,"oldPrice":24980000,"rating":4.8,"reviews":80,"sold":960,"stock":2,"badges":["hot"],"gift":"Tặng bộ hộp bảo quản thực phẩm cao cấp","installment":true,"freeInstall":false,"attrs":{"volume":"Trên 600 lít","tech":"Inverter","family":"Trên 6 người"},"specs":{"Kiểu tủ":"Side by side","Dung tích tổng":"647 lít","Dung tích ngăn đá":"181 lít","Dung tích ngăn lạnh":"466 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.7 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge-sbs","color":"black"},"images":["art:0","art:1","art:2"],"short":"647 lít • Trên 6 người • Inverter","highlights":["Dung tích 647 lít, phù hợp gia đình Trên 6 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-03-18"},{"id":1030,"sku":"DT1030","slug":"tu-lanh-toshiba-inverter-249-lit-gr-rt325we-pmv","name":"Tủ lạnh Toshiba Inverter 249 lít GR-RT325WE-PMV","cat":"tu-lanh","sub":"ngan-da-tren","brand":"toshiba","price":6050000,"oldPrice":6880000,"rating":4.5,"reviews":9,"sold":1355,"stock":35,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"150 - 300 lít","tech":"Inverter","family":"3 - 4 người"},"specs":{"Kiểu tủ":"Ngăn đá trên","Dung tích tổng":"249 lít","Dung tích ngăn đá":"70 lít","Dung tích ngăn lạnh":"179 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.0 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge","color":"silver"},"images":["art:0","art:1","art:2"],"short":"249 lít • 3 - 4 người • Inverter","highlights":["Dung tích 249 lít, phù hợp gia đình 3 - 4 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-06-25"},{"id":1031,"sku":"DT1031","slug":"tu-lanh-aqua-inverter-212-lit-aqr-t239fa-hb","name":"Tủ lạnh Aqua Inverter 212 lít AQR-T239FA(HB)","cat":"tu-lanh","sub":"ngan-da-tren","brand":"aqua","price":4380000,"oldPrice":5480000,"rating":4.7,"reviews":173,"sold":957,"stock":41,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"150 - 300 lít","tech":"Inverter","family":"3 - 4 người"},"specs":{"Kiểu tủ":"Ngăn đá trên","Dung tích tổng":"212 lít","Dung tích ngăn đá":"59 lít","Dung tích ngăn lạnh":"153 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.0 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Indonesia","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge","color":"silver"},"images":["art:0","art:1","art:2"],"short":"212 lít • 3 - 4 người • Inverter","highlights":["Dung tích 212 lít, phù hợp gia đình 3 - 4 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-07-26"},{"id":1032,"sku":"DT1032","slug":"tu-lanh-hitachi-inverter-540-lit-r-fw690pgv7","name":"Tủ lạnh Hitachi Inverter 540 lít R-FW690PGV7","cat":"tu-lanh","sub":"nhieu-cua","brand":"hitachi","price":33910000,"oldPrice":39890000,"rating":4.7,"reviews":145,"sold":769,"stock":46,"badges":["premium"],"gift":"Tặng bộ hộp bảo quản thực phẩm cao cấp","installment":true,"freeInstall":false,"attrs":{"volume":"450 - 600 lít","tech":"Inverter","family":"Trên 6 người"},"specs":{"Kiểu tủ":"Nhiều cửa (Multi door)","Dung tích tổng":"540 lít","Dung tích ngăn đá":"151 lít","Dung tích ngăn lạnh":"389 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.5 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Indonesia","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge-multi","color":"gold"},"images":["art:0","art:1","art:2"],"short":"540 lít • Trên 6 người • Inverter","highlights":["Dung tích 540 lít, phù hợp gia đình Trên 6 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-12"},{"id":1033,"sku":"DT1033","slug":"tu-lanh-sharp-inverter-626-lit-sj-fx688vg-bk","name":"Tủ lạnh Sharp Inverter 626 lít SJ-FX688VG-BK","cat":"tu-lanh","sub":"nhieu-cua","brand":"sharp","price":28780000,"oldPrice":31980000,"rating":4.3,"reviews":45,"sold":995,"stock":36,"badges":["new"],"gift":"Tặng bộ hộp bảo quản thực phẩm cao cấp","installment":true,"freeInstall":false,"attrs":{"volume":"Trên 600 lít","tech":"Inverter","family":"Trên 6 người"},"specs":{"Kiểu tủ":"Nhiều cửa (Multi door)","Dung tích tổng":"626 lít","Dung tích ngăn đá":"175 lít","Dung tích ngăn lạnh":"451 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.6 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Indonesia","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge-multi","color":"black"},"images":["art:0","art:1","art:2"],"short":"626 lít • Trên 6 người • Inverter","highlights":["Dung tích 626 lít, phù hợp gia đình Trên 6 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-24"},{"id":1034,"sku":"DT1034","slug":"tu-lanh-electrolux-inverter-335-lit-ebb3702k-h","name":"Tủ lạnh Electrolux Inverter 335 lít EBB3702K-H","cat":"tu-lanh","sub":"ngan-da-duoi","brand":"electrolux","price":11860000,"oldPrice":13480000,"rating":4.6,"reviews":226,"sold":400,"stock":44,"badges":[],"gift":"Tặng bộ hộp bảo quản thực phẩm cao cấp","installment":true,"freeInstall":false,"attrs":{"volume":"300 - 450 lít","tech":"Inverter","family":"5 - 6 người"},"specs":{"Kiểu tủ":"Ngăn đá dưới","Dung tích tổng":"335 lít","Dung tích ngăn đá":"94 lít","Dung tích ngăn lạnh":"241 lít","Công nghệ":"Inverter","Điện năng tiêu thụ":"~1.2 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Thái Lan","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge","color":"black"},"images":["art:0","art:1","art:2"],"short":"335 lít • 5 - 6 người • Inverter","highlights":["Dung tích 335 lít, phù hợp gia đình 5 - 6 người","Máy nén Inverter vận hành êm, tiết kiệm điện","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-03-26"},{"id":1035,"sku":"DT1035","slug":"tu-lanh-aqua-90-lit-aqr-d99fa-bs","name":"Tủ lạnh Aqua 90 lít AQR-D99FA(BS)","cat":"tu-lanh","sub":"mini","brand":"aqua","price":2960000,"oldPrice":3480000,"rating":4.7,"reviews":75,"sold":666,"stock":40,"badges":[],"gift":null,"installment":false,"freeInstall":false,"attrs":{"volume":"Dưới 150 lít","tech":"Non-Inverter","family":"1 - 2 người"},"specs":{"Kiểu tủ":"Tủ lạnh mini","Dung tích tổng":"90 lít","Dung tích ngăn đá":"25 lít","Dung tích ngăn lạnh":"65 lít","Công nghệ":"Non-Inverter","Điện năng tiêu thụ":"~0.8 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Indonesia","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge-mini","color":"silver"},"images":["art:0","art:1","art:2"],"short":"90 lít • 1 - 2 người • Tiết kiệm điện","highlights":["Dung tích 90 lít, phù hợp gia đình 1 - 2 người","Thiết kế nhỏ gọn, dễ bố trí","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-09-10"},{"id":1036,"sku":"DT1036","slug":"tu-lanh-sanaky-140-lit-vh-148hp","name":"Tủ lạnh Sanaky 140 lít VH-148HP","cat":"tu-lanh","sub":"mini","brand":"sanaky","price":3640000,"oldPrice":4280000,"rating":4.9,"reviews":164,"sold":1512,"stock":49,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"Dưới 150 lít","tech":"Non-Inverter","family":"1 - 2 người"},"specs":{"Kiểu tủ":"Tủ lạnh mini","Dung tích tổng":"140 lít","Dung tích ngăn đá":"39 lít","Dung tích ngăn lạnh":"101 lít","Công nghệ":"Non-Inverter","Điện năng tiêu thụ":"~0.8 kW/ngày","Chất liệu khay":"Kính chịu lực","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 10 năm"},"art":{"type":"fridge-mini","color":"silver"},"images":["art:0","art:1","art:2"],"short":"140 lít • 1 - 2 người • Tiết kiệm điện","highlights":["Dung tích 140 lít, phù hợp gia đình 1 - 2 người","Thiết kế nhỏ gọn, dễ bố trí","Làm lạnh đa chiều, giữ thực phẩm tươi lâu","Khử mùi, kháng khuẩn bằng than hoạt tính / ion"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-23"},{"id":1037,"sku":"DT1037","slug":"tu-dong-sanaky-inverter-400-lit-vh-4099a4k","name":"Tủ đông Sanaky Inverter 400 lít VH-4099A4K","cat":"tu-dong-tu-mat","sub":"tu-dong","brand":"sanaky","price":9180000,"oldPrice":9980000,"rating":4.6,"reviews":204,"sold":447,"stock":40,"badges":["bestseller"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"400 - 600 lít","tech":"Inverter","door":"Cửa lật"},"specs":{"Loại tủ":"Tủ đông","Dung tích":"400 lít","Kiểu cửa":"Cửa lật","Nhiệt độ":"-18°C ~ -24°C","Dàn lạnh":"Ống đồng","Công nghệ":"Inverter","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 36 tháng"},"art":{"type":"freezer","color":"white"},"images":["art:0","art:1","art:2"],"short":"400 lít • Cửa lật • Dàn lạnh ống đồng","highlights":["Dung tích 400 lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp","Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền","Inverter tiết kiệm 30-40% điện năng","Có khóa an toàn, bánh xe di chuyển"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-07-11"},{"id":1038,"sku":"DT1038","slug":"tu-mat-sanaky-300-lit-vh-308k3l","name":"Tủ mát Sanaky 300 lít VH-308K3L","cat":"tu-dong-tu-mat","sub":"tu-mat","brand":"sanaky","price":6730000,"oldPrice":7480000,"rating":4.3,"reviews":29,"sold":1433,"stock":47,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"200 - 400 lít","tech":"Non-Inverter","door":"Cửa kính"},"specs":{"Loại tủ":"Tủ mát","Dung tích":"300 lít","Kiểu cửa":"Cửa kính","Nhiệt độ":"0°C ~ 10°C","Dàn lạnh":"Ống đồng","Công nghệ":"Non-Inverter","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 36 tháng"},"art":{"type":"cooler-cabinet","color":"white"},"images":["art:0","art:1","art:2"],"short":"300 lít • Cửa kính • Dàn lạnh ống đồng","highlights":["Dung tích 300 lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp","Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền","Gas R600a thân thiện môi trường","Có khóa an toàn, bánh xe di chuyển"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-07-26"},{"id":1039,"sku":"DT1039","slug":"tu-dong-mat-alaska-500-lit-bcd-5068c","name":"Tủ đông mát Alaska 500 lít BCD-5068C","cat":"tu-dong-tu-mat","sub":"tu-dong-mat","brand":"alaska","price":8910000,"oldPrice":10480000,"rating":4.8,"reviews":228,"sold":1101,"stock":22,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"400 - 600 lít","tech":"Non-Inverter","door":"Cửa lật"},"specs":{"Loại tủ":"Tủ đông mát","Dung tích":"500 lít","Kiểu cửa":"Cửa lật","Nhiệt độ":"-18°C ~ -24°C","Dàn lạnh":"Ống đồng","Công nghệ":"Non-Inverter","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 36 tháng"},"art":{"type":"freezer","color":"white"},"images":["art:0","art:1","art:2"],"short":"500 lít • Cửa lật • Dàn lạnh ống đồng","highlights":["Dung tích 500 lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp","Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền","Gas R600a thân thiện môi trường","Có khóa an toàn, bánh xe di chuyển"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-12"},{"id":1040,"sku":"DT1040","slug":"tu-mat-alaska-inverter-600-lit-lc-633hi","name":"Tủ mát Alaska Inverter 600 lít LC-633HI","cat":"tu-dong-tu-mat","sub":"tu-mat","brand":"alaska","price":14060000,"oldPrice":15980000,"rating":4.7,"reviews":223,"sold":760,"stock":39,"badges":["project"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"Trên 600 lít","tech":"Inverter","door":"Cửa kính"},"specs":{"Loại tủ":"Tủ mát","Dung tích":"600 lít","Kiểu cửa":"Cửa kính","Nhiệt độ":"0°C ~ 10°C","Dàn lạnh":"Ống đồng","Công nghệ":"Inverter","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 36 tháng"},"art":{"type":"cooler-cabinet","color":"white"},"images":["art:0","art:1","art:2"],"short":"600 lít • Cửa kính • Dàn lạnh ống đồng","highlights":["Dung tích 600 lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp","Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền","Inverter tiết kiệm 30-40% điện năng","Có khóa an toàn, bánh xe di chuyển"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-07-17"},{"id":1041,"sku":"DT1041","slug":"tu-dong-aqua-365-lit-aqf-c4201e","name":"Tủ đông Aqua 365 lít AQF-C4201E","cat":"tu-dong-tu-mat","sub":"tu-dong","brand":"aqua","price":6780000,"oldPrice":7980000,"rating":4.2,"reviews":215,"sold":697,"stock":57,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"200 - 400 lít","tech":"Non-Inverter","door":"Cửa lật"},"specs":{"Loại tủ":"Tủ đông","Dung tích":"365 lít","Kiểu cửa":"Cửa lật","Nhiệt độ":"-18°C ~ -24°C","Dàn lạnh":"Ống đồng","Công nghệ":"Non-Inverter","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 36 tháng"},"art":{"type":"freezer","color":"white"},"images":["art:0","art:1","art:2"],"short":"365 lít • Cửa lật • Dàn lạnh ống đồng","highlights":["Dung tích 365 lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp","Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền","Gas R600a thân thiện môi trường","Có khóa an toàn, bánh xe di chuyển"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-05-13"},{"id":1042,"sku":"DT1042","slug":"tu-mat-sanaky-800-lit-vh-8009k","name":"Tủ mát Sanaky 800 lít VH-8009K","cat":"tu-dong-tu-mat","sub":"tu-mat","brand":"sanaky","price":18770000,"oldPrice":22890000,"rating":4.1,"reviews":177,"sold":739,"stock":1,"badges":["project"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"volume":"Trên 600 lít","tech":"Non-Inverter","door":"Cửa trượt"},"specs":{"Loại tủ":"Tủ mát","Dung tích":"800 lít","Kiểu cửa":"Cửa trượt","Nhiệt độ":"0°C ~ 10°C","Dàn lạnh":"Ống đồng","Công nghệ":"Non-Inverter","Xuất xứ":"Việt Nam","Bảo hành":"Máy 24 tháng, máy nén 36 tháng"},"art":{"type":"cooler-cabinet","color":"white"},"images":["art:0","art:1","art:2"],"short":"800 lít • Cửa trượt • Dàn lạnh ống đồng","highlights":["Dung tích 800 lít - phù hợp cửa hàng, nhà hàng, bếp ăn công nghiệp","Dàn lạnh ống đồng 100%, làm lạnh nhanh, bền","Gas R600a thân thiện môi trường","Có khóa an toàn, bánh xe di chuyển"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-19"},{"id":1043,"sku":"DT1043","slug":"may-giat-lg-inverter-10-kg-fv1410s4b","name":"Máy giặt LG Inverter 10 kg FV1410S4B","cat":"may-giat","sub":"cua-truoc","brand":"lg","price":11030000,"oldPrice":12980000,"rating":4,"reviews":47,"sold":935,"stock":11,"badges":["bestseller"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"9 - 10 kg","tech":"Inverter"},"specs":{"Loại máy":"Máy giặt cửa trước","Khối lượng":"10 kg","Công nghệ":"Inverter","Tốc độ quay":"1200 - 1400 vòng/phút","Số chương trình":"20 chương trình","Xuất xứ":"Việt Nam","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer","color":"black"},"images":["art:0","art:1","art:2"],"short":"10 kg • cửa trước • Inverter","highlights":["Khối lượng 10 kg - phù hợp gia đình 4-6 người","Động cơ Inverter êm ái, bền bỉ","Giặt hơi nước diệt khuẩn 99.9%","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-01-12"},{"id":1044,"sku":"DT1044","slug":"may-giat-samsung-inverter-9-kg-ww90t634dle-sv","name":"Máy giặt Samsung Inverter 9 kg WW90T634DLE/SV","cat":"may-giat","sub":"cua-truoc","brand":"samsung","price":8610000,"oldPrice":11480000,"rating":4.3,"reviews":7,"sold":1268,"stock":58,"badges":["hot"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"8 - 9 kg","tech":"Inverter"},"specs":{"Loại máy":"Máy giặt cửa trước","Khối lượng":"9 kg","Công nghệ":"Inverter","Tốc độ quay":"1200 - 1400 vòng/phút","Số chương trình":"19 chương trình","Xuất xứ":"Thái Lan","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer","color":"white"},"images":["art:0","art:1","art:2"],"short":"9 kg • cửa trước • Inverter","highlights":["Khối lượng 9 kg - phù hợp gia đình 4-6 người","Động cơ Inverter êm ái, bền bỉ","Giặt hơi nước diệt khuẩn 99.9%","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-17"},{"id":1045,"sku":"DT1045","slug":"may-giat-electrolux-inverter-9-kg-ewf9024p5wb","name":"Máy giặt Electrolux Inverter 9 kg EWF9024P5WB","cat":"may-giat","sub":"cua-truoc","brand":"electrolux","price":9660000,"oldPrice":10980000,"rating":4.1,"reviews":155,"sold":1395,"stock":41,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"8 - 9 kg","tech":"Inverter"},"specs":{"Loại máy":"Máy giặt cửa trước","Khối lượng":"9 kg","Công nghệ":"Inverter","Tốc độ quay":"1200 - 1400 vòng/phút","Số chương trình":"19 chương trình","Xuất xứ":"Thái Lan","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer","color":"white"},"images":["art:0","art:1","art:2"],"short":"9 kg • cửa trước • Inverter","highlights":["Khối lượng 9 kg - phù hợp gia đình 4-6 người","Động cơ Inverter êm ái, bền bỉ","Giặt hơi nước diệt khuẩn 99.9%","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-02-13"},{"id":1046,"sku":"DT1046","slug":"may-giat-panasonic-inverter-10-kg-na-fd10vr1bv","name":"Máy giặt Panasonic Inverter 10 kg NA-FD10VR1BV","cat":"may-giat","sub":"cua-tren","brand":"panasonic","price":8590000,"oldPrice":10480000,"rating":4.3,"reviews":119,"sold":257,"stock":12,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"9 - 10 kg","tech":"Inverter"},"specs":{"Loại máy":"Máy giặt cửa trên","Khối lượng":"10 kg","Công nghệ":"Inverter","Tốc độ quay":"1200 - 1400 vòng/phút","Số chương trình":"20 chương trình","Xuất xứ":"Thái Lan","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer-top","color":"silver"},"images":["art:0","art:1","art:2"],"short":"10 kg • cửa trên • Inverter","highlights":["Khối lượng 10 kg - phù hợp gia đình 4-6 người","Động cơ Inverter êm ái, bền bỉ","Giặt hơi nước diệt khuẩn 99.9%","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-07-20"},{"id":1047,"sku":"DT1047","slug":"may-giat-toshiba-8-5-kg-aw-m905bv-mk","name":"Máy giặt Toshiba 8.5 kg AW-M905BV(MK)","cat":"may-giat","sub":"cua-tren","brand":"toshiba","price":4380000,"oldPrice":5480000,"rating":4.2,"reviews":156,"sold":577,"stock":24,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"8 - 9 kg","tech":"Non-Inverter"},"specs":{"Loại máy":"Máy giặt cửa trên","Khối lượng":"8.5 kg","Công nghệ":"Non-Inverter","Tốc độ quay":"1200 - 1400 vòng/phút","Số chương trình":"18 chương trình","Xuất xứ":"Thái Lan","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer-top","color":"silver"},"images":["art:0","art:1","art:2"],"short":"8.5 kg • cửa trên • Tiết kiệm nước","highlights":["Khối lượng 8.5 kg - phù hợp gia đình 4-6 người","Vận hành ổn định, dễ sử dụng","Giặt hơi nước diệt khuẩn 99.9%","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-07-27"},{"id":1048,"sku":"DT1048","slug":"may-giat-aqua-8-kg-aqw-s80ct","name":"Máy giặt Aqua 8 kg AQW-S80CT","cat":"may-giat","sub":"cua-tren","brand":"aqua","price":3510000,"oldPrice":4280000,"rating":4.9,"reviews":205,"sold":225,"stock":48,"badges":["bestseller"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"8 - 9 kg","tech":"Non-Inverter"},"specs":{"Loại máy":"Máy giặt cửa trên","Khối lượng":"8 kg","Công nghệ":"Non-Inverter","Tốc độ quay":"1200 - 1400 vòng/phút","Số chương trình":"18 chương trình","Xuất xứ":"Thái Lan","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer-top","color":"white"},"images":["art:0","art:1","art:2"],"short":"8 kg • cửa trên • Tiết kiệm nước","highlights":["Khối lượng 8 kg - phù hợp gia đình 4-6 người","Vận hành ổn định, dễ sử dụng","Giặt hơi nước diệt khuẩn 99.9%","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-02-11"},{"id":1049,"sku":"DT1049","slug":"may-say-electrolux-8-5-kg-edv854j3wb","name":"Máy sấy Electrolux 8.5 kg EDV854J3WB","cat":"may-giat","sub":"may-say","brand":"electrolux","price":8480000,"oldPrice":9980000,"rating":4.4,"reviews":70,"sold":923,"stock":53,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"8 - 9 kg","tech":"Non-Inverter"},"specs":{"Loại máy":"Máy sấy quần áo","Khối lượng":"8.5 kg","Công nghệ":"Non-Inverter","Tốc độ quay":"-","Số chương trình":"18 chương trình","Xuất xứ":"Thái Lan","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer","color":"white"},"images":["art:0","art:1","art:2"],"short":"8.5 kg • Máy sấy quần áo • Tiết kiệm nước","highlights":["Khối lượng 8.5 kg - phù hợp gia đình 4-6 người","Vận hành ổn định, dễ sử dụng","Sấy bơm nhiệt / thông hơi, chống nhăn","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-11"},{"id":1050,"sku":"DT1050","slug":"may-say-lg-inverter-9-kg-dvhp09b","name":"Máy sấy LG Inverter 9 kg DVHP09B","cat":"may-giat","sub":"may-say","brand":"lg","price":14380000,"oldPrice":17980000,"rating":4.2,"reviews":160,"sold":1000,"stock":51,"badges":["premium"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"weight":"8 - 9 kg","tech":"Inverter"},"specs":{"Loại máy":"Máy sấy quần áo","Khối lượng":"9 kg","Công nghệ":"Inverter","Tốc độ quay":"-","Số chương trình":"19 chương trình","Xuất xứ":"Việt Nam","Bảo hành":"24 tháng, động cơ 10 năm"},"art":{"type":"washer","color":"black"},"images":["art:0","art:1","art:2"],"short":"9 kg • Máy sấy quần áo • Inverter","highlights":["Khối lượng 9 kg - phù hợp gia đình 4-6 người","Động cơ Inverter êm ái, bền bỉ","Sấy bơm nhiệt / thông hơi, chống nhăn","Khóa trẻ em, hẹn giờ kết thúc"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-18"},{"id":1051,"sku":"DT1051","slug":"may-loc-khong-khi-sharp-fp-j30e-b","name":"Máy lọc không khí Sharp FP-J30E-B","cat":"loc-khong-khi","sub":"loc-khong-khi","brand":"sharp","price":2610000,"oldPrice":3480000,"rating":4.6,"reviews":177,"sold":1057,"stock":48,"badges":["bestseller"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"room":"Dưới 30 m²"},"specs":{"Loại máy":"Máy lọc không khí","Diện tích sử dụng":"Dưới 30 m²","Màng lọc":"HEPA + than hoạt tính","Độ ồn":"22 - 48 dB","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng"},"art":{"type":"purifier","color":"white"},"images":["art:0","art:1","art:2"],"short":"Phòng Dưới 30 m² • Lọc HEPA • Cảm biến bụi mịn PM2.5","highlights":["Màng lọc HEPA lọc 99.97% bụi mịn PM2.5","Cảm biến chất lượng không khí tự động","Vận hành êm chế độ ngủ","Phù hợp phòng Dưới 30 m²"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-04"},{"id":1052,"sku":"DT1052","slug":"may-loc-khong-khi-daikin-mc55uvm6","name":"Máy lọc không khí Daikin MC55UVM6","cat":"loc-khong-khi","sub":"loc-khong-khi","brand":"daikin","price":7360000,"oldPrice":8980000,"rating":4,"reviews":92,"sold":160,"stock":36,"badges":["hot"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"room":"30 - 50 m²"},"specs":{"Loại máy":"Máy lọc không khí","Diện tích sử dụng":"30 - 50 m²","Màng lọc":"HEPA + than hoạt tính","Độ ồn":"22 - 48 dB","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng"},"art":{"type":"purifier","color":"white"},"images":["art:0","art:1","art:2"],"short":"Phòng 30 - 50 m² • Lọc HEPA • Cảm biến bụi mịn PM2.5","highlights":["Màng lọc HEPA lọc 99.97% bụi mịn PM2.5","Cảm biến chất lượng không khí tự động","Vận hành êm chế độ ngủ","Phù hợp phòng 30 - 50 m²"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-04-22"},{"id":1053,"sku":"DT1053","slug":"may-loc-khong-khi-samsung-ax60r5080wd-sv","name":"Máy lọc không khí Samsung AX60R5080WD/SV","cat":"loc-khong-khi","sub":"loc-khong-khi","brand":"samsung","price":8780000,"oldPrice":9980000,"rating":4.3,"reviews":174,"sold":693,"stock":43,"badges":["premium"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"room":"Trên 50 m²"},"specs":{"Loại máy":"Máy lọc không khí","Diện tích sử dụng":"Trên 50 m²","Màng lọc":"HEPA + than hoạt tính","Độ ồn":"22 - 48 dB","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng"},"art":{"type":"purifier","color":"white"},"images":["art:0","art:1","art:2"],"short":"Phòng Trên 50 m² • Lọc HEPA • Cảm biến bụi mịn PM2.5","highlights":["Màng lọc HEPA lọc 99.97% bụi mịn PM2.5","Cảm biến chất lượng không khí tự động","Vận hành êm chế độ ngủ","Phù hợp phòng Trên 50 m²"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-09-10"},{"id":1054,"sku":"DT1054","slug":"may-hut-am-sharp-dw-d20a-w","name":"Máy hút ẩm Sharp DW-D20A-W","cat":"loc-khong-khi","sub":"hut-am","brand":"sharp","price":6360000,"oldPrice":7480000,"rating":4.8,"reviews":168,"sold":548,"stock":53,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"room":"30 - 50 m²"},"specs":{"Loại máy":"Máy hút ẩm","Diện tích sử dụng":"30 - 50 m²","Màng lọc":"HEPA + than hoạt tính","Độ ồn":"22 - 48 dB","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng"},"art":{"type":"dehumidifier","color":"white"},"images":["art:0","art:1","art:2"],"short":"Phòng 30 - 50 m² • Lọc HEPA • Cảm biến bụi mịn PM2.5","highlights":["Màng lọc HEPA lọc 99.97% bụi mịn PM2.5","Cảm biến chất lượng không khí tự động","Vận hành êm chế độ ngủ","Phù hợp phòng 30 - 50 m²"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-13"},{"id":1055,"sku":"DT1055","slug":"may-hut-am-kangaroo-kgdh20","name":"Máy hút ẩm Kangaroo KGDH20","cat":"loc-khong-khi","sub":"hut-am","brand":"kangaroo","price":3380000,"oldPrice":3980000,"rating":4.7,"reviews":239,"sold":1577,"stock":40,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"room":"Dưới 30 m²"},"specs":{"Loại máy":"Máy hút ẩm","Diện tích sử dụng":"Dưới 30 m²","Màng lọc":"HEPA + than hoạt tính","Độ ồn":"22 - 48 dB","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng"},"art":{"type":"dehumidifier","color":"white"},"images":["art:0","art:1","art:2"],"short":"Phòng Dưới 30 m² • Lọc HEPA • Cảm biến bụi mịn PM2.5","highlights":["Màng lọc HEPA lọc 99.97% bụi mịn PM2.5","Cảm biến chất lượng không khí tự động","Vận hành êm chế độ ngủ","Phù hợp phòng Dưới 30 m²"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-21"},{"id":1056,"sku":"DT1056","slug":"may-nuoc-nong-gian-tiep-ariston-sl2-20-rs-2-5-fe","name":"Máy nước nóng gián tiếp Ariston SL2 20 RS 2.5 FE","cat":"may-nuoc-nong","sub":"gian-tiep","brand":"ariston","price":2780000,"oldPrice":3480000,"rating":4.5,"reviews":130,"sold":1603,"stock":40,"badges":["bestseller"],"gift":null,"installment":false,"freeInstall":true,"attrs":{"volume":"15 - 20 lít"},"specs":{"Loại":"Gián tiếp","Dung tích":"15 - 20 lít","Công suất":"2500 W","Chống giật":"ELCB","Xuất xứ":"Việt Nam","Bảo hành":"Bình chứa 7 năm, linh kiện 24 tháng"},"art":{"type":"heater","color":"white"},"images":["art:0","art:1","art:2"],"short":"15 - 20 lít • Chống giật ELCB • Tiết kiệm điện","highlights":["Chống giật ELCB an toàn tuyệt đối","Thanh đốt bằng đồng/titan bền bỉ","Làm nóng nhanh, giữ nhiệt lâu","Lắp đặt miễn phí nội thành"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-19"},{"id":1057,"sku":"DT1057","slug":"may-nuoc-nong-gian-tiep-ariston-an2-30-lux-2-5-fe","name":"Máy nước nóng gián tiếp Ariston AN2 30 LUX 2.5 FE","cat":"may-nuoc-nong","sub":"gian-tiep","brand":"ariston","price":4230000,"oldPrice":4980000,"rating":4.4,"reviews":86,"sold":1630,"stock":6,"badges":[],"gift":null,"installment":true,"freeInstall":true,"attrs":{"volume":"30 lít"},"specs":{"Loại":"Gián tiếp","Dung tích":"30 lít","Công suất":"2500 W","Chống giật":"ELCB","Xuất xứ":"Việt Nam","Bảo hành":"Bình chứa 7 năm, linh kiện 24 tháng"},"art":{"type":"heater","color":"white"},"images":["art:0","art:1","art:2"],"short":"30 lít • Chống giật ELCB • Tiết kiệm điện","highlights":["Chống giật ELCB an toàn tuyệt đối","Thanh đốt bằng đồng/titan bền bỉ","Làm nóng nhanh, giữ nhiệt lâu","Lắp đặt miễn phí nội thành"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-01-24"},{"id":1058,"sku":"DT1058","slug":"may-nuoc-nong-truc-tiep-panasonic-dh-4rl1vw","name":"Máy nước nóng trực tiếp Panasonic DH-4RL1VW","cat":"may-nuoc-nong","sub":"truc-tiep","brand":"panasonic","price":3580000,"oldPrice":3980000,"rating":4.4,"reviews":5,"sold":177,"stock":50,"badges":["hot"],"gift":null,"installment":true,"freeInstall":true,"attrs":{"volume":"Trực tiếp"},"specs":{"Loại":"Trực tiếp","Dung tích":"Trực tiếp","Công suất":"2500 W","Chống giật":"ELCB","Xuất xứ":"Việt Nam","Bảo hành":"Bình chứa 7 năm, linh kiện 24 tháng"},"art":{"type":"heater","color":"white"},"images":["art:0","art:1","art:2"],"short":"Trực tiếp • Chống giật ELCB • Tiết kiệm điện","highlights":["Chống giật ELCB an toàn tuyệt đối","Thanh đốt bằng đồng/titan bền bỉ","Làm nóng nhanh, giữ nhiệt lâu","Lắp đặt miễn phí nội thành"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-02-01"},{"id":1059,"sku":"DT1059","slug":"may-nuoc-nong-gian-tiep-kangaroo-kg69a3","name":"Máy nước nóng gián tiếp Kangaroo KG69A3","cat":"may-nuoc-nong","sub":"gian-tiep","brand":"kangaroo","price":2790000,"oldPrice":3280000,"rating":4.9,"reviews":176,"sold":1357,"stock":46,"badges":[],"gift":null,"installment":false,"freeInstall":true,"attrs":{"volume":"Trên 30 lít"},"specs":{"Loại":"Gián tiếp","Dung tích":"Trên 30 lít","Công suất":"2500 W","Chống giật":"ELCB","Xuất xứ":"Việt Nam","Bảo hành":"Bình chứa 7 năm, linh kiện 24 tháng"},"art":{"type":"heater","color":"white"},"images":["art:0","art:1","art:2"],"short":"Trên 30 lít • Chống giật ELCB • Tiết kiệm điện","highlights":["Chống giật ELCB an toàn tuyệt đối","Thanh đốt bằng đồng/titan bền bỉ","Làm nóng nhanh, giữ nhiệt lâu","Lắp đặt miễn phí nội thành"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-06-26"},{"id":1060,"sku":"DT1060","slug":"may-nuoc-nong-truc-tiep-alaska-alt-45","name":"Máy nước nóng trực tiếp Alaska ALT-45","cat":"may-nuoc-nong","sub":"truc-tiep","brand":"alaska","price":1920000,"oldPrice":2180000,"rating":4.3,"reviews":66,"sold":1678,"stock":7,"badges":[],"gift":null,"installment":false,"freeInstall":true,"attrs":{"volume":"Trực tiếp"},"specs":{"Loại":"Trực tiếp","Dung tích":"Trực tiếp","Công suất":"2500 W","Chống giật":"ELCB","Xuất xứ":"Việt Nam","Bảo hành":"Bình chứa 7 năm, linh kiện 24 tháng"},"art":{"type":"heater","color":"white"},"images":["art:0","art:1","art:2"],"short":"Trực tiếp • Chống giật ELCB • Tiết kiệm điện","highlights":["Chống giật ELCB an toàn tuyệt đối","Thanh đốt bằng đồng/titan bền bỉ","Làm nóng nhanh, giữ nhiệt lâu","Lắp đặt miễn phí nội thành"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-09-01"},{"id":1061,"sku":"DT1061","slug":"quat-dieu-hoa-kangaroo-kg50f79","name":"Quạt điều hòa Kangaroo KG50F79","cat":"quat-dieu-hoa","sub":"gia-dinh","brand":"kangaroo","price":2380000,"oldPrice":2980000,"rating":4.3,"reviews":210,"sold":641,"stock":58,"badges":["bestseller"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"tank":"Dưới 30 lít"},"specs":{"Loại":"Gia đình","Dung tích bình nước":"Dưới 30 lít","Lưu lượng gió":"4.500 m³/h","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng"},"art":{"type":"cooler","color":"white"},"images":["art:0","art:1","art:2"],"short":"Bình Dưới 30 lít • Làm mát bằng hơi nước • Tiết kiệm 80% điện","highlights":["Làm mát bằng hơi nước tự nhiên","Tiết kiệm đến 80% điện năng so với máy lạnh","Phù hợp phòng khách, phòng ngủ","Điều khiển từ xa, hẹn giờ"],"warranty":"24 tháng","flashSale":true,"createdAt":"2026-08-12"},{"id":1062,"sku":"DT1062","slug":"quat-dieu-hoa-sanaky-snk-4500a","name":"Quạt điều hòa Sanaky SNK-4500A","cat":"quat-dieu-hoa","sub":"gia-dinh","brand":"sanaky","price":3550000,"oldPrice":4180000,"rating":4.6,"reviews":169,"sold":299,"stock":9,"badges":[],"gift":null,"installment":true,"freeInstall":false,"attrs":{"tank":"30 - 60 lít"},"specs":{"Loại":"Gia đình","Dung tích bình nước":"30 - 60 lít","Lưu lượng gió":"4.500 m³/h","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng"},"art":{"type":"cooler","color":"white"},"images":["art:0","art:1","art:2"],"short":"Bình 30 - 60 lít • Làm mát bằng hơi nước • Tiết kiệm 80% điện","highlights":["Làm mát bằng hơi nước tự nhiên","Tiết kiệm đến 80% điện năng so với máy lạnh","Phù hợp phòng khách, phòng ngủ","Điều khiển từ xa, hẹn giờ"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-18"},{"id":1063,"sku":"DT1063","slug":"quat-dieu-hoa-cong-nghiep-kangaroo-kg50f68","name":"Quạt điều hòa công nghiệp Kangaroo KG50F68","cat":"quat-dieu-hoa","sub":"cong-nghiep","brand":"kangaroo","price":7180000,"oldPrice":8980000,"rating":4.8,"reviews":137,"sold":981,"stock":5,"badges":["project"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"tank":"Trên 60 lít"},"specs":{"Loại":"Công nghiệp","Dung tích bình nước":"Trên 60 lít","Lưu lượng gió":"18.000 m³/h","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng"},"art":{"type":"cooler","color":"white"},"images":["art:0","art:1","art:2"],"short":"Bình Trên 60 lít • Làm mát bằng hơi nước • Tiết kiệm 80% điện","highlights":["Làm mát bằng hơi nước tự nhiên","Tiết kiệm đến 80% điện năng so với máy lạnh","Phù hợp nhà xưởng, kho bãi, căng tin","Điều khiển từ xa, hẹn giờ"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-08-17"},{"id":1064,"sku":"DT1064","slug":"quat-dieu-hoa-cong-nghiep-d-t-supply-dt-ac18000","name":"Quạt điều hòa công nghiệp D&T Supply DT-AC18000","cat":"quat-dieu-hoa","sub":"cong-nghiep","brand":"dt","price":10960000,"oldPrice":12890000,"rating":4.4,"reviews":118,"sold":75,"stock":42,"badges":["project"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"tank":"Trên 60 lít"},"specs":{"Loại":"Công nghiệp","Dung tích bình nước":"Trên 60 lít","Lưu lượng gió":"18.000 m³/h","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng"},"art":{"type":"cooler","color":"white"},"images":["art:0","art:1","art:2"],"short":"Bình Trên 60 lít • Làm mát bằng hơi nước • Tiết kiệm 80% điện","highlights":["Làm mát bằng hơi nước tự nhiên","Tiết kiệm đến 80% điện năng so với máy lạnh","Phù hợp nhà xưởng, kho bãi, căng tin","Điều khiển từ xa, hẹn giờ"],"warranty":"24 tháng","flashSale":false,"createdAt":"2026-05-06"},{"id":1065,"sku":"DT1065","slug":"ong-dong-may-lanh-thai-lan-6-10-cuon-15m","name":"Ống đồng máy lạnh Thái Lan 6/10 (cuộn 15m)","cat":"vat-tu-dien-lanh","sub":"ong-dong","brand":"dt","price":1790000,"oldPrice":1880000,"rating":4.6,"reviews":111,"sold":1492,"stock":37,"badges":["b2b"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"kind":"Ống đồng"},"specs":{"Loại vật tư":"Ống đồng","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"pipe","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-08-02"},{"id":1066,"sku":"DT1066","slug":"ong-dong-may-lanh-6-12-day-0-71mm-cuon-15m","name":"Ống đồng máy lạnh 6/12 dày 0.71mm (cuộn 15m)","cat":"vat-tu-dien-lanh","sub":"ong-dong","brand":"dt","price":2170000,"oldPrice":2280000,"rating":4.6,"reviews":38,"sold":1664,"stock":26,"badges":["b2b"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"kind":"Ống đồng"},"specs":{"Loại vật tư":"Ống đồng","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"pipe","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-03-04"},{"id":1067,"sku":"DT1067","slug":"gas-lanh-r32-chemours-binh-9kg","name":"Gas lạnh R32 Chemours bình 9kg","cat":"vat-tu-dien-lanh","sub":"gas","brand":"dt","price":2360000,"oldPrice":2480000,"rating":4.4,"reviews":50,"sold":1775,"stock":9,"badges":["b2b"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"kind":"Gas lạnh"},"specs":{"Loại vật tư":"Gas lạnh","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Mỹ","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"gas","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-06-10"},{"id":1068,"sku":"DT1068","slug":"gas-lanh-r410a-honeywell-binh-11-3kg","name":"Gas lạnh R410A Honeywell bình 11.3kg","cat":"vat-tu-dien-lanh","sub":"gas","brand":"dt","price":3120000,"oldPrice":3280000,"rating":4.8,"reviews":99,"sold":1264,"stock":29,"badges":["b2b"],"gift":null,"installment":true,"freeInstall":false,"attrs":{"kind":"Gas lạnh"},"specs":{"Loại vật tư":"Gas lạnh","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"gas","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-08-13"},{"id":1069,"sku":"DT1069","slug":"gia-do-cuc-nong-may-lanh-1-2-5hp-inox","name":"Giá đỡ cục nóng máy lạnh 1-2.5HP inox","cat":"vat-tu-dien-lanh","sub":"phu-kien","brand":"dt","price":360000,"oldPrice":380000,"rating":4.1,"reviews":192,"sold":745,"stock":57,"badges":["b2b"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"kind":"Giá đỡ"},"specs":{"Loại vật tư":"Giá đỡ","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Việt Nam","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"bracket","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-04-25"},{"id":1070,"sku":"DT1070","slug":"ong-thoat-nuoc-ruot-ga-may-lanh-cuon-50m","name":"Ống thoát nước ruột gà máy lạnh (cuộn 50m)","cat":"vat-tu-dien-lanh","sub":"phu-kien","brand":"dt","price":270000,"oldPrice":280000,"rating":4.2,"reviews":104,"sold":1243,"stock":18,"badges":["b2b"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"kind":"Ống thoát nước"},"specs":{"Loại vật tư":"Ống thoát nước","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Mỹ","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"pipe-drain","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-04-25"},{"id":1071,"sku":"DT1071","slug":"bo-dong-ho-nap-gas-value-vmg-2-r32","name":"Bộ đồng hồ nạp gas Value VMG-2-R32","cat":"vat-tu-dien-lanh","sub":"phu-kien","brand":"dt","price":1500000,"oldPrice":1580000,"rating":4.9,"reviews":217,"sold":577,"stock":18,"badges":["b2b"],"gift":null,"installment":false,"freeInstall":false,"attrs":{"kind":"Dụng cụ"},"specs":{"Loại vật tư":"Dụng cụ","Đơn vị tính":"Cuộn / Bình / Bộ","Chứng từ":"CO/CQ, hóa đơn VAT","Xuất xứ":"Thái Lan","Bảo hành":"12 tháng (lỗi NSX)"},"art":{"type":"gauge","color":"white"},"images":["art:0","art:1","art:2"],"short":"Hàng chính hãng • Có CO/CQ • Giá sỉ cho thợ & dự án","highlights":["Hàng chính hãng, đầy đủ CO/CQ","Giá sỉ theo số lượng cho thợ, đại lý, dự án","Xuất hóa đơn VAT","Giao nhanh 2h nội thành"],"warranty":"12 tháng","flashSale":false,"createdAt":"2026-01-19"}];
