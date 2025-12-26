import { ReminderPublisherService, ReminderSubscriberService } from "./pub-sub";
import { ReminderScheduler } from "./schedulers/reminder.scheduler";
import { NotificationsGateway } from "./sockets";

export const SERVICE_PROVIDER=[ReminderPublisherService,ReminderSubscriberService,
    ReminderScheduler,
    NotificationsGateway
]