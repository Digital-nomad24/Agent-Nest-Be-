import { deleteNotificationUseCase } from "./delete-notificaion.use-case";
import { retrieveNotificationsUseCase } from "./retrieve-notification.use-case";
import { UpdateNotificationUseCase } from "./update-notification.use-case";

export const USE_CASE_PROVIDER=[deleteNotificationUseCase,
    retrieveNotificationsUseCase,
    UpdateNotificationUseCase,

]