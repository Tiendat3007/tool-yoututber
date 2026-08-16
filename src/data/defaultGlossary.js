// Từ điển Tu Tiên - Huyền Huyễn - Xuyên Không Mặc Định (Đã đồng bộ chuẩn Master Script)

export const DEFAULT_GLOSSARY = [
  // 1. Cảnh Giới Tu Luyện (Cultivation Realms)
  { id: 'cg1', zh: '炼气', vi: 'Luyện Khí', category: 'canh_gioi', enabled: true },
  { id: 'cg2', zh: '筑基', vi: 'Trúc Cơ', category: 'canh_gioi', enabled: true },
  { id: 'cg3', zh: '金丹', vi: 'Kim Đan', category: 'canh_gioi', enabled: true },
  { id: 'cg4', zh: '元婴', vi: 'Nguyên Anh', category: 'canh_gioi', enabled: true },
  { id: 'cg5', zh: '化神', vi: 'Hóa Thần', category: 'canh_gioi', enabled: true },
  { id: 'cg6', zh: '炼虚', vi: 'Luyện Hư', category: 'canh_gioi', enabled: true },
  { id: 'cg7', zh: '合体', vi: 'Hợp Thể', category: 'canh_gioi', enabled: true },
  { id: 'cg8', zh: '大乘', vi: 'Đại Thừa', category: 'canh_gioi', enabled: true },
  { id: 'cg9', zh: '渡劫', vi: 'Độ Kiếp', category: 'canh_gioi', enabled: true },
  { id: 'cg10', zh: '真仙', vi: 'Chân Tiên', category: 'canh_gioi', enabled: true },
  { id: 'cg11', zh: '金仙', vi: 'Kim Tiên', category: 'canh_gioi', enabled: true },
  { id: 'cg12', zh: '仙王', vi: 'Tiên Vương', category: 'canh_gioi', enabled: true },
  { id: 'cg13', zh: '仙帝', vi: 'Tiên Đế', category: 'canh_gioi', enabled: true },

  // Cấp Bậc Cảnh Giới
  { id: 'cb1', zh: '初期', vi: 'sơ kỳ', category: 'canh_gioi', enabled: true },
  { id: 'cb2', zh: '中期', vi: 'trung kỳ', category: 'canh_gioi', enabled: true },
  { id: 'cb3', zh: '后期', vi: 'hậu kỳ', category: 'canh_gioi', enabled: true },
  { id: 'cb4', zh: '巅峰', vi: 'đỉnh phong', category: 'canh_gioi', enabled: true },
  { id: 'cb5', zh: '圆满', vi: 'viên mãn', category: 'canh_gioi', enabled: true },
  { id: 'cb6', zh: '突破', vi: 'đột phá', category: 'canh_gioi', enabled: true },
  { id: 'cb7', zh: '越级挑战', vi: 'vượt cấp khiêu chiến', category: 'canh_gioi', enabled: true },

  // 2. Xưng Hô & Quyền Uy (Pronouns & Addressing)
  { id: 'xh1', zh: '本座', vi: 'Bổn tọa', category: 'xung_ho', enabled: true },
  { id: 'xh2', zh: '本尊', vi: 'Bổn tôn', category: 'xung_ho', enabled: true },
  { id: 'xh3', zh: '本帝', vi: 'Bổn đế', category: 'xung_ho', enabled: true },
  { id: 'xh4', zh: '本王', vi: 'Bổn vương', category: 'xung_ho', enabled: true },
  { id: 'xh5', zh: '老夫', vi: 'Lão phu', category: 'xung_ho', enabled: true },
  { id: 'xh6', zh: '小友', vi: 'Tiểu hữu', category: 'xung_ho', enabled: true },
  { id: 'xh7', zh: '兄台', vi: 'Huynh đài', category: 'xung_ho', enabled: true },
  { id: 'xh8', zh: '仙子', vi: 'Tiên tử', category: 'xung_ho', enabled: true },
  { id: 'xh9', zh: '前辈', vi: 'tiền bối', category: 'xung_ho', enabled: true },
  { id: 'xh10', zh: '晚辈', vi: 'vãn bối', category: 'xung_ho', enabled: true },
  { id: 'xh11', zh: '师尊', vi: 'sư tôn', category: 'xung_ho', enabled: true },
  { id: 'xh12', zh: '师父', vi: 'sư phụ', category: 'xung_ho', enabled: true },
  { id: 'xh13', zh: '徒儿', vi: 'đồ nhi', category: 'xung_ho', enabled: true },
  { id: 'xh14', zh: '道友', vi: 'đạo hữu', category: 'xung_ho', enabled: true },
  { id: 'xh15', zh: '阁下', vi: 'các hạ', category: 'xung_ho', enabled: true },
  { id: 'xh16', zh: '师兄', vi: 'sư huynh', category: 'xung_ho', enabled: true },
  { id: 'xh17', zh: '师姐', vi: 'sư tỷ', category: 'xung_ho', enabled: true },
  { id: 'xh18', zh: '师弟', vi: 'sư đệ', category: 'xung_ho', enabled: true },
  { id: 'xh19', zh: '师妹', vi: 'sư muội', category: 'xung_ho', enabled: true },

  // 3. Thuật Ngữ & Khái Niệm Tu Tiên
  { id: 'tn1', zh: '功法', vi: 'công pháp', category: 'thuat_ngu', enabled: true },
  { id: 'tn2', zh: '武技', vi: 'võ kỹ', category: 'thuat_ngu', enabled: true },
  { id: 'tn3', zh: '秘术', vi: 'bí thuật', category: 'thuat_ngu', enabled: true },
  { id: 'tn4', zh: '神通', vi: 'thần thông', category: 'thuat_ngu', enabled: true },
  { id: 'tn5', zh: '法术', vi: 'pháp thuật', category: 'thuat_ngu', enabled: true },
  { id: 'tn6', zh: '剑诀', vi: 'kiếm quyết', category: 'thuat_ngu', enabled: true },
  { id: 'tn7', zh: '心法', vi: 'tâm pháp', category: 'thuat_ngu', enabled: true },
  { id: 'tn8', zh: '灵气', vi: 'linh khí', category: 'thuat_ngu', enabled: true },
  { id: 'tn9', zh: '神识', vi: 'thần thức', category: 'thuat_ngu', enabled: true },
  { id: 'tn10', zh: '洞府', vi: 'động phủ', category: 'thuat_ngu', enabled: true },
  { id: 'tn11', zh: '丹田', vi: 'đan điền', category: 'thuat_ngu', enabled: true },
  { id: 'tn12', zh: '悟道', vi: 'ngộ đạo', category: 'thuat_ngu', enabled: true },
  { id: 'tn13', zh: '大道', vi: 'đại đạo', category: 'thuat_ngu', enabled: true },
  { id: 'tn14', zh: '天道', vi: 'Thiên Đạo', category: 'thuat_ngu', enabled: true },
  { id: 'tn15', zh: '天劫', vi: 'thiên kiếp', category: 'thuat_ngu', enabled: true },
  { id: 'tn16', zh: '雷劫', vi: 'lôi kiếp', category: 'thuat_ngu', enabled: true },
  { id: 'tn17', zh: '天罚', vi: 'thiên phạt', category: 'thuat_ngu', enabled: true },

  // 4. Pháp Bảo & Binh Khí
  { id: 'pb1', zh: '法宝', vi: 'pháp bảo', category: 'vat_pham', enabled: true },
  { id: 'pb2', zh: '灵器', vi: 'linh khí', category: 'vat_pham', enabled: true },
  { id: 'pb3', zh: '仙器', vi: 'tiên khí', category: 'vat_pham', enabled: true },
  { id: 'pb4', zh: '神器', vi: 'thần khí', category: 'vat_pham', enabled: true },
  { id: 'pb5', zh: '飞剑', vi: 'phi kiếm', category: 'vat_pham', enabled: true },
  { id: 'pb6', zh: '灵剑', vi: 'linh kiếm', category: 'vat_pham', enabled: true },

  // 5. Đan Dược & Tài Nguyên
  { id: 'dd1', zh: '丹药', vi: 'đan dược', category: 'vat_pham', enabled: true },
  { id: 'dd2', zh: '筑基丹', vi: 'Trúc Cơ Đan', category: 'vat_pham', enabled: true },
  { id: 'dd3', zh: '聚气丹', vi: 'Tụ Khí Đan', category: 'vat_pham', enabled: true },
  { id: 'dd4', zh: '灵石', vi: 'linh thạch', category: 'vat_pham', enabled: true },
  { id: 'dd5', zh: '灵脉', vi: 'linh mạch', category: 'vat_pham', enabled: true },
  { id: 'dd6', zh: '天材地宝', vi: 'thiên tài địa bảo', category: 'vat_pham', enabled: true },

  // 6. Xuyên Không, Hệ Thống & Tái Sinh
  { id: 'xt1', zh: '系统', vi: 'hệ thống', category: 'thuat_ngu', enabled: true },
  { id: 'xt2', zh: '宿主', vi: 'ký chủ', category: 'thuat_ngu', enabled: true },
  { id: 'xt3', zh: '恭喜宿主', vi: 'Chúc mừng ký chủ', category: 'thuat_ngu', enabled: true },
  { id: 'xt4', zh: '穿越', vi: 'xuyên không', category: 'thuat_ngu', enabled: true },
  { id: 'xt5', zh: '重生', vi: 'trọng sinh', category: 'thuat_ngu', enabled: true },
  { id: 'xt6', zh: '转世', vi: 'chuyển thế', category: 'thuat_ngu', enabled: true },
  { id: 'xt7', zh: '夺舍', vi: 'đoạt xá', category: 'thuat_ngu', enabled: true },
  { id: 'xt8', zh: '异世界', vi: 'dị giới', category: 'thuat_ngu', enabled: true },

  // 7. Từ Cảm Xúc & Khinh Miệt (Semantic)
  { id: 'sm1', zh: '蝼蚁', vi: 'sâu kiến', category: 'thuat_ngu', enabled: true },
  { id: 'sm2', zh: '废物', vi: 'phế vật', category: 'thuat_ngu', enabled: true },
  { id: 'sm3', zh: '不自量力', vi: 'không biết tự lượng sức', category: 'thuat_ngu', enabled: true },
  { id: 'sm4', zh: '找死', vi: 'tìm chết', category: 'thuat_ngu', enabled: true },
  { id: 'sm5', zh: '自寻死路', vi: 'tự tìm đường chết', category: 'thuat_ngu', enabled: true },

  // Tông Môn
  { id: 'tm1', zh: '宗门', vi: 'tông môn', category: 'xung_ho', enabled: true },
  { id: 'tm2', zh: '宗主', vi: 'tông chủ', category: 'xung_ho', enabled: true },
  { id: 'tm3', zh: '长老', vi: 'trưởng lão', category: 'xung_ho', enabled: true },
  { id: 'tm4', zh: '太上长老', vi: 'thái thượng trưởng lão', category: 'xung_ho', enabled: true },
  { id: 'tm5', zh: '掌门', vi: 'chưởng môn', category: 'xung_ho', enabled: true },
  { id: 'tm6', zh: '圣地', vi: 'thánh địa', category: 'xung_ho', enabled: true }
];

export const PRONOUN_PRESETS = [
  {
    id: 'master_tutien',
    name: '📜 Chuẩn Master Tu Tiên (Ta - Ngươi, Bổn Tọa, Tiền Bối, Sư Tôn)',
    desc: 'Tuân thủ 100% Master Script: Xưng hô cổ phong tu tiên chuẩn TTS',
    rules: [
      { from: /\b(Tôi|Mình)\b/gi, to: 'Ta' },
      { from: /\b(Bạn|Cậu|Anh|Cô)\b/gi, to: 'Ngươi' },
      { from: /\b(Anh ấy|Ông ấy)\b/gi, to: 'Hắn' },
      { from: /\b(Cô ấy|Bà ấy)\b/gi, to: 'Nàng' }
    ]
  },
  {
    id: 'lao_phu_tieu_huu',
    name: 'Tiền bối - Hậu bối (Lão phu / Tiểu hữu)',
    desc: 'Dùng khi nhân vật cao nhân xưng hô với vãn bối',
    rules: [
      { from: /\b(Tôi|Ta)\b/gi, to: 'Lão phu' },
      { from: /\b(Cậu|Ngươi|Bạn)\b/gi, to: 'Tiểu hữu' }
    ]
  },
  {
    id: 'bon_toa_cac_nguoi',
    name: 'Bổn Tọa - Các Ngươi (Uy nghiêm Tông chủ / Ma Tôn)',
    desc: 'Dùng khi Tông chủ, Trưởng lão, Ma Tôn phán bảo',
    rules: [
      { from: /\b(Tôi|Ta)\b/gi, to: 'Bổn tọa' },
      { from: /\b(Mọi người|Các bạn|Ngươi)\b/gi, to: 'Các ngươi' }
    ]
  },
  {
    id: 'su_ton_do_nhi',
    name: 'Sư Tôn - Đồ Nhi',
    desc: 'Xưng hô Thầy - Trò trong Tông môn',
    rules: [
      { from: /\b(Thầy|Tôi)\b/gi, to: 'Vi sư' },
      { from: /\b(Con|Trò|Ngươi)\b/gi, to: 'Đồ nhi' }
    ]
  }
];

export const SAMPLE_SRT = `1
00:00:01,200 --> 00:00:04,500
Châu Báo! Ngươi dám xông vào động府 của bổn tọa sao?

2
00:00:05,100 --> 00:00:09,800
Ha ha! Lâm Phong, ngươi chỉ mới đột phá Trúc Cơ tầng ba, có tư cách gì sở hữu Trúc Cơ Đan này?

3
00:00:10,200 --> 00:00:15,000
Lão phu đã bế quan ba mươi năm ở Vân Nham Tông, thần thức đã đạt tới Kim Đan kỳ!

4
00:00:15,500 --> 00:00:20,300
Tiểu hữu, ngoan ngoãn dâng ra túi trữ vật và phi kiếm, lão phu có thể tha cho ngươi một con đường sống.

5
00:00:21,000 --> 00:00:25,700
Hừ! Muốn cướp pháp bảo của ta? Hãy đỡ lấy một chiêu Tiên Kiếm Thần Thông này!`;
