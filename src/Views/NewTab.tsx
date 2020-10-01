import { h, Component } from "preact";

export default class NewTab extends Component {
    render() {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                width: "100vw",
            }}>
                <nav>
                    <li>
                        <button>Open repo</button>
                    </li>
                    <li>
                        <button>Clone repo</button>
                    </li>
                    <li>
                        <button>New repo</button>
                    </li>
                </nav>
            </div>
        );
    }
}
