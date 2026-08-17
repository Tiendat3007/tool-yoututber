// Master Tu Tiên - Huyền Huyễn - Xuyên Không Glossary (Đồng bộ chuẩn 100% Master Script)

export const DEFAULT_GLOSSARY = [
  // ==========================================
  // 1. XƯNG HÔ, DANH TỪ THÂN PHẬN & TÔNG MÔN (xung_ho)
  // ==========================================
  { id: 'xh_su_ton', zh: '师尊', vi: 'Sư tôn', usage: 'Kính xưng trang trọng của đệ tử đối với người truyền đạo hoặc sư phụ có địa vị cao.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_phu', zh: '师父', vi: 'Sư phụ', usage: 'Cách gọi trực tiếp người truyền dạy mình; gần gũi hơn Sư tôn.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_to', zh: '师祖', vi: 'Sư tổ', usage: 'Sư phụ của sư phụ hoặc bậc tổ sư theo quan hệ truyền thừa.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_thuc', zh: '师叔', vi: 'Sư thúc', usage: 'Sư đệ của sư phụ; đôi khi dùng theo bối phận tông môn.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_ba', zh: '师伯', vi: 'Sư bá', usage: 'Sư huynh của sư phụ.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_thuc_to', zh: '师叔祖', vi: 'Sư thúc tổ', usage: 'Bậc sư thúc thuộc thế hệ của sư tổ.', category: 'xung_ho', enabled: true },
  { id: 'xh_to_su', zh: '祖师', vi: 'Tổ sư', usage: 'Người khai sáng hoặc tổ tiên truyền thừa của một tông môn, công pháp hay đạo thống.', category: 'xung_ho', enabled: true },
  { id: 'xh_khai_son', zh: '开山祖师', vi: 'Khai sơn tổ sư', usage: 'Người sáng lập tông môn hoặc khai sáng một mạch truyền thừa.', category: 'xung_ho', enabled: true },
  { id: 'xh_tong_chu', zh: '宗主', vi: 'Tông chủ', usage: 'Người đứng đầu một tông môn.', category: 'xung_ho', enabled: true },
  { id: 'xh_chuong_mon', zh: '掌门', vi: 'Chưởng môn', usage: 'Người đứng đầu môn phái, phụ trách và chấp chưởng môn phái.', category: 'xung_ho', enabled: true },
  { id: 'xh_minh_chu', zh: '盟主', vi: 'Minh chủ', usage: 'Người đứng đầu một liên minh hoặc nhiều thế lực liên kết.', category: 'xung_ho', enabled: true },
  { id: 'xh_truong_lao', zh: '长老', vi: 'Trưởng lão', usage: 'Bậc cao tầng hoặc trưởng bối có chức vị trong tông môn.', category: 'xung_ho', enabled: true },
  { id: 'xh_thai_thuong', zh: '太上长老', vi: 'Thái thượng trưởng lão', usage: 'Trưởng lão cấp cao, thường có bối phận và địa vị cao hơn trưởng lão thông thường.', category: 'xung_ho', enabled: true },
  { id: 'xh_lao_to', zh: '老祖', vi: 'Lão tổ', usage: 'Cường giả hoặc tổ tiên có bối phận cực cao của gia tộc, tông môn.', category: 'xung_ho', enabled: true },
  { id: 'xh_thai_thuong_lao_to', zh: '太上老祖', vi: 'Thái thượng lão tổ', usage: 'Lão tổ có bối phận và địa vị cực cao trong một thế lực.', category: 'xung_ho', enabled: true },
  { id: 'xh_phong_chu', zh: '峰主', vi: 'Phong chủ', usage: 'Người đứng đầu một ngọn núi hoặc một chi phong trong tông môn.', category: 'xung_ho', enabled: true },
  { id: 'xh_cung_chu', zh: '宫主', vi: 'Cung chủ', usage: 'Người đứng đầu một cung hoặc thế lực mang danh Cung.', category: 'xung_ho', enabled: true },
  { id: 'xh_cac_chu', zh: '阁主', vi: 'Các chủ', usage: 'Người đứng đầu một các hoặc thế lực mang danh Các.', category: 'xung_ho', enabled: true },
  { id: 'xh_dien_chu', zh: '殿主', vi: 'Điện chủ', usage: 'Người đứng đầu một điện hoặc thế lực mang danh Điện.', category: 'xung_ho', enabled: true },
  { id: 'xh_thanh_chu', zh: '圣主', vi: 'Thánh chủ', usage: 'Người đứng đầu thánh địa hoặc thế lực cấp Thánh.', category: 'xung_ho', enabled: true },
  { id: 'xh_ho_phap', zh: '护法', vi: 'Hộ pháp', usage: 'Chức vị phụ trách bảo vệ tông môn, giáo phái hoặc nhân vật cấp cao.', category: 'xung_ho', enabled: true },
  { id: 'xh_thieu_chu', zh: '少主', vi: 'Thiếu chủ', usage: 'Người thừa kế trẻ tuổi hoặc chủ nhân đời kế tiếp của một thế lực.', category: 'xung_ho', enabled: true },
  { id: 'xh_thanh_tu', zh: '圣子', vi: 'Thánh tử', usage: 'Nam truyền nhân trọng yếu của thánh địa hoặc đại thế lực.', category: 'xung_ho', enabled: true },
  { id: 'xh_thanh_nu', zh: '圣女', vi: 'Thánh nữ', usage: 'Nữ truyền nhân trọng yếu của thánh địa hoặc đại thế lực.', category: 'xung_ho', enabled: true },
  { id: 'xh_than_tu', zh: '神子', vi: 'Thần tử', usage: 'Thiên kiêu hoặc truyền nhân có địa vị đặc biệt trong thần tộc, thần điện.', category: 'xung_ho', enabled: true },
  { id: 'xh_than_nu', zh: '神女', vi: 'Thần nữ', usage: 'Nữ thiên kiêu hoặc truyền nhân có địa vị đặc biệt.', category: 'xung_ho', enabled: true },
  { id: 'xh_de_tu_nam', zh: '帝子', vi: 'Đế tử', usage: 'Con trai hoặc hậu duệ trực hệ của Đại Đế.', category: 'xung_ho', enabled: true },
  { id: 'xh_de_nu', zh: '帝女', vi: 'Đế nữ', usage: 'Con gái hoặc nữ hậu duệ trực hệ của Đại Đế.', category: 'xung_ho', enabled: true },
  { id: 'xh_than_vuong', zh: '神王', vi: 'Thần Vương', usage: 'Danh hiệu hoặc cảnh giới cấp cao của thần đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_tien_vuong', zh: '仙王', vi: 'Tiên Vương', usage: 'Cảnh giới hoặc tôn hiệu của cường giả tiên đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_tien_de', zh: '仙帝', vi: 'Tiên Đế', usage: 'Tôn hiệu hoặc cảnh giới đỉnh cấp của tiên đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_nu_de', zh: '女帝', vi: 'Nữ Đế', usage: 'Nữ cường giả mang đế vị hoặc danh hiệu Đế.', category: 'xung_ho', enabled: true },
  { id: 'xh_ma_ton', zh: '魔尊', vi: 'Ma Tôn', usage: 'Tôn hiệu của cường giả ma đạo có địa vị cực cao.', category: 'xung_ho', enabled: true },
  { id: 'xh_ma_de', zh: '魔帝', vi: 'Ma Đế', usage: 'Đế cấp hoặc tôn hiệu tối cao của cường giả ma đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_yeu_de', zh: '妖帝', vi: 'Yêu Đế', usage: 'Đế cấp hoặc tôn hiệu cao cấp của yêu tộc.', category: 'xung_ho', enabled: true },
  { id: 'xh_kiem_de', zh: '剑帝', vi: 'Kiếm Đế', usage: 'Đế cấp cường giả lấy kiếm đạo làm chủ.', category: 'xung_ho', enabled: true },
  { id: 'xh_dan_de', zh: '丹帝', vi: 'Đan Đế', usage: 'Tôn hiệu cực cao của cường giả hoặc đại năng đan đạo.', category: 'xung_ho', enabled: true },

  // Xưng Hô Tự Xưng & Đối Phương
  { id: 'xh_tien_boi', zh: '前辈', vi: 'tiền bối', usage: 'Kính xưng người có tuổi đời, bối phận, tu vi cao hơn.', category: 'xung_ho', enabled: true },
  { id: 'xh_van_boi', zh: '晚辈', vi: 'vãn bối', usage: 'Tự xưng khi nói với người có bối phận hoặc tư lịch cao hơn.', category: 'xung_ho', enabled: true },
  { id: 'xh_dao_huu', zh: '道友', vi: 'đạo hữu', usage: 'Cách xưng hô tương đối ngang hàng giữa những người tu hành.', category: 'xung_ho', enabled: true },
  { id: 'xh_tai_ha', zh: '在下', vi: 'tại hạ', usage: 'Cách tự xưng khiêm nhường giữa những người chưa quá thân thiết.', category: 'xung_ho', enabled: true },
  { id: 'xh_ban_dao', zh: '贫道', vi: 'bần đạo', usage: 'Cách tự xưng của đạo sĩ hoặc người tu đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_lao_phu', zh: '老夫', vi: 'lão phu', usage: 'Cách tự xưng của nam trưởng bối hoặc cường giả lớn tuổi.', category: 'xung_ho', enabled: true },
  { id: 'xh_lao_hu', zh: '老朽', vi: 'lão hủ', usage: 'Cách tự xưng khiêm nhường của người cao tuổi.', category: 'xung_ho', enabled: true },
  { id: 'xh_bon_toa', zh: '本座', vi: 'bổn tọa', usage: 'Cách tự xưng uy nghiêm của cường giả hoặc người có địa vị cao.', category: 'xung_ho', enabled: true },
  { id: 'xh_bon_ton', zh: '本尊', vi: 'bản tôn', usage: 'Cách tự xưng mang khí thế của cường giả cấp cao, nhấn mạnh thân phận.', category: 'xung_ho', enabled: true },
  { id: 'xh_bon_de', zh: '本帝', vi: 'bổn đế', usage: 'Cách tự xưng của Đế, Đại Đế, Nữ Đế.', category: 'xung_ho', enabled: true },
  { id: 'xh_bon_thanh', zh: '本圣', vi: 'bổn thánh', usage: 'Cách tự xưng của nhân vật đạt Thánh cảnh.', category: 'xung_ho', enabled: true },
  { id: 'xh_de_tu', zh: '弟子', vi: 'đệ tử', usage: 'Người học dưới môn hạ; tự xưng trước sư phụ, sư tôn.', category: 'xung_ho', enabled: true },
  { id: 'xh_do_nhi', zh: '徒儿', vi: 'đồ nhi', usage: 'Sư phụ gọi đệ tử với sắc thái thân cận.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_huynh', zh: '师兄', vi: 'sư huynh', usage: 'Nam đồng môn có bối phận hoặc thứ tự nhập môn cao hơn.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_ty', zh: '师姐', vi: 'sư tỷ', usage: 'Nữ đồng môn có bối phận hoặc thứ tự nhập môn cao hơn.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_de', zh: '师弟', vi: 'sư đệ', usage: 'Nam đồng môn có thứ tự nhập môn thấp hơn.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_muoi', zh: '师妹', vi: 'sư muội', usage: 'Nữ đồng môn có thứ tự nhập môn thấp hơn.', category: 'xung_ho', enabled: true },
  { id: 'xh_phu_quan', zh: '夫君', vi: 'phu quân', usage: 'Vợ gọi chồng phong cách cổ trang.', category: 'xung_ho', enabled: true },
  { id: 'xh_nuong_tu', zh: '娘子', vi: 'nương tử', usage: 'Chồng gọi vợ phong cách cổ trang.', category: 'xung_ho', enabled: true },
  { id: 'xh_chu_nhan', zh: '主人', vi: 'chủ nhân', usage: 'Thuộc hạ, linh thú, khí linh gọi người mình phụng sự.', category: 'xung_ho', enabled: true },
  { id: 'xh_phu_than', zh: '父亲', vi: 'phụ thân', usage: 'Cách gọi cha trang trọng phù hợp cổ trang.', category: 'xung_ho', enabled: true },
  { id: 'xh_co_nuong', zh: '姑娘', vi: 'cô nương', usage: 'Cách gọi nữ tử trẻ khi chưa thân thiết.', category: 'xung_ho', enabled: true },
  { id: 'xh_tieu_thu', zh: '小姐', vi: 'tiểu thư', usage: 'Dùng cho nữ tử thuộc thế gia.', category: 'xung_ho', enabled: true },
  { id: 'xh_cong_tu', zh: '公子', vi: 'công tử', usage: 'Cách gọi nam tử trẻ có thân phận lịch sự.', category: 'xung_ho', enabled: true },
  { id: 'xh_dai_nhan', zh: '大人', vi: 'đại nhân', usage: 'Kính xưng người có địa vị cao.', category: 'xung_ho', enabled: true },
  { id: 'xh_su_mon', zh: '师门', vi: 'sư môn', usage: 'Môn phái mà một người bái sư gia nhập.', category: 'xung_ho', enabled: true },
  { id: 'xh_tong_mon', zh: '宗门', vi: 'tông môn', usage: 'Tổ chức tu luyện theo hệ thống tông phái.', category: 'xung_ho', enabled: true },
  { id: 'xh_gia_toc', zh: '家族', vi: 'gia tộc', usage: 'Thế lực lấy huyết thống làm nền tảng.', category: 'xung_ho', enabled: true },
  { id: 'xh_the_gia', zh: '世家', vi: 'thế gia', usage: 'Gia tộc lớn có truyền thừa lâu đời.', category: 'xung_ho', enabled: true },
  { id: 'xh_co_toc', zh: '古族', vi: 'cổ tộc', usage: 'Chủng tộc hoặc gia tộc cổ xưa.', category: 'xung_ho', enabled: true },
  { id: 'xh_hoang_trieu', zh: '皇朝', vi: 'hoàng triều', usage: 'Thế lực quốc gia do hoàng tộc thống trị.', category: 'xung_ho', enabled: true },
  { id: 'xh_tien_trieu', zh: '仙朝', vi: 'tiên triều', usage: 'Hoàng triều thuộc hệ thống tiên đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_than_trieu', zh: '神朝', vi: 'thần triều', usage: 'Đại thế lực hoàng triều cấp bậc thần đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_ma_mon', zh: '魔门', vi: 'ma môn', usage: 'Tông môn hoặc thế lực thuộc ma đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_ma_giao', zh: '魔教', vi: 'ma giáo', usage: 'Giáo phái ma đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_chinh_dao', zh: '正道', vi: 'chính đạo', usage: 'Phe chính thống trong giới tu hành.', category: 'xung_ho', enabled: true },
  { id: 'xh_ma_dao', zh: '魔道', vi: 'ma đạo', usage: 'Con đường tu hành thuộc ma đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_ta_tu', zh: '邪修', vi: 'tà tu', usage: 'Tu sĩ sử dụng phương thức tu luyện tà dị.', category: 'xung_ho', enabled: true },
  { id: 'xh_ma_tu', zh: '魔修', vi: 'ma tu', usage: 'Người tu luyện ma công.', category: 'xung_ho', enabled: true },
  { id: 'xh_kiem_tu', zh: '剑修', vi: 'kiếm tu', usage: 'Tu sĩ chuyên tu kiếm đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_the_tu', zh: '体修', vi: 'thể tu', usage: 'Tu sĩ lấy tôi luyện nhục thân làm chính.', category: 'xung_ho', enabled: true },
  { id: 'xh_dan_tu', zh: '丹修', vi: 'đan tu', usage: 'Tu sĩ chuyên về đan đạo.', category: 'xung_ho', enabled: true },
  { id: 'xh_tran_tu', zh: '阵修', vi: 'trận tu', usage: 'Tu sĩ chuyên nghiên cứu trận pháp.', category: 'xung_ho', enabled: true },
  { id: 'xh_phu_tu', zh: '符修', vi: 'phù tu', usage: 'Tu sĩ chuyên về phù lục.', category: 'xung_ho', enabled: true },
  { id: 'xh_quy_tu', zh: '鬼修', vi: 'quỷ tu', usage: 'Tu sĩ tu luyện theo quỷ đạo.', category: 'xung_ho', enabled: true },

  // ==========================================
  // 2. CẢNH GIỚI TU LUYỆN & TIẾN TRÌNH (canh_gioi)
  // ==========================================
  { id: 'cg_luyen_the', zh: '炼体', vi: 'Luyện Thể', usage: 'Cảnh giới tôi luyện thân thể.', category: 'canh_gioi', enabled: true },
  { id: 'cg_luyen_khi', zh: '炼气', vi: 'Luyện Khí', usage: 'Cảnh giới tu luyện linh khí sơ cấp.', category: 'canh_gioi', enabled: true },
  { id: 'cg_truc_co', zh: '筑基', vi: 'Trúc Cơ', usage: 'Cảnh giới xây dựng nền móng tu hành.', category: 'canh_gioi', enabled: true },
  { id: 'cg_kim_dan', zh: '金丹', vi: 'Kim Đan', usage: 'Cảnh giới kết thành Kim Đan.', category: 'canh_gioi', enabled: true },
  { id: 'cg_nguyen_anh', zh: '元婴', vi: 'Nguyên Anh', usage: 'Cảnh giới hình thành Nguyên Anh.', category: 'canh_gioi', enabled: true },
  { id: 'cg_hoa_than', zh: '化神', vi: 'Hóa Thần', usage: 'Cảnh giới cao hơn Nguyên Anh.', category: 'canh_gioi', enabled: true },
  { id: 'cg_luyen_hu', zh: '炼虚', vi: 'Luyện Hư', usage: 'Cảnh giới tu luyện cao cấp.', category: 'canh_gioi', enabled: true },
  { id: 'cg_hop_the', zh: '合体', vi: 'Hợp Thể', usage: 'Cảnh giới Hợp Thể.', category: 'canh_gioi', enabled: true },
  { id: 'cg_dai_thua', zh: '大乘', vi: 'Đại Thừa', usage: 'Cảnh giới tu luyện đỉnh cao trước Độ Kiếp.', category: 'canh_gioi', enabled: true },
  { id: 'cg_do_kiep', zh: '渡劫', vi: 'Độ Kiếp', usage: 'Cảnh giới vượt qua thiên kiếp để phi thăng.', category: 'canh_gioi', enabled: true },
  { id: 'cg_do_kiep_ky', zh: '渡劫期', vi: 'Độ Kiếp kỳ', usage: 'Cách gọi đầy đủ của cảnh giới Độ Kiếp.', category: 'canh_gioi', enabled: true },
  { id: 'cg_chan_tien', zh: '真仙', vi: 'Chân Tiên', usage: 'Cảnh giới tiên nhân.', category: 'canh_gioi', enabled: true },
  { id: 'cg_thien_tien', zh: '天仙', vi: 'Thiên Tiên', usage: 'Cảnh giới tiên đạo.', category: 'canh_gioi', enabled: true },
  { id: 'cg_huyen_tien', zh: '玄仙', vi: 'Huyền Tiên', usage: 'Cảnh giới tiên đạo.', category: 'canh_gioi', enabled: true },
  { id: 'cg_kim_tien', zh: '金仙', vi: 'Kim Tiên', category: 'canh_gioi', enabled: true },
  { id: 'cg_thai_at', zh: '太乙金仙', vi: 'Thái Ất Kim Tiên', category: 'canh_gioi', enabled: true },
  { id: 'cg_dai_la', zh: '大罗金仙', vi: 'Đại La Kim Tiên', category: 'canh_gioi', enabled: true },
  { id: 'cg_chuan_thanh', zh: '准圣', vi: 'Chuẩn Thánh', category: 'canh_gioi', enabled: true },
  { id: 'cg_thanh_nhan', zh: '圣人', vi: 'Thánh Nhân', category: 'canh_gioi', enabled: true },

  // Cấp Bậc Cảnh Giới & Đột Phá
  { id: 'cb_so_ky', zh: '初期', vi: 'sơ kỳ', usage: 'Giai đoạn đầu của cảnh giới.', category: 'canh_gioi', enabled: true },
  { id: 'cb_trung_ky', zh: '中期', vi: 'trung kỳ', usage: 'Giai đoạn giữa của cảnh giới.', category: 'canh_gioi', enabled: true },
  { id: 'cb_hau_ky', zh: '后期', vi: 'hậu kỳ', usage: 'Giai đoạn sau của cảnh giới.', category: 'canh_gioi', enabled: true },
  { id: 'cb_dinh_phong', zh: '巅峰', vi: 'đỉnh phong', usage: 'Trạng thái cao nhất của cảnh giới.', category: 'canh_gioi', enabled: true },
  { id: 'cb_vien_man', zh: '圆满', vi: 'viên mãn', usage: 'Mức hoàn thiện của cảnh giới.', category: 'canh_gioi', enabled: true },
  { id: 'cb_dai_vien_man', zh: '大圆满', vi: 'đại viên mãn', usage: 'Trạng thái hoàn thiện cực hạn.', category: 'canh_gioi', enabled: true },
  { id: 'cb_nua_buoc', zh: '半步', vi: 'nửa bước', usage: 'Đứng giữa hai cảnh giới (VD: nửa bước Hóa Thần).', category: 'canh_gioi', enabled: true },
  { id: 'cb_dot_pha', zh: '突破', vi: 'đột phá', usage: 'Phá vỡ bình cảnh để tiến lên cảnh giới cao hơn.', category: 'canh_gioi', enabled: true },
  { id: 'cb_pha_canh', zh: '破境', vi: 'phá cảnh', usage: 'Đột phá giới hạn cảnh giới hiện tại.', category: 'canh_gioi', enabled: true },
  { id: 'cb_binh_canh', zh: '瓶颈', vi: 'bình cảnh', usage: 'Trở ngại khiến tu vi khó tăng tiến.', category: 'canh_gioi', enabled: true },
  { id: 'cb_tu_vi', zh: '修为', vi: 'tu vi', usage: 'Thành quả tu luyện của một người.', category: 'canh_gioi', enabled: true },
  { id: 'cb_canh_gioi', zh: '境界', vi: 'cảnh giới', usage: 'Cấp độ tu hành.', category: 'canh_gioi', enabled: true },
  { id: 'cb_be_quan', zh: '闭关', vi: 'bế quan', usage: 'Ẩn mình chuyên tâm tu luyện.', category: 'canh_gioi', enabled: true },
  { id: 'cb_xuat_quan', zh: '出关', vi: 'xuất quan', usage: 'Kết thúc thời gian bế quan.', category: 'canh_gioi', enabled: true },
  { id: 'cb_tau_hoa', zh: '走火入魔', vi: 'tẩu hỏa nhập ma', usage: 'Tu luyện xảy ra sai lệch nghiêm trọng.', category: 'canh_gioi', enabled: true },
  { id: 'cb_tam_ma', zh: '心魔', vi: 'tâm ma', usage: 'Chấp niệm hoặc trở ngại tinh thần trong tu hành.', category: 'canh_gioi', enabled: true },
  { id: 'cb_don_ngo', zh: '顿悟', vi: 'đốn ngộ', usage: 'Khoảnh khắc lĩnh ngộ sâu sắc về đạo.', category: 'canh_gioi', enabled: true },
  { id: 'cb_ngo_dao', zh: '悟道', vi: 'ngộ đạo', usage: 'Lĩnh ngộ Đại Đạo hoặc đạo lý tu hành.', category: 'canh_gioi', enabled: true },
  { id: 'cb_van_dao', zh: '问道', vi: 'vấn đạo', usage: 'Tìm cầu hoặc tham vấn về Đạo.', category: 'canh_gioi', enabled: true },

  // ==========================================
  // 3. THUẬT NGỮ CÔNG PHÁP, THẦN THÔNG & ĐẠO (thuat_ngu)
  // ==========================================
  { id: 'tn_linh_can', zh: '灵根', vi: 'Linh căn', usage: 'Thiên phú quyết định khả năng tu luyện.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_linh_mach', zh: '灵脉', vi: 'Linh mạch', usage: 'Mạch sản sinh linh khí; không đảo thành Mạch linh.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_dan_dien', zh: '丹田', vi: 'Đan điền', usage: 'Vị trí tích tụ năng lượng tu luyện.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_thuc_hai', zh: '识海', vi: 'Thức hải', usage: 'Không gian tinh thần liên quan đến thần hồn.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_than_thuc', zh: '神识', vi: 'Thần thức', usage: 'Năng lực cảm nhận tinh thần của tu sĩ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_dao_tam', zh: '道心', vi: 'Đạo tâm', usage: 'Tâm cảnh và ý chí của người tu hành.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nhuc_than', zh: '肉身', vi: 'Nhục thân', usage: 'Thân thể vật chất của sinh linh.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nguyen_than', zh: '元神', vi: 'Nguyên thần', usage: 'Thần hồn cấp cao của người tu luyện.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_than_thong', zh: '神通', vi: 'Thần thông', usage: 'Thuật pháp đặc thù có uy năng lớn.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_cong_phap', zh: '功法', vi: 'Công pháp', usage: 'Phương pháp hoặc hệ thống tu luyện.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_bi_thuat', zh: '秘术', vi: 'Bí thuật', usage: 'Thuật pháp bí truyền hoặc đặc biệt.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_kiem_quyet', zh: '剑诀', vi: 'Kiếm quyết', usage: 'Công pháp thuộc kiếm đạo.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_kiem_y', zh: '剑意', vi: 'Kiếm ý', usage: 'Ý cảnh và lĩnh ngộ về kiếm đạo.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_kiem_dao', zh: '剑道', vi: 'Kiếm đạo', usage: 'Con đường tu hành lấy kiếm làm căn bản.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_kiem_vuc', zh: '剑域', vi: 'Kiếm vực', usage: 'Lĩnh vực được hình thành từ kiếm đạo.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_dai_dao', zh: '大道', vi: 'Đại Đạo', usage: 'Đạo lý hoặc con đường tối cao của thiên địa.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_phap_tac', zh: '法则', vi: 'Pháp tắc', usage: 'Quy luật bản nguyên của thế giới.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_linh_vuc', zh: '领域', vi: 'Lĩnh vực', usage: 'Phạm vi sức mạnh do cường giả kiểm soát.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_bi_canh', zh: '秘境', vi: 'Bí cảnh', usage: 'Khu vực đặc biệt dùng để thí luyện tìm cơ duyên.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_cam_dia', zh: '禁地', vi: 'Cấm địa', usage: 'Khu vực nguy hiểm bị nghiêm cấm tiến vào.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_dong_phu', zh: '洞府', vi: 'Động phủ', usage: 'Nơi cư trú tu luyện của tu sĩ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_thanh_dia', zh: '圣地', vi: 'Thánh địa', usage: 'Thế lực có địa vị cực cao trong giới tu luyện.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_thien_kiep', zh: '天劫', vi: 'Thiên kiếp', usage: 'Kiếp nạn do thiên địa giáng xuống.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_loi_kiep', zh: '雷劫', vi: 'Lôi kiếp', usage: 'Thiên kiếp lấy lôi đình làm chủ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_phi_thang', zh: '飞升', vi: 'Phi thăng', usage: 'Thăng lên thế giới cấp cao hơn.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_duong_phu', zh: '阳府', vi: 'Dương phủ', usage: 'Thuật ngữ cố định, không đảo thành Phủ Dương.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_linh_hai', zh: '灵海', vi: 'Linh hải', usage: 'Biển linh lực trong cơ thể tu sĩ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_than_phu', zh: '神府', vi: 'Thần phủ', usage: 'Không gian thần hồn tu luyện.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_dao_cung', zh: '道宫', vi: 'Đạo cung', usage: 'Cảnh giới hoặc kiến trúc tu luyện.', category: 'thuat_ngu', enabled: true },

  // Hệ Thống & Xuyên Không
  { id: 'ht_he_thong', zh: '系统', vi: 'Hệ thống', usage: 'Hệ thống hỗ trợ nhân vật.', category: 'thuat_ngu', enabled: true },
  { id: 'ht_ky_chu', zh: '宿主', vi: 'Ký chủ', usage: 'Cách hệ thống gọi người sở hữu.', category: 'thuat_ngu', enabled: true },
  { id: 'ht_nhiem_vu', zh: '任务', vi: 'Nhiệm vụ', usage: 'Nhiệm vụ do hệ thống giao.', category: 'thuat_ngu', enabled: true },
  { id: 'ht_chinh_tuyen', zh: '主线任务', vi: 'Nhiệm vụ chính tuyến', category: 'thuat_ngu', enabled: true },
  { id: 'ht_phan_thuong', zh: '奖励', vi: 'Phần thưởng', category: 'thuat_ngu', enabled: true },
  { id: 'ht_diem_danh', zh: '签到', vi: 'Điểm danh', category: 'thuat_ngu', enabled: true },
  { id: 'ht_rut_thuong', zh: '抽奖', vi: 'Rút thưởng', category: 'thuat_ngu', enabled: true },
  { id: 'ht_kich_hoat', zh: '激活', vi: 'Kích hoạt', category: 'thuat_ngu', enabled: true },
  { id: 'ht_lien_ket', zh: '绑定', vi: 'Liên kết', category: 'thuat_ngu', enabled: true },
  { id: 'ht_xuyen_khong', zh: '穿越', vi: 'Xuyên không', category: 'thuat_ngu', enabled: true },
  { id: 'ht_trong_sinh', zh: '重生', vi: 'Trọng sinh', category: 'thuat_ngu', enabled: true },
  { id: 'ht_doat_xa', zh: '夺舍', vi: 'Đoạt xá', category: 'thuat_ngu', enabled: true },
  { id: 'ht_va_mat', zh: '打脸', vi: 'Vả mặt', usage: 'Phản kích kẻ khinh thường bằng thực lực.', category: 'thuat_ngu', enabled: true },
  { id: 'ht_vo_dich', zh: '无敌', vi: 'Vô địch', category: 'thuat_ngu', enabled: true },

  // ==========================================
  // 4. VẬT PHẨM, PHÁP BẢO, ĐAN DƯỢC & TÀI NGUYÊN (vat_pham)
  // ==========================================
  { id: 'vp_linh_thach', zh: '灵石', vi: 'Linh thạch', usage: 'Tài nguyên chứa linh khí để tu luyện, giao dịch.', category: 'vat_pham', enabled: true },
  { id: 'vp_phap_bao', zh: '法宝', vi: 'Pháp bảo', usage: 'Bảo vật chiến đấu, phòng ngự.', category: 'vat_pham', enabled: true },
  { id: 'vp_phap_khi', zh: '法器', vi: 'Pháp khí', usage: 'Khí cụ tu luyện hoặc chiến đấu.', category: 'vat_pham', enabled: true },
  { id: 'vp_linh_khi_item', zh: '灵器', vi: 'Linh khí', usage: 'Pháp khí cấp Linh.', category: 'vat_pham', enabled: true },
  { id: 'vp_tien_khi_item', zh: '仙器', vi: 'Tiên khí', usage: 'Pháp bảo hoặc binh khí cấp Tiên.', category: 'vat_pham', enabled: true },
  { id: 'vp_than_khi', zh: '神器', vi: 'Thần khí', usage: 'Pháp bảo cấp Thần.', category: 'vat_pham', enabled: true },
  { id: 'vp_thanh_khi', zh: '圣器', vi: 'Thánh khí', usage: 'Pháp bảo cấp Thánh.', category: 'vat_pham', enabled: true },
  { id: 'vp_de_khi', zh: '帝器', vi: 'Đế khí', usage: 'Pháp bảo hoặc binh khí cấp Đế.', category: 'vat_pham', enabled: true },
  { id: 'vp_de_binh', zh: '帝兵', vi: 'Đế binh', usage: 'Binh khí của Đại Đế.', category: 'vat_pham', enabled: true },
  { id: 'vp_ban_menh', zh: '本命法宝', vi: 'Bản mệnh pháp bảo', usage: 'Pháp bảo gắn liền với sinh mệnh chủ nhân.', category: 'vat_pham', enabled: true },
  { id: 'vp_tui_tru_vat', zh: '储物袋', vi: 'Túi trữ vật', usage: 'Pháp khí không gian dùng để cất giữ đồ.', category: 'vat_pham', enabled: true },
  { id: 'vp_nhan_tru_vat', zh: '储物戒指', vi: 'Nhẫn trữ vật', category: 'vat_pham', enabled: true },
  { id: 'vp_nhan_khong_gian', zh: '空间戒指', vi: 'Nhẫn không gian', category: 'vat_pham', enabled: true },
  { id: 'vp_phi_kiem', zh: '飞剑', vi: 'Phi kiếm', usage: 'Kiếm điều khiển từ xa hoặc dùng ngự kiếm.', category: 'vat_pham', enabled: true },
  { id: 'vp_dan_duoc', zh: '丹药', vi: 'Đan dược', usage: 'Thuốc luyện chế bằng đan thuật.', category: 'vat_pham', enabled: true },
  { id: 'vp_linh_dan', zh: '灵丹', vi: 'Linh đan', category: 'vat_pham', enabled: true },
  { id: 'vp_tien_dan', zh: '仙丹', vi: 'Tiên đan', category: 'vat_pham', enabled: true },
  { id: 'vp_dan_phuong', zh: '丹方', vi: 'Đan phương', usage: 'Công thức luyện chế đan dược.', category: 'vat_pham', enabled: true },
  { id: 'vp_dan_lo', zh: '丹炉', vi: 'Đan lô', usage: 'Lò dùng để luyện đan.', category: 'vat_pham', enabled: true },
  { id: 'vp_linh_duoc', zh: '灵药', vi: 'Linh dược', category: 'vat_pham', enabled: true },
  { id: 'vp_tien_duoc', zh: '仙药', vi: 'Tiên dược', category: 'vat_pham', enabled: true },
  { id: 'vp_linh_thao', zh: '灵草', vi: 'Linh thảo', category: 'vat_pham', enabled: true },
  { id: 'vp_thien_tai_dia_bao', zh: '天材地宝', vi: 'Thiên tài địa bảo', usage: 'Bảo vật quý hiếm do trời đất sinh thành.', category: 'vat_pham', enabled: true },

  // ==========================================
  // 5. THÀNH NGỮ, KHẨU KHÍ & HỘI THOẠI CHIẾN ĐẤU (thuat_ngu)
  // ==========================================
  { id: 'tn_than_thanh_phuong_nao', zh: '何方神圣', vi: 'Thần thánh phương nào', usage: 'Dò hỏi hoặc khiêu khích về lai lịch của đối phương.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_ga_cho_khong_tha', zh: '鸡犬不留', vi: 'Gà chó không tha', usage: 'Giết sạch không chừa một ai, cực kỳ tàn khốc.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_cuu_tu_nhat_sinh', zh: '九死一生', vi: 'Cửu tử nhất sinh', usage: 'Tình cảnh cực kỳ nguy hiểm, gần chết mới sống.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_khong_pha_khong_thanh', zh: '不破不立', vi: 'Không phá không thành', usage: 'Phá bỏ trạng thái cũ mới kiến lập đột phá mới.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_muon_chet', zh: '找死', vi: 'Muốn chết', usage: 'Lời đe dọa khi tức giận.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nguoi_muon_chet', zh: '你找死', vi: 'Ngươi muốn chết!', usage: 'Lời đe dọa trực tiếp khi nổi giận.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_khong_biet_song_chet', zh: '不知死活', vi: 'Không biết sống chết', category: 'thuat_ngu', enabled: true },
  { id: 'tn_khong_biet_tu_luong', zh: '不自量力', vi: 'Không biết tự lượng sức', category: 'thuat_ngu', enabled: true },
  { id: 'tn_lam_can', zh: '放肆', vi: 'Làm càn!', usage: 'Quát kẻ dưới hoặc kẻ đang vô lễ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_to_gan', zh: '大胆', vi: 'To gan!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_dung_tay', zh: '住手', vi: 'Dừng tay!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_cam_mieng', zh: '住口', vi: 'Câm miệng!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_im_mieng', zh: '闭嘴', vi: 'Im miệng!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_cut', zh: '滚', vi: 'Cút!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_quy_xuong', zh: '跪下', vi: 'Quỳ xuống!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nap_mang', zh: '受死', vi: 'Nạp mạng!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_tha_mang', zh: '饶命', vi: 'Tha mạng!', category: 'thuat_ngu', enabled: true },
  { id: 'tn_sau_kien', zh: '蝼蚁', vi: 'Sâu kiến', usage: 'Cường giả dùng để khinh miệt kẻ yếu.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_phe_vat', zh: '废物', vi: 'Phế vật', usage: 'Lời miệt thị kẻ bất tài.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nghiep_suc', zh: '孽畜', vi: 'Nghiệt súc', usage: 'Lời mắng yêu thú hoặc quái vật.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_thien_kieu', zh: '天骄', vi: 'Thiên kiêu', usage: 'Thiên tài nổi bật vượt xa cùng thế hệ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_yeu_nghiet', zh: '妖孽', vi: 'Yêu nghiệt', usage: 'Thiên tài có thiên phú nghịch thiên.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_ty_thi', zh: '切磋', vi: 'Tỷ thí', usage: 'Giao đấu học hỏi.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_sinh_tu_chien', zh: '生死战', vi: 'Sinh tử chiến', usage: 'Trận chiến phân định sống chết.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_sinh_tu_dai', zh: '生死台', vi: 'Sinh Tử Đài', usage: 'Lôi đài quyết chiến sinh tử.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_van_lac', zh: '陨落', vi: 'Vẫn lạc', usage: 'Cái chết của cường giả hoặc tu sĩ.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_than_tu_dao_tieu', zh: '身死道消', vi: 'Thân tử đạo tiêu', usage: 'Cái chết hoàn toàn của người tu hành.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_hoi_phi_yen_diet', zh: '灰飞烟灭', vi: 'Hôi phi yên diệt', category: 'thuat_ngu', enabled: true },
  { id: 'tn_hon_phi_phach_tan', zh: '魂飞魄散', vi: 'Hồn phi phách tán', category: 'thuat_ngu', enabled: true },
  { id: 'tn_hinh_than_cau_diet', zh: '形神俱灭', vi: 'Hình thần câu diệt', category: 'thuat_ngu', enabled: true },
  { id: 'tn_menh_ta_do_ta', zh: '我命由我不由天', vi: 'Mệnh ta do ta, không do trời!', usage: 'Tuyên ngôn phản kháng thiên mệnh.', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nho_co_tan_goc', zh: '斩草除根', vi: 'Nhổ cỏ tận gốc', category: 'thuat_ngu', enabled: true },
  { id: 'tn_duoi_cung_giet_tan', zh: '赶尽杀绝', vi: 'Đuổi cùng giết tận', category: 'thuat_ngu', enabled: true },
  { id: 'tn_no_mau_tra_mau', zh: '血债血偿', vi: 'Nợ máu trả bằng máu', category: 'thuat_ngu', enabled: true },
  { id: 'tn_khong_doi_troi_chung', zh: '不共戴天', vi: 'Không đội trời chung', category: 'thuat_ngu', enabled: true },
  { id: 'tn_mot_tieng_kinh_nguoi', zh: '一鸣惊人', vi: 'Một tiếng kinh người', category: 'thuat_ngu', enabled: true },
  { id: 'tn_mot_buoc_len_troi', zh: '一飞冲天', vi: 'Một bước lên trời', category: 'thuat_ngu', enabled: true },
  { id: 'tn_thoat_thai_hoan_cot', zh: '脱胎换骨', vi: 'Thoát thai hoán cốt', category: 'thuat_ngu', enabled: true },
  { id: 'tn_tay_kinh_phat_tuy', zh: '洗筋伐髓', vi: 'Tẩy kinh phạt tủy', category: 'thuat_ngu', enabled: true },
  { id: 'tn_vo_dich_thien_ha', zh: '天下无敌', vi: 'Vô địch thiên hạ', category: 'thuat_ngu', enabled: true },
  { id: 'tn_quet_ngang', zh: '横扫', vi: 'Quét ngang', category: 'thuat_ngu', enabled: true },
  { id: 'tn_tran_ap', zh: '镇压', vi: 'Trấn áp', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nghien_ep', zh: '碾压', vi: 'Nghiền ép', category: 'thuat_ngu', enabled: true },
  { id: 'tn_mieu_sat', zh: '秒杀', vi: 'Miểu sát', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nhan_chu', zh: '认主', vi: 'Nhận chủ', category: 'thuat_ngu', enabled: true },
  { id: 'tn_nho_mau_nhan_chu', zh: '滴血认主', vi: 'Nhỏ máu nhận chủ', category: 'thuat_ngu', enabled: true },
  { id: 'tn_khe_uoc', zh: '契约', vi: 'Khế ước', category: 'thuat_ngu', enabled: true },
  { id: 'tn_khe_uoc_linh_hon', zh: '灵魂契约', vi: 'Khế ước linh hồn', category: 'thuat_ngu', enabled: true }
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
      { from: /\b(Cô ấy|Bà ấy)\b/gi, to: 'Nàng' },
      { from: /\b(Y)\b/g, to: 'Hắn' },
      { from: /\b(y)\b/g, to: 'hắn' }
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
