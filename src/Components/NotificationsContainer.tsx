import { h } from "preact";
import { Store, PureStoreComponent, NotificationPosition } from "../Data/Renderer/store";

export default class NotificationsContainer extends PureStoreComponent<{position: NotificationPosition}> {
    componentDidMount() {
        this.listen("notifications", () => {
            this.forceUpdate()
        });
    }
    render() {
        return (
            <ul className="notifications-container">
                {Array.from(Store.notifications[this.props.position].values()).map(Notification => Notification.item)}
            </ul>
        );
    }
}
