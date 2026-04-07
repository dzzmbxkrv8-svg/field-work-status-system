const fs = require('fs');
const file = 'src/i18n/index.js';
let content = fs.readFileSync(file, 'utf8');

const additions = {
en: `      offlinePending: (count) => \`Offline: Pending (\${count})\`,
      clockHeading: 'Time Clock',
      todaysWorkHours: "Today's Work Hours",
      workHoursFormat: (h, m) => \`\${h}h \${m}m\`,
      clockIn: 'Clock In',
      breakStart: 'Break',
      clockOut: 'Clock Out',
      breakEnd: 'Resume',
      todaysClockHistory: "Today's Clock History",
      todaysActivity: "Today's Activity",
      activityReported: (icon, label) => \`Reported \${icon} \${label}\`,
      calendarNoEvents: 'No scheduled events',
      adminMessageNoRecipients: 'No recipients available',
      attachFile: 'Attach',
      attachmentLimitAlert: 'You can attach up to 8 files',
      photoReportHeading: 'Photo Report',
      photoReportPrompt: 'Start Camera / Select Photo',
      photoReportSubmit: 'Submit Photo',
      dailyReportTitle: 'Daily Report',
      dailyReportPlaceholder: 'Please enter details of your work today.',
      dailyReportSubmit: 'Submit Report',
      navHome: 'Home',
      navCalendar: 'Calendar',
      navReport: 'Report',
      clockStatusWorking: 'Working',
      clockStatusOnBreak: 'On Break',
      clockStatusCompleted: 'Completed',
      clockTypeIn: 'Clock In',
      clockTypeOut: 'Clock Out',
      clockTypeBreakStart: 'Break Start',
      clockTypeBreakEnd: 'Break End',`,
ja: `      offlinePending: (count) => \`オフライン：送信待機中 (\${count}件)\`,
      clockHeading: '打刻',
      todaysWorkHours: '本日の勤務時間',
      workHoursFormat: (h, m) => \`\${h}時間\${m}分\`,
      clockIn: '出勤',
      breakStart: '休憩',
      clockOut: '退勤',
      breakEnd: '再開',
      todaysClockHistory: '本日の打刻履歴',
      todaysActivity: '本日のアクティビティ',
      activityReported: (icon, label) => \`\${icon} \${label} を報告しました\`,
      calendarNoEvents: '予定はありません',
      adminMessageNoRecipients: '宛先がありません',
      attachFile: '添付',
      attachmentLimitAlert: 'ファイルは最大で8つまで添付できます',
      photoReportHeading: '現場写真報告',
      photoReportPrompt: 'カメラを起動 / 写真を選択',
      photoReportSubmit: '写真を報告する',
      dailyReportTitle: '日報',
      dailyReportPlaceholder: '本日の作業内容を記入してください。',
      dailyReportSubmit: '日報を提出',
      navHome: 'ホーム',
      navCalendar: 'カレンダー',
      navReport: '連絡・報告',
      clockStatusWorking: '勤務中',
      clockStatusOnBreak: '休憩中',
      clockStatusCompleted: '退勤済み',
      clockTypeIn: '出勤',
      clockTypeOut: '退勤',
      clockTypeBreakStart: '休憩開始',
      clockTypeBreakEnd: '休憩終了',`,
vi: `, offlinePending: (count) => \`Ngoại tuyến: Chờ gửi (\${count})\`, clockHeading: 'Chấm công', todaysWorkHours: 'Giờ làm việc hôm nay', workHoursFormat: (h, m) => \`\${h}g \${m}p\`, clockIn: 'Vào ca', breakStart: 'Nghỉ giải lao', clockOut: 'Tan ca', breakEnd: 'Tiếp tục', todaysClockHistory: 'Lịch sử chấm công', todaysActivity: 'Hoạt động hôm nay', activityReported: (icon, label) => \`Đã báo cáo \${icon} \${label}\`, calendarNoEvents: 'Không có sự kiện nào', adminMessageNoRecipients: 'Không có người nhận', attachFile: 'Đính kèm', attachmentLimitAlert: 'Tối đa 8 tệp', photoReportHeading: 'Báo cáo ảnh', photoReportPrompt: 'Mở máy ảnh / Chọn ảnh', photoReportSubmit: 'Gửi ảnh', dailyReportTitle: 'Báo cáo ngày', dailyReportPlaceholder: 'Nhập chi tiết công việc.', dailyReportSubmit: 'Gửi báo cáo', navHome: 'Trang chủ', navCalendar: 'Lịch', navReport: 'Báo cáo', clockStatusWorking: 'Đang làm việc', clockStatusOnBreak: 'Đang nghỉ', clockStatusCompleted: 'Đã xong', clockTypeIn: 'Vào ca', clockTypeOut: 'Tan ca', clockTypeBreakStart: 'Bắt đầu nghỉ', clockTypeBreakEnd: 'Kết thúc nghỉ'`,
tl: `, offlinePending: (count) => \`Offline: Nakabinbin (\${count})\`, clockHeading: 'Orasan', todaysWorkHours: 'Oras ng Trabaho', workHoursFormat: (h, m) => \`\${h} oras \${m} min\`, clockIn: 'Pumasok', breakStart: 'Pahinga', clockOut: 'Lumabas', breakEnd: 'Ituloy', todaysClockHistory: 'History ng Orasan', todaysActivity: 'Aktibidad', activityReported: (icon, label) => \`Iniulat \${icon} \${label}\`, calendarNoEvents: 'Walang nakatakdang aktibidad', adminMessageNoRecipients: 'Walang makakatanggap', attachFile: 'Ilakip', attachmentLimitAlert: 'Hanggang 8 file', photoReportHeading: 'Ulat ng Larawan', photoReportPrompt: 'Camera / Pumili', photoReportSubmit: 'I-submit ang Larawan', dailyReportTitle: 'Ulat', dailyReportPlaceholder: 'Ipasok ang detalye ng trabaho.', dailyReportSubmit: 'I-submit ang Ulat', navHome: 'Home', navCalendar: 'Kalendaryo', navReport: 'Ulat', clockStatusWorking: 'Nagtatrabaho', clockStatusOnBreak: 'Nakahinga', clockStatusCompleted: 'Tapos Na', clockTypeIn: 'Pumasok', clockTypeOut: 'Lumabas', clockTypeBreakStart: 'Simula', clockTypeBreakEnd: 'Tapos'` ,
id: `, offlinePending: (count) => \`Offline: Tertunda (\${count})\`, clockHeading: 'Absensi', todaysWorkHours: 'Jam Kerja', workHoursFormat: (h, m) => \`\${h}j \${m}m\`, clockIn: 'Masuk', breakStart: 'Istirahat', clockOut: 'Keluar', breakEnd: 'Lanjut', todaysClockHistory: 'Riwayat Absensi', todaysActivity: 'Aktivitas Harian', activityReported: (icon, label) => \`Melaporkan \${icon} \${label}\`, calendarNoEvents: 'Tidak ada jadwal', adminMessageNoRecipients: 'Tidak ada', attachFile: 'Lampirkan', attachmentLimitAlert: 'Maks. 8 file', photoReportHeading: 'Laporan Foto', photoReportPrompt: 'Buka Kamera / Pilih', photoReportSubmit: 'Kirim', dailyReportTitle: 'Laporan', dailyReportPlaceholder: 'Isi detail pekerjaan.', dailyReportSubmit: 'Kirim', navHome: 'Beranda', navCalendar: 'Kalender', navReport: 'Laporan', clockStatusWorking: 'Kerja', clockStatusOnBreak: 'Istirahat', clockStatusCompleted: 'Selesai', clockTypeIn: 'Masuk', clockTypeOut: 'Keluar', clockTypeBreakStart: 'Mulai', clockTypeBreakEnd: 'Lanjut'`,
my: `, offlinePending: (count) => \`အော့ဖ်လိုင်း ဆိုင်းငံ့ (\${count})\`, clockHeading: 'အချိန်မှတ်', todaysWorkHours: 'ယနေ့အလုပ်ချိန်', workHoursFormat: (h, m) => \`\${h}နာရီ \${m}မိနစ်\`, clockIn: 'အလုပ်ဝင်', breakStart: 'အနားယူ', clockOut: 'အလုပ်ဆင်း', breakEnd: 'ပြန်စမည်', todaysClockHistory: 'ယနေ့မှတ်တမ်း', todaysActivity: 'ယနေ့လုပ်ဆောင်ချက်', activityReported: (icon, label) => \`\${icon} \${label} အစီရင်ခံသည်\`, calendarNoEvents: 'အစီအစဉ်မရှိပါ', adminMessageNoRecipients: 'လက်ခံသူမရှိပါ', attachFile: 'ဖိုင်တွဲရန်', attachmentLimitAlert: 'ဖိုင် ၈ ခုအထိသာ', photoReportHeading: 'ဓာတ်ပုံ အစီရင်ခံစာ', photoReportPrompt: 'ကင်မရာဖွင့် / ပုံရွေးချယ်ရန်', photoReportSubmit: 'ဓာတ်ပုံ ပေးပို့မည်', dailyReportTitle: 'နေ့စဉ် အစီရင်ခံစာ', dailyReportPlaceholder: 'ယနေ့အလုပ်အသေးစိတ်ကို ရိုက်ထည့်ပါ။', dailyReportSubmit: 'အစီရင်ခံစာ ပေးပို့မည်', navHome: 'ပင်မ', navCalendar: 'ပြက္ခဒိန်', navReport: 'အစီရင်ခံစာ', clockStatusWorking: 'အလုပ်လုပ်နေသည်', clockStatusOnBreak: 'နားနေသည်', clockStatusCompleted: 'ပြီးစီးပါသည်', clockTypeIn: 'အလုပ်ဝင်', clockTypeOut: 'အလုပ်ဆင်း', clockTypeBreakStart: 'အနားယူစတင်', clockTypeBreakEnd: 'အနားယူပြီးဆုံး'`
};

// Replace EN
content = content.replace(
  "completeAssignmentLabel: 'Mark as Completed',",
  "completeAssignmentLabel: 'Mark as Completed',\n" + additions.en
);

// Replace JA
content = content.replace(
  "completeAssignmentLabel: '作業を完了とする',",
  "completeAssignmentLabel: '作業を完了とする',\n" + additions.ja
);

// Replace VI
content = content.replace(
  "completeAssignmentLabel: 'Hoàn thành' },",
  "completeAssignmentLabel: 'Hoàn thành'" + additions.vi + " },"
);

// Replace TL
content = content.replace(
  "completeAssignmentLabel: 'Markahan' },",
  "completeAssignmentLabel: 'Markahan'" + additions.tl + " },"
);

// Replace ID
content = content.replace(
  "completeAssignmentLabel: 'Selesai' },",
  "completeAssignmentLabel: 'Selesai'" + additions.id + " },"
);

// Replace MY
content = content.replace(
  "completeAssignmentLabel: 'ဆောင်ရွက်ပြီး' },",
  "completeAssignmentLabel: 'ဆောင်ရွက်ပြီး'" + additions.my + " },"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched cleanly!');
