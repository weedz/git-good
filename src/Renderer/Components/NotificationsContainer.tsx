import { Store, PureStoreComponent } from "../Data/store.js";
import { NotificationPosition } from "../../Common/WindowEventTypes.js";

export default class NotificationsContainer extends PureStoreComponent<{ position: NotificationPosition }> {
    componentDidMount() {
        this.listen("notifications");
    }
    render() {
        return (
            <ul class="notifications-container">
                {Array.from(Store.notifications[this.props.position].values()).map(Notification => Notification.item)}
            </ul>
        );
    }
}
