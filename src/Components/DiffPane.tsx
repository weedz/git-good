import { h, Component } from "preact";
import { Link } from "router-tsx";

export default class DiffPane extends Component {
    render() {
        return (
            <div id="diff-pane" class="pane">
                <p>Hotkey: Collapse diff panel</p>
                <p>Hotkey: Toggle between inline diff and full diff view</p>
                <h4>Commit 22a4df3</h4>

                <p>Parent: <Link href="/commit/1931e14">1931e14</Link></p>
                <p class="date">authored: 2020-10-01 18:00</p>
                <p class="author">author: Linus Björklund</p>
                <p class="msg">
                    <code>No need to spread Route since params comes from mapParams</code>
                </p>
                <hr />
                <p>Diff:</p>
                <pre>{`diff --git a/index.ts b/index.ts
index 2cdbafb..f88adcf 100644
--- a/index.ts
+++ b/index.ts
@@ -1,3 +1,4 @@
+// tests
    type RouteCallback = Function | any;
    
    type Route = {
                `}
                </pre>
            </div>
        );
    }
}
