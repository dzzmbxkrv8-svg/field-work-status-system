import { useMemo } from 'react'

const numberFormatters = {
  en: new Intl.NumberFormat('en-US'),
  ja: new Intl.NumberFormat('ja-JP'),
}

const dateFormatters = {
  en: new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
  ja: new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
}

const translationPacks = {
  en: {
    languageLabel: 'Language',
    languages: {
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      vi: 'Tiếng Việt',
      zh: '中文',
      mn: 'Монгол хэл',
      tl: 'Tagalog',
      pt: 'Português',
      my: 'မြန်မာ',
      ne: 'नेपाली',
      id: 'Bahasa Indonesia',
      si: 'සිංහල',
    },
    actions: {
      logout: 'Sign out',
    },
    header: {
      title: 'Field Work Status System',
      subtitle: 'Monitor crews, share updates, and keep every site aligned in one workspace.',
      roleNavAria: 'Role views',
    },
    tabs: {
      overview: 'Overview',
      monitoring: 'Monitoring',
      orders: 'Orders',
      messages: 'Messages',
      reports: 'Reports',
    },
    filters: {
      searchLabel: 'Search',
      searchPlaceholder: 'Order, Team, Worker Name...',
      statusLabel: 'Status',
      priorityLabel: 'Priority',
      statusOptions: {
        All: 'All',
        Active: 'Active',
      },
      priorityOptions: {
        All: 'All',
      },
    },
    login: {
      title: 'Sign in',
      subtitle: 'Choose your role to access the workspace.',
      roleLabel: 'Role',
      roleOptions: {
        worker: 'Crew member',
        admin: 'Administrator',
      },
      workerIdLabel: 'Worker ID',
      workerPasswordLabel: 'Password',
      accessCodeLabel: 'Access code',
      adminHint: 'Use your administrator access code.',
      workerHint: 'Sign in with your access code and password.',
      forgotPassword: 'Forgot password?',
      workerRegisterTitle: 'Create worker account',
      workerRegisterInstructions: 'Complete the details below using the administrator access code provided to you.',
      workerRegisterSubmit: 'Create account',
      adminRegisterTitle: 'Create organization',
      adminRegisterInstructions: 'Register your organization and receive an administrator access code.',
      adminRegisterSubmit: 'Register organization',
      resetTitle: 'Reset worker password',
      resetInstructions: 'Enter your access code and name to reset your password.',
      resetSubmit: 'Reset password',
      adminResetTitle: 'Reset administrator password',
      adminResetInstructions: 'Enter your access code to reset the administrator password.',
      adminResetSubmit: 'Reset password',
      backToSignIn: 'Back to sign in',
      workerNameLabel: 'Worker name',
      workerTeamLabel: 'Team',
      adminCompanyLabel: 'Organization name',
      adminContactLabel: 'Administrator name',
      adminPasswordLabel: 'Administrator password',
      adminConfirmPasswordLabel: 'Confirm password',
      resetWorkerIdLabel: 'Access code',
      resetNewPasswordLabel: 'New password',
      resetConfirmPasswordLabel: 'Confirm password',
      submit: {
        worker: 'Sign in',
        admin: 'Continue',
      },
      errors: {
        accessCodeRequired: 'Access code is required.',
        workerIdRequired: 'Worker ID is required.',
        workerPasswordRequired: 'Password is required.',
        passwordMismatch: 'Passwords do not match.',
        invalidWorkerCredentials: 'Invalid worker credentials.',
        invalidAdmin: 'Invalid administrator credentials.',
        invalidWorkerCredentialsMessage: 'Unable to sign in. Double check your access code and password.',
        invalidAdminMessage: 'Unable to sign in. Double check your access code and password.',
        organizationNameRequired: 'Organization name is required.',
        invalidAdminCredentials: 'Invalid administrator access code or password.',
      },
      workerRegisterSuccess: 'Worker account created. You can now sign in.',
      adminRegisterSuccess: (code) => `Organization registered. Your access code is ${code}.`,
      resetSuccess: 'Password updated. You can now sign in.',
    },
    overview: {
      title: 'Today at a glance',
      activeWorkers: 'Active workers',
      openOrders: 'Open orders',
      delayedOrders: 'Delayed orders',
      completedToday: 'Completed today',
      recentActivity: 'Recent activity',
      noActivity: 'No recent updates yet.',
      formatPriorityTag: (value) => `Priority: ${value}`,
      formatDue: (value) => `Due: ${value}`,
    },
    admin: {
      panelTitle: 'Administrator dashboard',
      createOrder: 'Create work order',
      exportCsv: 'Export CSV',
      exportingCsv: 'Preparing CSV export...',
      filtersTitle: 'Filters',
      addOrganization: 'Add organization',
      addWorker: 'Add worker',
      updateWorker: 'Update worker',
      workerName: 'Name',
      workerTeam: 'Team',
      workerId: 'Worker ID',
      workerPassword: 'Password',
      workerOrganizationCode: 'Organization code',
      organizationCompanyName: 'Company name',
      organizationAdminName: 'Admin name',
      organizationAdminPassword: 'Admin password',
      organizationCode: 'Organization code',
      dialogSave: 'Save',
      dialogCancel: 'Cancel',
      dialogClose: 'Close',
      addNewWorker: 'Add new worker',
      updateWorkerTitle: 'Update worker',
      addNewOrganization: 'Add new organization',
      monitoringSubtitle: 'Track the latest status updates from each crew.',
      messagesSubtitle: 'Broadcast announcements and see crew replies in one timeline.',
      reportsSubtitle: 'Export reports and review completed work orders.',
    },
    table: {
      headers: {
        team: 'Team',
      },
    },
    summary: {
      activeOrders: 'Active orders',
      completionRate: 'Completion rate',
      inProgress: 'In progress',
      delayed: 'Delayed',
      readyForDispatch: 'Ready for dispatch',
      outstandingStarts: 'Outstanding starts',
    },
    reports: {
      completedOrders: 'Completed work orders',
    },
    monitoring: {
      statusBoardTitle: 'Status board',
      noOrders: 'No work orders yet.',
    },
    worker: {
      title: 'Worker dashboard',
      subtitle: 'Update your status, track today’s work orders, and send quick messages.',
      quickActionsTitle: 'Quick actions',
      currentStatus: 'Current status',
      assignOrder: 'Assigned orders',
      sendMessage: 'Send message',
      messagePlaceholder: 'Type a quick update...',
      send: 'Send',
      locationUnavailable: 'Location unavailable',
      adminMessageSentTab: 'Sent',
      adminMessageReceivedTab: 'Received',
      adminMessageEmpty: 'No messages yet.',
      greetingNight: 'Good night',
      greetingMorning: 'Good morning',
      greetingAfternoon: 'Good afternoon',
      greetingEvening: 'Good evening',
      editAvatar: 'Edit',
      workerIdLabel: 'Worker ID',
      quickActionHint: 'Quick update',
      latestReportTitle: 'Latest report',
      latestReportEmpty: 'No recent reports.',
      upcomingHeading: 'Upcoming Schedule',
      assignmentHeading: 'Assignments',
      assignmentCount: (count) => `${count} assignments`,
      empty: 'No assignments found.',
      assignmentFinishedMessage: 'Assignment completed successfully.',
      assignmentProjectLabel: 'Project',
      assignmentAddressLabel: 'Address',
      assignmentDateLabel: 'Date',
      assignmentCrewLabel: 'Crew size',
      assignmentTaskLabel: 'Task description',
      assignmentMembersLabel: 'Members',
      assignmentCautionLabel: 'Caution',
      assignmentDocsLabel: 'View Documents',
      assignmentUploadLabel: 'Upload Files',
      completeAssignmentLabel: 'Mark as Completed',
    },
    messages: {
      title: 'Messages',
      composeTitle: 'New message',
      placeholder: 'Type a message to broadcast...',
      send: 'Send message',
      historyTitle: 'Message history',
      emptyState: 'No messages yet.',
    },
    attendance: {
      title: 'Attendance',
    },
    statusLabels: {
      'Not Started': 'Not Started',
      'Ready for Dispatch': 'Ready for Dispatch',
      'In Progress': 'In Progress',
      Delayed: 'Delayed',
      Completed: 'Completed',
    },
    priorityLabels: {
      High: 'High',
      Medium: 'Medium',
      Low: 'Low',
    },
    safetyCheckLabels: {
      Pending: 'Pending',
      Cleared: 'Cleared',
      Restrictions: 'Restrictions',
    },
  },
  ja: {
    languageLabel: '言語',
    languages: {
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      vi: 'Tiếng Việt',
      zh: '中文',
      mn: 'Монгол хэл',
      tl: 'Tagalog',
      pt: 'Português',
      my: 'မြန်မာ',
      ne: 'नेपाली',
      id: 'Bahasa Indonesia',
      si: 'සිංහල',
    },
    actions: {
      logout: 'ログアウト',
    },
    header: {
      title: '現場作業ステータスシステム',
      subtitle: 'チームの状況を見える化し、共有し、現場をひとつのワークスペースでつなぎます。',
      roleNavAria: 'ロール切替',
    },
    tabs: {
      overview: '概要',
      monitoring: 'モニタリング',
      orders: '作業指示',
      messages: 'メッセージ',
      reports: 'レポート',
    },
    filters: {
      searchLabel: '検索',
      searchPlaceholder: '指示、チーム、作業者名...',
      statusLabel: 'ステータス',
      priorityLabel: '優先度',
      statusOptions: {
        All: 'すべて',
        Active: '進行中',
      },
      priorityOptions: {
        All: 'すべて',
      },
    },
    login: {
      title: 'サインイン',
      subtitle: '役割を選択してワークスペースへアクセスしてください。',
      roleLabel: '役割',
      roleOptions: {
        worker: '作業者',
        admin: '管理者',
      },
      workerIdLabel: '作業者ID',
      workerPasswordLabel: 'パスワード',
      accessCodeLabel: 'アクセスコード',
      adminHint: '管理者アクセスコードを使用します。',
      workerHint: 'アクセスコードとパスワードでサインインします。',
      forgotPassword: 'パスワードを忘れた場合',
      workerRegisterTitle: '作業者アカウント作成',
      workerRegisterInstructions: '管理者から配布されたアクセスコードを用いて登録してください。',
      workerRegisterSubmit: 'アカウント作成',
      adminRegisterTitle: '組織登録',
      adminRegisterInstructions: '組織を登録し、管理者アクセスコードを発行します。',
      adminRegisterSubmit: '組織を登録',
      resetTitle: '作業者パスワード再設定',
      resetInstructions: 'アクセスコードと氏名を入力してパスワードを再設定します。',
      resetSubmit: '再設定',
      adminResetTitle: '管理者パスワード再設定',
      adminResetInstructions: 'アクセスコードを入力して管理者パスワードを再設定します。',
      adminResetSubmit: '再設定',
      backToSignIn: 'サインインに戻る',
      workerNameLabel: '氏名',
      workerTeamLabel: 'チーム',
      adminCompanyLabel: '組織名',
      adminContactLabel: '管理者名',
      adminPasswordLabel: '管理者パスワード',
      adminConfirmPasswordLabel: '確認用パスワード',
      resetWorkerIdLabel: 'アクセスコード',
      resetNewPasswordLabel: '新しいパスワード',
      resetConfirmPasswordLabel: '確認用パスワード',
      submit: {
        worker: 'サインイン',
        admin: '続行',
      },
      errors: {
        accessCodeRequired: 'アクセスコードは必須です。',
        workerIdRequired: '作業者IDは必須です。',
        workerPasswordRequired: 'パスワードは必須です。',
        passwordMismatch: 'パスワードが一致しません。',
        invalidWorkerCredentials: '作業者情報が正しくありません。',
        invalidAdmin: '管理者情報が正しくありません。',
        invalidWorkerCredentialsMessage: 'サインインできませんでした。アクセスコードとパスワードをご確認ください。',
        invalidAdminMessage: 'サインインできませんでした。アクセスコードとパスワードをご確認ください。',
        organizationNameRequired: '組織名は必須です。',
        invalidAdminCredentials: '管理者アクセスコードまたはパスワードが正しくありません。',
      },
      workerRegisterSuccess: '作業者アカウントを作成しました。サインインできます。',
      adminRegisterSuccess: (code) => `組織を登録しました。アクセスコードは ${code} です。`,
      resetSuccess: 'パスワードを更新しました。サインインできます。',
    },
    overview: {
      title: '本日の概要',
      activeWorkers: '稼働中の作業者',
      openOrders: '未完了の指示',
      delayedOrders: '遅延中の指示',
      completedToday: '本日完了',
      recentActivity: '最近の更新',
      noActivity: 'まだ更新はありません。',
      formatPriorityTag: (value) => `優先度: ${value}`,
      formatDue: (value) => `期限: ${value}`,
    },
    admin: {
      panelTitle: '管理者ダッシュボード',
      createOrder: '作業指示を作成',
      exportCsv: 'CSV出力',
      exportingCsv: 'CSV出力を準備中...',
      filtersTitle: 'フィルター',
      addOrganization: '組織を追加',
      addWorker: '作業者を追加',
      updateWorker: '作業者を更新',
      workerName: '氏名',
      workerTeam: 'チーム',
      workerId: '作業者ID',
      workerPassword: 'パスワード',
      workerOrganizationCode: '組織コード',
      organizationCompanyName: '組織名',
      organizationAdminName: '管理者名',
      organizationAdminPassword: '管理者パスワード',
      organizationCode: '組織コード',
      dialogSave: '保存',
      dialogCancel: 'キャンセル',
      dialogClose: '閉じる',
      addNewWorker: '作業者を追加',
      updateWorkerTitle: '作業者情報の更新',
      addNewOrganization: '組織を追加',
      monitoringSubtitle: '各チームの最新ステータス更新を一覧で確認します。',
      messagesSubtitle: 'お知らせの配信と作業者からの返信をタイムラインで管理します。',
      reportsSubtitle: 'CSV出力や完了指示の確認ができます。',
    },
    table: {
      headers: {
        team: 'チーム',
      },
    },
    summary: {
      activeOrders: '進行中の指示',
      completionRate: '完了率',
      inProgress: '進行中',
      delayed: '遅延',
      readyForDispatch: '出発準備完了',
      outstandingStarts: '未着手',
    },
    reports: {
      completedOrders: '完了した作業指示',
    },
    monitoring: {
      statusBoardTitle: 'ステータスボード',
      noOrders: '作業指示がありません。',
    },
    worker: {
      title: '作業者ダッシュボード',
      subtitle: 'ステータス更新、担当指示の確認、メッセージ送信を行えます。',
      quickActionsTitle: 'クイック操作',
      currentStatus: '現在のステータス',
      assignOrder: '担当の作業指示',
      sendMessage: 'メッセージ送信',
      messagePlaceholder: '状況を簡単に入力...',
      send: '送信',
      locationUnavailable: '現在地情報なし',
      adminMessageSentTab: '送信済',
      adminMessageReceivedTab: '受信',
      adminMessageEmpty: 'メッセージはありません。',
      greetingNight: 'お疲れ様です',
      greetingMorning: 'おはようございます',
      greetingAfternoon: 'こんにちは',
      greetingEvening: 'お疲れ様です',
      editAvatar: '編集',
      workerIdLabel: '作業者ID',
      quickActionHint: '簡単ステータス報告',
      latestReportTitle: '最新の報告',
      latestReportEmpty: '報告履歴はありません。',
      upcomingHeading: '今後の予定',
      assignmentHeading: '担当作業',
      assignmentCount: (count) => `全${count}件`,
      empty: '担当する作業指示はありません。',
      assignmentFinishedMessage: 'この作業は完了しました。',
      assignmentProjectLabel: '案件名',
      assignmentAddressLabel: '住所',
      assignmentDateLabel: '日時',
      assignmentCrewLabel: '人数',
      assignmentTaskLabel: '作業内容',
      assignmentMembersLabel: 'メンバー',
      assignmentCautionLabel: '注意事項',
      assignmentDocsLabel: '資料・図面を確認',
      assignmentUploadLabel: '写真・報告をアップロード',
      completeAssignmentLabel: '作業を完了とする',
    },
    messages: {
      title: 'メッセージ',
      composeTitle: '新規メッセージ',
      placeholder: '全体に送るメッセージを入力...',
      send: '送信',
      historyTitle: '履歴',
      emptyState: 'メッセージはありません。',
    },
    attendance: {
      title: '勤怠',
    },
    statusLabels: {
      'Not Started': '未着手',
      'Ready for Dispatch': '出発準備完了',
      'In Progress': '進行中',
      Delayed: '遅延',
      Completed: '完了',
    },
    priorityLabels: {
      High: '高',
      Medium: '中',
      Low: '低',
    },
    safetyCheckLabels: {
      Pending: '未確認',
      Cleared: '確認済',
      Restrictions: '制限あり',
    },
  },
}

function mergeDeep(base, override) {
  if (!override) return base
  if (typeof base !== 'object' || base === null) return override
  if (typeof override !== 'object' || override === null) return override

  const result = Array.isArray(base) ? [...base] : { ...base }
  Object.keys(override).forEach((key) => {
    const baseValue = base[key]
    const overrideValue = override[key]
    if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
      result[key] = overrideValue.length > 0 ? overrideValue : baseValue
    } else if (typeof baseValue === 'object' && baseValue && typeof overrideValue === 'object' && overrideValue) {
      result[key] = mergeDeep(baseValue, overrideValue)
    } else {
      result[key] = overrideValue
    }
  })

  return result
}

let currentLanguage = 'ja'

function resolveLanguage(language) {
  return translationPacks[language] ? language : 'en'
}

function formatDateValue(value, language) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatter = dateFormatters[language] ?? dateFormatters.en
  return formatter.format(date)
}

function buildPack(language) {
  const base = translationPacks.en
  const selected = translationPacks[language] ?? base
  if (selected === base) {
    return base
  }
  return mergeDeep(base, selected)
}

export function changeLanguage(language) {
  currentLanguage = resolveLanguage(language ?? currentLanguage)
}

export function getCurrentLanguage() {
  return currentLanguage
}

const dateTimeFormatters = {
  en: new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }),
  ja: new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }),
}

function formatDateTimeValue(value, language) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatter = dateTimeFormatters[language] ?? dateTimeFormatters.en
  return formatter.format(date)
}

export function useI18n(language = currentLanguage) {
  const resolvedLanguage = resolveLanguage(language)
  const pack = useMemo(() => buildPack(resolvedLanguage), [resolvedLanguage])

  return useMemo(
    () => ({
      language: resolvedLanguage,
      text: pack,
      formatDate: (value) => formatDateValue(value, resolvedLanguage),
      formatDateTime: (value) => formatDateTimeValue(value, resolvedLanguage),
      formatNumber: (value) => {
        if (value === null || value === undefined || value === '') return ''
        const numericValue = Number(value)
        if (Number.isNaN(numericValue)) return String(value)
        const formatter = numberFormatters[resolvedLanguage] ?? numberFormatters.en
        return formatter.format(numericValue)
      },
      getStatusLabel: (status) => pack.statusLabels[status] ?? status,
      getPriorityLabel: (priority) => pack.priorityLabels[priority] ?? priority,
      getSafetyCheckLabel: (value) => pack.safetyCheckLabels[value] ?? value,
      formatPriorityTag: (priority) => pack.overview.formatPriorityTag(pack.priorityLabels[priority] ?? priority),
      formatDue: (value) => pack.overview.formatDue(formatDateValue(value, resolvedLanguage)),
    }),
    [pack, resolvedLanguage]
  )
}
