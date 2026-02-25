// Script to add all missing admin panel i18n keys to locale files
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');

const newKeys = {
  ru: {
    admin: {
      activity: {
        subtitle: "Мониторинг сессий и активности пользователей в реальном времени",
        currentlyOnline: "Сейчас онлайн",
        loadingOnline: "Загрузка онлайн пользователей...",
        noUsersOnline: "Нет пользователей онлайн",
        activePrefix: "Активен",
        loggedInPrefix: "Вошёл",
        userSessions: "Сессии пользователей",
        filterSessions: "Фильтр сессий",
        allSessions: "Все сессии",
        activeOnly: "Только активные",
        loadingSessions: "Загрузка сессий...",
        noSessions: "Сессии не найдены",
        table: {
          user: "Пользователь",
          status: "Статус",
          loginTime: "Время входа",
          lastActivity: "Последняя активность",
          duration: "Длительность",
          device: "Устройство",
          browser: "Браузер",
          ipAddress: "IP адрес",
          actions: "Действия"
        },
        status: {
          ended: "Завершена",
          active: "Активна"
        },
        actionsCount: "действий"
      },
      audit: {
        title: "Журнал аудита",
        subtitle: "Полная история всех административных действий",
        searchPlaceholder: "Поиск по действию...",
        filterByEntity: "Фильтр по объекту",
        allEntities: "Все объекты",
        entities: {
          user: "Пользователь",
          salon: "Салон",
          master: "Мастер",
          complaint: "Жалоба",
          sanction: "Санкция",
          booking: "Запись"
        },
        recentActions: "Последние действия",
        loading: "Загрузка...",
        noLogs: "Журнал пуст",
        table: {
          timestamp: "Время",
          actor: "Исполнитель",
          role: "Роль",
          action: "Действие",
          entity: "Объект",
          ipAddress: "IP адрес",
          details: "Детали"
        },
        adminFallback: "Администратор",
        dialog: {
          title: "Детали записи аудита",
          description: "Полная информация об этом административном действии",
          labels: {
            action: "Действие",
            timestamp: "Время",
            actor: "Исполнитель",
            role: "Роль",
            entityType: "Тип объекта",
            entityId: "ID объекта",
            ipAddress: "IP адрес",
            userAgent: "User Agent",
            previousState: "Предыдущее состояние",
            newState: "Новое состояние",
            metadata: "Метаданные"
          },
          close: "Закрыть"
        }
      },
      chat: {
        title: "Чат поддержки",
        subtitle: "Ответы на запросы пользователей",
        filterByStatus: "Фильтр по статусу",
        allStatus: "Все статусы",
        status: {
          open: "Открыт",
          closed: "Закрыт"
        },
        threads: "Темы чата",
        loading: "Загрузка...",
        noThreads: "Нет тем чата",
        table: {
          user: "Пользователь",
          status: "Статус",
          lastMessage: "Последнее сообщение",
          created: "Создан",
          actions: "Действия"
        },
        userFallback: "Пользователь",
        adminLabel: "Администратор",
        buttons: {
          assign: "Назначить",
          open: "Открыть",
          close: "Закрыть",
          cancel: "Отмена",
          send: "Отправить",
          closing: "Закрытие...",
          closeThread: "Закрыть тему"
        },
        dialog: {
          title: "Чат поддержки",
          chatWith: "Чат с",
          loadingMessages: "Загрузка сообщений...",
          noMessages: "Сообщений пока нет",
          messagePlaceholder: "Введите сообщение...",
          closeReason: "Причина закрытия *",
          closeReasonPlaceholder: "Объясните причину закрытия темы...",
          closeThreadTitle: "Закрыть тему",
          closeThreadDescription: "Укажите причину закрытия этой темы поддержки."
        },
        toasts: {
          messageSent: "Сообщение отправлено",
          messageFailed: "Не удалось отправить сообщение",
          assigned: "Тема назначена вам",
          assignFailed: "Не удалось назначить тему",
          closed: "Тема закрыта",
          closeFailed: "Не удалось закрыть тему",
          reasonRequired: "Укажите причину закрытия"
        }
      },
      complaints: {
        title: "Модерация жалоб",
        subtitle: "Просмотр и разрешение жалоб пользователей",
        filterByStatus: "Фильтр по статусу",
        allStatus: "Все статусы",
        filterByCategory: "Фильтр по категории",
        allCategories: "Все категории",
        status: {
          open: "Открыта",
          in_review: "На рассмотрении",
          resolved: "Решена",
          rejected: "Отклонена"
        },
        categories: {
          spam: "Спам",
          fraud: "Мошенничество",
          abuse: "Нарушение",
          quality: "Качество",
          other: "Прочее"
        },
        allComplaints: "Все жалобы",
        loading: "Загрузка...",
        noComplaints: "Жалоб нет",
        table: {
          complainant: "Заявитель",
          category: "Категория",
          target: "Объект жалобы",
          status: "Статус",
          date: "Дата",
          actions: "Действия"
        },
        anonymousFallback: "Аноним",
        buttons: {
          assign: "Назначить",
          resolve: "Решить",
          reject: "Отклонить",
          cancel: "Отмена",
          resolving: "Сохранение...",
          rejecting: "Отклонение..."
        },
        resolveDialog: {
          title: "Решить жалобу",
          description: "Описание:",
          decisionLabel: "Решение",
          decisions: {
            none: "Без действий",
            warning: "Вынесено предупреждение",
            sanction: "Применена санкция"
          },
          commentLabel: "Комментарий к решению",
          commentPlaceholder: "Объясните решение по жалобе...",
          resolveButton: "Решить жалобу"
        },
        rejectDialog: {
          title: "Отклонить жалобу",
          description: "Укажите причину отклонения этой жалобы.",
          reasonLabel: "Причина отклонения",
          reasonPlaceholder: "Объясните причину отклонения...",
          rejectButton: "Отклонить жалобу"
        },
        toasts: {
          assigned: "Жалоба назначена вам",
          assignFailed: "Не удалось назначить жалобу",
          resolved: "Жалоба решена",
          resolveFailed: "Не удалось решить жалобу",
          rejected: "Жалоба отклонена",
          rejectFailed: "Не удалось отклонить жалобу",
          reasonRequired: "Укажите причину отклонения"
        }
      },
      dashboard: {
        onlineUsers: "Пользователей онлайн",
        onlineSubtitle: "Активны последние 10 минут • Обновляется каждые 30с",
        userGrowthTitle: "Рост пользователей (последние 30 дней)",
        userGrowthSubtitle: "Ежедневная регистрация новых пользователей",
        newUsersLabel: "Новые пользователи",
        noGrowthData: "Нет данных о росте",
        platformHealth: "Здоровье платформы",
        platformHealthSubtitle: "Ключевые показатели производительности",
        metrics: {
          activeSessions: "Активных сессий (24ч)",
          activeSessDesc: "Вошедшие пользователи",
          avgSession: "Средняя сессия",
          avgSessDesc: "Длительность в минутах",
          emailVerified: "Email верифицирован",
          emailVerifDesc: "Процент верификации",
          phoneVerified: "Телефон верифицирован",
          phoneVerifDesc: "Процент верификации",
          pendingComplaints: "Жалобы ожидают",
          pendingComplDesc: "Требуют внимания",
          blockedUsers: "Заблокированных",
          blockedUsersDesc: "Процент заблокированных"
        }
      },
      salons: {
        subtitle: "Управление и верификация салонов",
        searchPlaceholder: "Поиск салонов...",
        loading: "Загрузка...",
        noSalons: "Салоны не найдены",
        table: {
          salon: "Салон",
          location: "Адрес",
          status: "Статус",
          actions: "Действия"
        },
        idPrefix: "ID:",
        verified: "Верифицирован",
        notVerified: "Не верифицирован",
        toasts: {
          verifiedSuccess: "Салон верифицирован",
          verifyFailed: "Не удалось верифицировать салон",
          unverifiedSuccess: "Верификация снята",
          unverifyFailed: "Не удалось снять верификацию"
        }
      },
      sanctions: {
        title: "Санкции",
        subtitle: "Управление санкциями пользователей и салонов",
        filterByStatus: "Фильтр по статусу",
        filterByTarget: "Фильтр по объекту",
        allStatus: "Все статусы",
        allTargets: "Все объекты",
        status: {
          active: "Активная",
          expired: "Истекшая",
          revoked: "Отозванная"
        },
        targets: {
          user: "Пользователь",
          salon: "Салон",
          master: "Мастер",
          client: "Клиент"
        },
        types: {
          temporary_block: "Временная блокировка",
          permanent_block: "Постоянная блокировка",
          feature_restriction: "Ограничение функций"
        },
        allSanctions: "Все санкции",
        loading: "Загрузка...",
        noSanctions: "Санкций нет",
        table: {
          target: "Объект",
          type: "Тип",
          reason: "Причина",
          status: "Статус",
          started: "Начало",
          endsAt: "Конец",
          actions: "Действия"
        },
        permanent: "Постоянная",
        buttons: {
          details: "Детали",
          revoke: "Отозвать",
          close: "Закрыть",
          cancel: "Отмена",
          revoking: "Отзыв...",
          revokeButton: "Отозвать санкцию"
        },
        detailsDialog: {
          title: "Детали санкции",
          labels: {
            targetType: "Тип объекта",
            targetId: "ID объекта",
            sanctionType: "Тип санкции",
            status: "Статус",
            startedAt: "Начало",
            endsAt: "Конец",
            reason: "Причина",
            commentToUser: "Комментарий пользователю",
            internalNote: "Внутренняя заметка",
            revokeReason: "Причина отзыва",
            revokedOn: "Отозвана"
          }
        },
        revokeDialog: {
          title: "Отозвать санкцию",
          description: "Укажите причину отзыва этой санкции.",
          targetPrefix: "Объект:",
          reasonLabel: "Причина отзыва *",
          reasonPlaceholder: "Объясните причину отзыва санкции..."
        },
        toasts: {
          revokedSuccess: "Санкция успешно отозвана",
          revokeFailed: "Не удалось отозвать санкцию",
          reasonRequired: "Укажите причину отзыва"
        }
      },
      users: {
        subtitle: "Управление всеми пользователями платформы",
        totalCount: "всего пользователей",
        selectedCount: "выбрано",
        exportExcel: "Экспорт Excel",
        exportPdf: "Экспорт PDF",
        refresh: "Обновить",
        clearSelection: "Снять выбор",
        stats: {
          totalUsers: "Всего пользователей",
          active: "Активных",
          blocked: "Заблокированных",
          byRole: "По ролям",
          clients: "Клиентов:",
          owners: "Владельцев:",
          masters: "Мастеров:",
          admins: "Администраторов:"
        },
        searchFilters: "Поиск и фильтры",
        searchPlaceholder: "Поиск...",
        roles: {
          allRoles: "Все роли",
          client: "Клиент",
          owner: "Владелец",
          master: "Мастер",
          admin: "Администратор"
        },
        statuses: {
          allStatuses: "Все статусы",
          active: "Активный",
          blocked: "Заблокированный"
        },
        verification: {
          all: "Все",
          fullyVerified: "Полностью верифицирован",
          emailVerified: "Email верифицирован",
          phoneVerified: "Телефон верифицирован",
          unverified: "Не верифицирован"
        },
        loadError: "Не удалось загрузить пользователей",
        loadErrorDesc: "Произошла ошибка при загрузке списка. Попробуйте снова.",
        tryAgain: "Попробовать снова",
        loadingUsers: "Загрузка пользователей...",
        noUsersFound: "Пользователи не найдены",
        noUsersFiltered: "Попробуйте изменить фильтры...",
        noUsersEmpty: "Пока нет зарегистрированных пользователей...",
        clearFilters: "Сбросить фильтры",
        table: {
          contact: "Контакт",
          joined: "Дата",
          verification: "Верификация",
          email: "Email",
          phone: "Телефон",
          noName: "Без имени",
          emailVerified: "Email ✓",
          emailUnverified: "Email ✗",
          phoneVerified: "Тел ✓",
          phoneUnverified: "Тел ✗"
        },
        pagination: {
          showing: "Показано",
          to: "по",
          of: "из",
          users: "пользователей",
          previous: "Назад",
          next: "Вперёд"
        },
        actions: {
          quickView: "Быстрый просмотр",
          fullDetails: "Полные детали",
          blockUser: "Заблокировать",
          unblockUser: "Разблокировать",
          deleteUser: "Удалить"
        },
        blockDialog: {
          title: "Заблокировать пользователя",
          descPrefix: "Заблокировать",
          reasonLabel: "Причина блокировки (обязательно)",
          reasonPlaceholder: "Напр., Спам, нарушение условий...",
          cancel: "Отмена",
          blocking: "Блокировка...",
          blockButton: "Заблокировать"
        },
        deleteDialog: {
          title: "Удалить пользователя",
          descPrefix: "Вы уверены, что хотите удалить",
          descSuffix: "? Это действие необратимо.",
          cancel: "Отмена",
          deleting: "Удаление...",
          deleteButton: "Удалить пользователя"
        },
        viewDialog: {
          title: "Детали пользователя",
          description: "Краткий обзор информации о пользователе",
          labels: {
            fullName: "Полное имя",
            role: "Роль",
            email: "Email",
            phone: "Телефон",
            accountStatus: "Статус аккаунта",
            verification: "Верификация",
            memberSince: "Участник с",
            userId: "ID пользователя"
          },
          close: "Закрыть",
          viewFull: "Полные детали"
        },
        testUsersDialog: {
          title: "Создать тестовых пользователей",
          description: "Будет создано 7 тестовых пользователей для проверки функций.",
          toBeCreated: "Тестовые пользователи:",
          credentials: "Данные для входа:",
          email: "Email:",
          password: "Пароль:",
          cancel: "Отмена",
          creating: "Создание...",
          createButton: "Создать пользователей"
        },
        toasts: {
          blockedSuccess: "Пользователь заблокирован",
          blockFailed: "Не удалось заблокировать",
          unblockedSuccess: "Пользователь разблокирован",
          unblockFailed: "Не удалось разблокировать",
          deletedSuccess: "Пользователь удалён",
          deleteFailed: "Не удалось удалить",
          testCreated: "Тестовые пользователи созданы",
          testFailed: "Не удалось создать тестовых пользователей",
          exportSuccess: "Экспорт успешен",
          noData: "Нет данных для экспорта",
          pleaseProvideReason: "Укажите причину"
        }
      }
    }
  },
  en: {
    admin: {
      activity: {
        subtitle: "Monitor user sessions and activity in real-time",
        currentlyOnline: "Currently Online",
        loadingOnline: "Loading online users...",
        noUsersOnline: "No users currently online",
        activePrefix: "Active",
        loggedInPrefix: "Logged in",
        userSessions: "User Sessions",
        filterSessions: "Filter sessions",
        allSessions: "All Sessions",
        activeOnly: "Active Only",
        loadingSessions: "Loading sessions...",
        noSessions: "No sessions found",
        table: {
          user: "User",
          status: "Status",
          loginTime: "Login Time",
          lastActivity: "Last Activity",
          duration: "Duration",
          device: "Device",
          browser: "Browser",
          ipAddress: "IP Address",
          actions: "Actions"
        },
        status: {
          ended: "Ended",
          active: "Active"
        },
        actionsCount: "actions"
      },
      audit: {
        title: "Audit Logs",
        subtitle: "Complete history of all admin actions",
        searchPlaceholder: "Search by action...",
        filterByEntity: "Filter by entity",
        allEntities: "All Entities",
        entities: {
          user: "User",
          salon: "Salon",
          master: "Master",
          complaint: "Complaint",
          sanction: "Sanction",
          booking: "Booking"
        },
        recentActions: "Recent Actions",
        loading: "Loading...",
        noLogs: "No audit logs",
        table: {
          timestamp: "Timestamp",
          actor: "Actor",
          role: "Role",
          action: "Action",
          entity: "Entity",
          ipAddress: "IP Address",
          details: "Details"
        },
        adminFallback: "Admin",
        dialog: {
          title: "Audit Log Details",
          description: "Complete information about this admin action",
          labels: {
            action: "Action",
            timestamp: "Timestamp",
            actor: "Actor",
            role: "Role",
            entityType: "Entity Type",
            entityId: "Entity ID",
            ipAddress: "IP Address",
            userAgent: "User Agent",
            previousState: "Previous State",
            newState: "New State",
            metadata: "Metadata"
          },
          close: "Close"
        }
      },
      chat: {
        title: "Support Chat",
        subtitle: "Respond to user support requests",
        filterByStatus: "Filter by status",
        allStatus: "All Status",
        status: {
          open: "Open",
          closed: "Closed"
        },
        threads: "Chat Threads",
        loading: "Loading...",
        noThreads: "No chat threads",
        table: {
          user: "User",
          status: "Status",
          lastMessage: "Last Message",
          created: "Created",
          actions: "Actions"
        },
        userFallback: "User",
        adminLabel: "Admin",
        buttons: {
          assign: "Assign",
          open: "Open",
          close: "Close",
          cancel: "Cancel",
          send: "Send",
          closing: "Closing...",
          closeThread: "Close Thread"
        },
        dialog: {
          title: "Support Chat",
          chatWith: "Chat with",
          loadingMessages: "Loading messages...",
          noMessages: "No messages yet",
          messagePlaceholder: "Type your message...",
          closeReason: "Close Reason *",
          closeReasonPlaceholder: "Explain why this thread is being closed...",
          closeThreadTitle: "Close Thread",
          closeThreadDescription: "Provide a reason for closing this support thread."
        },
        toasts: {
          messageSent: "Message sent",
          messageFailed: "Failed to send message",
          assigned: "Thread assigned to you",
          assignFailed: "Failed to assign thread",
          closed: "Thread closed",
          closeFailed: "Failed to close thread",
          reasonRequired: "Please provide a close reason"
        }
      },
      complaints: {
        title: "Complaint Moderation",
        subtitle: "Review and resolve user complaints",
        filterByStatus: "Filter by status",
        allStatus: "All Status",
        filterByCategory: "Filter by category",
        allCategories: "All Categories",
        status: {
          open: "Open",
          in_review: "In Review",
          resolved: "Resolved",
          rejected: "Rejected"
        },
        categories: {
          spam: "Spam",
          fraud: "Fraud",
          abuse: "Abuse",
          quality: "Quality",
          other: "Other"
        },
        allComplaints: "All Complaints",
        loading: "Loading...",
        noComplaints: "No complaints",
        table: {
          complainant: "Complainant",
          category: "Category",
          target: "Target",
          status: "Status",
          date: "Date",
          actions: "Actions"
        },
        anonymousFallback: "Anonymous",
        buttons: {
          assign: "Assign",
          resolve: "Resolve",
          reject: "Reject",
          cancel: "Cancel",
          resolving: "Resolving...",
          rejecting: "Rejecting..."
        },
        resolveDialog: {
          title: "Resolve Complaint",
          description: "Description:",
          decisionLabel: "Decision",
          decisions: {
            none: "No Action",
            warning: "Warning Issued",
            sanction: "Sanction Applied"
          },
          commentLabel: "Resolution Comment",
          commentPlaceholder: "Explain the resolution decision...",
          resolveButton: "Resolve Complaint"
        },
        rejectDialog: {
          title: "Reject Complaint",
          description: "Provide a reason for rejecting this complaint.",
          reasonLabel: "Rejection Reason",
          reasonPlaceholder: "Explain why this complaint is being rejected...",
          rejectButton: "Reject Complaint"
        },
        toasts: {
          assigned: "Complaint assigned to you",
          assignFailed: "Failed to assign complaint",
          resolved: "Complaint resolved",
          resolveFailed: "Failed to resolve complaint",
          rejected: "Complaint rejected",
          rejectFailed: "Failed to reject complaint",
          reasonRequired: "Please provide a rejection reason"
        }
      },
      dashboard: {
        onlineUsers: "Online Users",
        onlineSubtitle: "Active in last 10 minutes • Updates every 30s",
        userGrowthTitle: "User Growth (Last 30 Days)",
        userGrowthSubtitle: "Daily new user registrations",
        newUsersLabel: "New Users",
        noGrowthData: "No growth data available",
        platformHealth: "Platform Health",
        platformHealthSubtitle: "Key performance indicators",
        metrics: {
          activeSessions: "Active Sessions (24h)",
          activeSessDesc: "Logged in users",
          avgSession: "Avg Session",
          avgSessDesc: "Duration in minutes",
          emailVerified: "Email Verified",
          emailVerifDesc: "Verification rate",
          phoneVerified: "Phone Verified",
          phoneVerifDesc: "Verification rate",
          pendingComplaints: "Pending Complaints",
          pendingComplDesc: "Require attention",
          blockedUsers: "Blocked Users",
          blockedUsersDesc: "Percentage blocked"
        }
      },
      salons: {
        subtitle: "Manage and verify salons",
        searchPlaceholder: "Search salons...",
        loading: "Loading...",
        noSalons: "No salons found",
        table: {
          salon: "Salon",
          location: "Location",
          status: "Status",
          actions: "Actions"
        },
        idPrefix: "ID:",
        verified: "Verified",
        notVerified: "Not Verified",
        toasts: {
          verifiedSuccess: "Salon verified successfully",
          verifyFailed: "Failed to verify salon",
          unverifiedSuccess: "Salon unverified",
          unverifyFailed: "Failed to unverify salon"
        }
      },
      sanctions: {
        title: "Sanctions",
        subtitle: "Manage user and salon sanctions",
        filterByStatus: "Filter by status",
        filterByTarget: "Filter by target",
        allStatus: "All Status",
        allTargets: "All Targets",
        status: {
          active: "Active",
          expired: "Expired",
          revoked: "Revoked"
        },
        targets: {
          user: "User",
          salon: "Salon",
          master: "Master",
          client: "Client"
        },
        types: {
          temporary_block: "Temporary Block",
          permanent_block: "Permanent Block",
          feature_restriction: "Feature Restriction"
        },
        allSanctions: "All Sanctions",
        loading: "Loading...",
        noSanctions: "No sanctions",
        table: {
          target: "Target",
          type: "Type",
          reason: "Reason",
          status: "Status",
          started: "Started",
          endsAt: "Ends At",
          actions: "Actions"
        },
        permanent: "Permanent",
        buttons: {
          details: "Details",
          revoke: "Revoke",
          close: "Close",
          cancel: "Cancel",
          revoking: "Revoking...",
          revokeButton: "Revoke Sanction"
        },
        detailsDialog: {
          title: "Sanction Details",
          labels: {
            targetType: "Target Type",
            targetId: "Target ID",
            sanctionType: "Sanction Type",
            status: "Status",
            startedAt: "Started At",
            endsAt: "Ends At",
            reason: "Reason",
            commentToUser: "Comment to User",
            internalNote: "Internal Note",
            revokeReason: "Revoke Reason",
            revokedOn: "Revoked on"
          }
        },
        revokeDialog: {
          title: "Revoke Sanction",
          description: "Provide a reason for revoking this sanction.",
          targetPrefix: "Target:",
          reasonLabel: "Revoke Reason *",
          reasonPlaceholder: "Explain why this sanction is being revoked..."
        },
        toasts: {
          revokedSuccess: "Sanction revoked successfully",
          revokeFailed: "Failed to revoke sanction",
          reasonRequired: "Please provide a revoke reason"
        }
      },
      users: {
        subtitle: "Manage all platform users",
        totalCount: "total users",
        selectedCount: "selected",
        exportExcel: "Export Excel",
        exportPdf: "Export PDF",
        refresh: "Refresh",
        clearSelection: "Clear Selection",
        stats: {
          totalUsers: "Total Users",
          active: "Active",
          blocked: "Blocked",
          byRole: "By Role",
          clients: "Clients:",
          owners: "Owners:",
          masters: "Masters:",
          admins: "Admins:"
        },
        searchFilters: "Search & Filters",
        searchPlaceholder: "Search...",
        roles: {
          allRoles: "All Roles",
          client: "Client",
          owner: "Owner",
          master: "Master",
          admin: "Admin"
        },
        statuses: {
          allStatuses: "All Status",
          active: "Active",
          blocked: "Blocked"
        },
        verification: {
          all: "All",
          fullyVerified: "Fully Verified",
          emailVerified: "Email Verified",
          phoneVerified: "Phone Verified",
          unverified: "Unverified"
        },
        loadError: "Failed to load users",
        loadErrorDesc: "There was an error loading the user list. Please try again.",
        tryAgain: "Try Again",
        loadingUsers: "Loading users...",
        noUsersFound: "No users found",
        noUsersFiltered: "Try adjusting your filters...",
        noUsersEmpty: "No users have registered yet...",
        clearFilters: "Clear Filters",
        table: {
          contact: "Contact",
          joined: "Joined",
          verification: "Verification",
          email: "Email",
          phone: "Phone",
          noName: "No name",
          emailVerified: "Email ✓",
          emailUnverified: "Email ✗",
          phoneVerified: "Phone ✓",
          phoneUnverified: "Phone ✗"
        },
        pagination: {
          showing: "Showing",
          to: "to",
          of: "of",
          users: "users",
          previous: "Previous",
          next: "Next"
        },
        actions: {
          quickView: "Quick View",
          fullDetails: "Full Details",
          blockUser: "Block User",
          unblockUser: "Unblock User",
          deleteUser: "Delete User"
        },
        blockDialog: {
          title: "Block User",
          descPrefix: "Block",
          reasonLabel: "Reason for blocking (required)",
          reasonPlaceholder: "e.g., Spam, abuse, violation of terms...",
          cancel: "Cancel",
          blocking: "Blocking...",
          blockButton: "Block User"
        },
        deleteDialog: {
          title: "Delete User",
          descPrefix: "Are you sure you want to permanently delete",
          descSuffix: "? This action cannot be undone.",
          cancel: "Cancel",
          deleting: "Deleting...",
          deleteButton: "Delete User"
        },
        viewDialog: {
          title: "User Details",
          description: "Quick overview of user information",
          labels: {
            fullName: "Full Name",
            role: "Role",
            email: "Email",
            phone: "Phone",
            accountStatus: "Account Status",
            verification: "Verification",
            memberSince: "Member Since",
            userId: "User ID"
          },
          close: "Close",
          viewFull: "View Full Details"
        },
        testUsersDialog: {
          title: "Create Test Users",
          description: "This will create 7 test users for testing features.",
          toBeCreated: "Test users to be created:",
          credentials: "Login Credentials:",
          email: "Email:",
          password: "Password:",
          cancel: "Cancel",
          creating: "Creating...",
          createButton: "Create Test Users"
        },
        toasts: {
          blockedSuccess: "User blocked successfully",
          blockFailed: "Failed to block user",
          unblockedSuccess: "User unblocked successfully",
          unblockFailed: "Failed to unblock user",
          deletedSuccess: "User deleted successfully",
          deleteFailed: "Failed to delete user",
          testCreated: "Test users created",
          testFailed: "Failed to create test users",
          exportSuccess: "Export successful",
          noData: "No data to export",
          pleaseProvideReason: "Please provide a reason"
        }
      }
    }
  },
  uz: {
    admin: {
      activity: {
        subtitle: "Foydalanuvchi seanslari va faolligini real vaqtda kuzatish",
        currentlyOnline: "Hozir onlayn",
        loadingOnline: "Onlayn foydalanuvchilar yuklanmoqda...",
        noUsersOnline: "Hozir onlayn foydalanuvchilar yo'q",
        activePrefix: "Faol",
        loggedInPrefix: "Kirdi",
        userSessions: "Foydalanuvchi seanslari",
        filterSessions: "Seanslarni filtrlash",
        allSessions: "Barcha seanslar",
        activeOnly: "Faqat faollar",
        loadingSessions: "Seanslar yuklanmoqda...",
        noSessions: "Seanslar topilmadi",
        table: {
          user: "Foydalanuvchi",
          status: "Holat",
          loginTime: "Kirish vaqti",
          lastActivity: "Oxirgi faollik",
          duration: "Davomiyligi",
          device: "Qurilma",
          browser: "Brauzer",
          ipAddress: "IP manzil",
          actions: "Amallar"
        },
        status: {
          ended: "Tugagan",
          active: "Faol"
        },
        actionsCount: "amal"
      },
      audit: {
        title: "Audit jurnali",
        subtitle: "Barcha admin amallarining to'liq tarixi",
        searchPlaceholder: "Amal bo'yicha qidirish...",
        filterByEntity: "Ob'ekt bo'yicha filtrlash",
        allEntities: "Barcha ob'ektlar",
        entities: {
          user: "Foydalanuvchi",
          salon: "Salon",
          master: "Master",
          complaint: "Shikoyat",
          sanction: "Sanksiya",
          booking: "Bron"
        },
        recentActions: "So'nggi amallar",
        loading: "Yuklanmoqda...",
        noLogs: "Audit yozuvlari yo'q",
        table: {
          timestamp: "Vaqt",
          actor: "Ijrochi",
          role: "Rol",
          action: "Amal",
          entity: "Ob'ekt",
          ipAddress: "IP manzil",
          details: "Tafsilotlar"
        },
        adminFallback: "Admin",
        dialog: {
          title: "Audit yozuvi tafsilotlari",
          description: "Ushbu admin amali haqida to'liq ma'lumot",
          labels: {
            action: "Amal",
            timestamp: "Vaqt",
            actor: "Ijrochi",
            role: "Rol",
            entityType: "Ob'ekt turi",
            entityId: "Ob'ekt ID",
            ipAddress: "IP manzil",
            userAgent: "User Agent",
            previousState: "Oldingi holat",
            newState: "Yangi holat",
            metadata: "Metadata"
          },
          close: "Yopish"
        }
      },
      chat: {
        title: "Qo'llab-quvvatlash chati",
        subtitle: "Foydalanuvchi so'rovlariga javob berish",
        filterByStatus: "Holat bo'yicha filtrlash",
        allStatus: "Barcha holatlar",
        status: {
          open: "Ochiq",
          closed: "Yopiq"
        },
        threads: "Chat iplari",
        loading: "Yuklanmoqda...",
        noThreads: "Chat iplari yo'q",
        table: {
          user: "Foydalanuvchi",
          status: "Holat",
          lastMessage: "Oxirgi xabar",
          created: "Yaratilgan",
          actions: "Amallar"
        },
        userFallback: "Foydalanuvchi",
        adminLabel: "Admin",
        buttons: {
          assign: "Tayinlash",
          open: "Ochish",
          close: "Yopish",
          cancel: "Bekor qilish",
          send: "Yuborish",
          closing: "Yopilmoqda...",
          closeThread: "Ipni yopish"
        },
        dialog: {
          title: "Qo'llab-quvvatlash chati",
          chatWith: "Chat:",
          loadingMessages: "Xabarlar yuklanmoqda...",
          noMessages: "Hali xabarlar yo'q",
          messagePlaceholder: "Xabar yozing...",
          closeReason: "Yopish sababi *",
          closeReasonPlaceholder: "Nima uchun yopilayotganini tushuntiring...",
          closeThreadTitle: "Ipni yopish",
          closeThreadDescription: "Ushbu qo'llab-quvvatlash ipini yopish sababini ko'rsating."
        },
        toasts: {
          messageSent: "Xabar yuborildi",
          messageFailed: "Xabarni yuborib bo'lmadi",
          assigned: "Ip sizga tayinlandi",
          assignFailed: "Ipni tayinlab bo'lmadi",
          closed: "Ip yopildi",
          closeFailed: "Ipni yopib bo'lmadi",
          reasonRequired: "Yopish sababini ko'rsating"
        }
      },
      complaints: {
        title: "Shikoyatlar moderatsiyasi",
        subtitle: "Foydalanuvchi shikoyatlarini ko'rib chiqish",
        filterByStatus: "Holat bo'yicha filtrlash",
        allStatus: "Barcha holatlar",
        filterByCategory: "Kategoriya bo'yicha filtrlash",
        allCategories: "Barcha kategoriyalar",
        status: {
          open: "Ochiq",
          in_review: "Ko'rib chiqilmoqda",
          resolved: "Hal qilindi",
          rejected: "Rad etildi"
        },
        categories: {
          spam: "Spam",
          fraud: "Firibgarlik",
          abuse: "Huquqbuzarlik",
          quality: "Sifat",
          other: "Boshqa"
        },
        allComplaints: "Barcha shikoyatlar",
        loading: "Yuklanmoqda...",
        noComplaints: "Shikoyatlar yo'q",
        table: {
          complainant: "Shikoyatchi",
          category: "Kategoriya",
          target: "Shikoyat ob'ekti",
          status: "Holat",
          date: "Sana",
          actions: "Amallar"
        },
        anonymousFallback: "Anonim",
        buttons: {
          assign: "Tayinlash",
          resolve: "Hal qilish",
          reject: "Rad etish",
          cancel: "Bekor qilish",
          resolving: "Saqlanmoqda...",
          rejecting: "Rad etilmoqda..."
        },
        resolveDialog: {
          title: "Shikoyatni hal qilish",
          description: "Tavsif:",
          decisionLabel: "Qaror",
          decisions: {
            none: "Harakat yo'q",
            warning: "Ogohlantirish berildi",
            sanction: "Sanksiya qo'llanildi"
          },
          commentLabel: "Qaror izohi",
          commentPlaceholder: "Qarorni tushuntiring...",
          resolveButton: "Shikoyatni hal qilish"
        },
        rejectDialog: {
          title: "Shikoyatni rad etish",
          description: "Shikoyatni rad etish sababini ko'rsating.",
          reasonLabel: "Rad etish sababi",
          reasonPlaceholder: "Nima uchun rad etilayotganini tushuntiring...",
          rejectButton: "Shikoyatni rad etish"
        },
        toasts: {
          assigned: "Shikoyat sizga tayinlandi",
          assignFailed: "Shikoyatni tayinlab bo'lmadi",
          resolved: "Shikoyat hal qilindi",
          resolveFailed: "Shikoyatni hal qilib bo'lmadi",
          rejected: "Shikoyat rad etildi",
          rejectFailed: "Shikoyatni rad etib bo'lmadi",
          reasonRequired: "Rad etish sababini ko'rsating"
        }
      },
      dashboard: {
        onlineUsers: "Onlayn foydalanuvchilar",
        onlineSubtitle: "So'nggi 10 daqiqada faol • Har 30 soniyada yangilanadi",
        userGrowthTitle: "Foydalanuvchilar o'sishi (so'nggi 30 kun)",
        userGrowthSubtitle: "Kunlik yangi foydalanuvchilar ro'yxatdan o'tishi",
        newUsersLabel: "Yangi foydalanuvchilar",
        noGrowthData: "O'sish ma'lumotlari yo'q",
        platformHealth: "Platforma holati",
        platformHealthSubtitle: "Asosiy ko'rsatkichlar",
        metrics: {
          activeSessions: "Faol seanslar (24s)",
          activeSessDesc: "Kirgan foydalanuvchilar",
          avgSession: "O'rtacha seans",
          avgSessDesc: "Daqiqalarda davomiyligi",
          emailVerified: "Email tasdiqlangan",
          emailVerifDesc: "Tasdiqlash darajasi",
          phoneVerified: "Telefon tasdiqlangan",
          phoneVerifDesc: "Tasdiqlash darajasi",
          pendingComplaints: "Kutilayotgan shikoyatlar",
          pendingComplDesc: "E'tibor talab qiladi",
          blockedUsers: "Bloklangan foydalanuvchilar",
          blockedUsersDesc: "Bloklangan foizi"
        }
      },
      salons: {
        subtitle: "Salonlarni boshqarish va tasdiqlash",
        searchPlaceholder: "Salonlarni qidirish...",
        loading: "Yuklanmoqda...",
        noSalons: "Salonlar topilmadi",
        table: {
          salon: "Salon",
          location: "Joylashuv",
          status: "Holat",
          actions: "Amallar"
        },
        idPrefix: "ID:",
        verified: "Tasdiqlangan",
        notVerified: "Tasdiqlanmagan",
        toasts: {
          verifiedSuccess: "Salon muvaffaqiyatli tasdiqlandi",
          verifyFailed: "Salonni tasdiqlab bo'lmadi",
          unverifiedSuccess: "Tasdiqlash bekor qilindi",
          unverifyFailed: "Tasdiqlashni bekor qilib bo'lmadi"
        }
      },
      sanctions: {
        title: "Sanksiyalar",
        subtitle: "Foydalanuvchi va salon sanksiyalarini boshqarish",
        filterByStatus: "Holat bo'yicha filtrlash",
        filterByTarget: "Ob'ekt bo'yicha filtrlash",
        allStatus: "Barcha holatlar",
        allTargets: "Barcha ob'ektlar",
        status: {
          active: "Faol",
          expired: "Muddati o'tgan",
          revoked: "Bekor qilingan"
        },
        targets: {
          user: "Foydalanuvchi",
          salon: "Salon",
          master: "Master",
          client: "Mijoz"
        },
        types: {
          temporary_block: "Vaqtinchalik blok",
          permanent_block: "Doimiy blok",
          feature_restriction: "Funksiya cheklovi"
        },
        allSanctions: "Barcha sanksiyalar",
        loading: "Yuklanmoqda...",
        noSanctions: "Sanksiyalar yo'q",
        table: {
          target: "Ob'ekt",
          type: "Tur",
          reason: "Sabab",
          status: "Holat",
          started: "Boshlangan",
          endsAt: "Tugaydi",
          actions: "Amallar"
        },
        permanent: "Doimiy",
        buttons: {
          details: "Tafsilotlar",
          revoke: "Bekor qilish",
          close: "Yopish",
          cancel: "Bekor qilish",
          revoking: "Bekor qilinmoqda...",
          revokeButton: "Sanksiyani bekor qilish"
        },
        detailsDialog: {
          title: "Sanksiya tafsilotlari",
          labels: {
            targetType: "Ob'ekt turi",
            targetId: "Ob'ekt ID",
            sanctionType: "Sanksiya turi",
            status: "Holat",
            startedAt: "Boshlangan",
            endsAt: "Tugaydi",
            reason: "Sabab",
            commentToUser: "Foydalanuvchiga izoh",
            internalNote: "Ichki eslatma",
            revokeReason: "Bekor qilish sababi",
            revokedOn: "Bekor qilingan"
          }
        },
        revokeDialog: {
          title: "Sanksiyani bekor qilish",
          description: "Ushbu sanksiyani bekor qilish sababini ko'rsating.",
          targetPrefix: "Ob'ekt:",
          reasonLabel: "Bekor qilish sababi *",
          reasonPlaceholder: "Nima uchun bekor qilinayotganini tushuntiring..."
        },
        toasts: {
          revokedSuccess: "Sanksiya muvaffaqiyatli bekor qilindi",
          revokeFailed: "Sanksiyani bekor qilib bo'lmadi",
          reasonRequired: "Bekor qilish sababini ko'rsating"
        }
      },
      users: {
        subtitle: "Platforma foydalanuvchilarini boshqarish",
        totalCount: "jami foydalanuvchi",
        selectedCount: "tanlangan",
        exportExcel: "Excel eksport",
        exportPdf: "PDF eksport",
        refresh: "Yangilash",
        clearSelection: "Tanlovni bekor qilish",
        stats: {
          totalUsers: "Jami foydalanuvchilar",
          active: "Faollar",
          blocked: "Bloklangan",
          byRole: "Rol bo'yicha",
          clients: "Mijozlar:",
          owners: "Egalar:",
          masters: "Masterlar:",
          admins: "Adminlar:"
        },
        searchFilters: "Qidirish va filtrlar",
        searchPlaceholder: "Qidirish...",
        roles: {
          allRoles: "Barcha rollar",
          client: "Mijoz",
          owner: "Egasi",
          master: "Master",
          admin: "Admin"
        },
        statuses: {
          allStatuses: "Barcha holatlar",
          active: "Faol",
          blocked: "Bloklangan"
        },
        verification: {
          all: "Barchasi",
          fullyVerified: "To'liq tasdiqlangan",
          emailVerified: "Email tasdiqlangan",
          phoneVerified: "Telefon tasdiqlangan",
          unverified: "Tasdiqlanmagan"
        },
        loadError: "Foydalanuvchilarni yuklab bo'lmadi",
        loadErrorDesc: "Ro'yxatni yuklashda xato yuz berdi. Qaytadan urinib ko'ring.",
        tryAgain: "Qaytadan urinish",
        loadingUsers: "Foydalanuvchilar yuklanmoqda...",
        noUsersFound: "Foydalanuvchilar topilmadi",
        noUsersFiltered: "Filtrlarni o'zgartiring...",
        noUsersEmpty: "Hali ro'yxatdan o'tgan foydalanuvchilar yo'q...",
        clearFilters: "Filtrlarni tozalash",
        table: {
          contact: "Kontakt",
          joined: "Qo'shilgan",
          verification: "Tasdiqlanish",
          email: "Email",
          phone: "Telefon",
          noName: "Ism yo'q",
          emailVerified: "Email ✓",
          emailUnverified: "Email ✗",
          phoneVerified: "Tel ✓",
          phoneUnverified: "Tel ✗"
        },
        pagination: {
          showing: "Ko'rsatilmoqda",
          to: "dan",
          of: "jami",
          users: "foydalanuvchi",
          previous: "Oldingi",
          next: "Keyingi"
        },
        actions: {
          quickView: "Tezkor ko'rish",
          fullDetails: "To'liq tafsilotlar",
          blockUser: "Bloklash",
          unblockUser: "Blokdan chiqarish",
          deleteUser: "O'chirish"
        },
        blockDialog: {
          title: "Foydalanuvchini bloklash",
          descPrefix: "Bloklash",
          reasonLabel: "Bloklash sababi (majburiy)",
          reasonPlaceholder: "Masalan, spam, qoidabuzarlik...",
          cancel: "Bekor qilish",
          blocking: "Bloklanmoqda...",
          blockButton: "Bloklash"
        },
        deleteDialog: {
          title: "Foydalanuvchini o'chirish",
          descPrefix: "Siz rostdan ham o'chirmoqchimisiz",
          descSuffix: "? Bu amal qaytarib bo'lmaydi.",
          cancel: "Bekor qilish",
          deleting: "O'chirilmoqda...",
          deleteButton: "Foydalanuvchini o'chirish"
        },
        viewDialog: {
          title: "Foydalanuvchi tafsilotlari",
          description: "Foydalanuvchi ma'lumotlarining qisqacha ko'rinishi",
          labels: {
            fullName: "To'liq ism",
            role: "Rol",
            email: "Email",
            phone: "Telefon",
            accountStatus: "Hisob holati",
            verification: "Tasdiqlanish",
            memberSince: "A'zo bo'lgan",
            userId: "Foydalanuvchi ID"
          },
          close: "Yopish",
          viewFull: "To'liq tafsilotlar"
        },
        testUsersDialog: {
          title: "Test foydalanuvchilarini yaratish",
          description: "Funksiyalarni sinash uchun 7 ta test foydalanuvchisi yaratiladi.",
          toBeCreated: "Yaratiladigan test foydalanuvchilari:",
          credentials: "Kirish ma'lumotlari:",
          email: "Email:",
          password: "Parol:",
          cancel: "Bekor qilish",
          creating: "Yaratilmoqda...",
          createButton: "Foydalanuvchilar yaratish"
        },
        toasts: {
          blockedSuccess: "Foydalanuvchi bloklandi",
          blockFailed: "Bloklash muvaffaqiyatsiz",
          unblockedSuccess: "Foydalanuvchi blokdan chiqarildi",
          unblockFailed: "Blokdan chiqarish muvaffaqiyatsiz",
          deletedSuccess: "Foydalanuvchi o'chirildi",
          deleteFailed: "O'chirish muvaffaqiyatsiz",
          testCreated: "Test foydalanuvchilari yaratildi",
          testFailed: "Test foydalanuvchilarini yaratib bo'lmadi",
          exportSuccess: "Eksport muvaffaqiyatli",
          noData: "Eksport qilish uchun ma'lumot yo'q",
          pleaseProvideReason: "Sababni ko'rsating"
        }
      }
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (target[key] === undefined) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

for (const lang of ['ru', 'en', 'uz']) {
  const filePath = path.join(localesDir, `${lang}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  deepMerge(existing, newKeys[lang]);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`✓ Updated ${lang}.json`);
}

console.log('Done!');
