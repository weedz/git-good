import { h } from "preact";
import { Store, PureStoreComponent } from "../Data/Renderer/store";
import { NotificationPosition } from "../Data/WindowEventTypes";

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
