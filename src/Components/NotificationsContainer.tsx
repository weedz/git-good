import { h } from "preact";
import { Store, PureStoreComponent } from "src/Data/Renderer/store";

export default class NotificationsContainer extends PureStoreComponent {
    componentDidMount() {
        this.listen("notifications", () => {
            this.forceUpdate()
        });
    }
    render() {
        return (
            <ul className="notifications-container">
                {Array.from(Store.notifications.values()).map(Notification => Notification.item)}
            </ul>
        );
    }
}
