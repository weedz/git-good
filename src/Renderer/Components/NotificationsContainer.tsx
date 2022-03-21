import { h } from "preact";
import { Store, PureStoreComponent } from "../Data/store";
import { NotificationPosition } from "../../Common/WindowEventTypes";

export default class NotificationsContainer extends PureStoreComponent<{position: NotificationPosition}> {
    componentDidMount() {
        this.listen("notifications");
    }
    render() {
        return (
            <ul className="notifications-container">
                {Array.from(Store.notifications[this.props.position].values()).map(Notification => Notification.item)}
            </ul>
        );
    }
}
