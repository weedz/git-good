import { h, Component } from "preact";
import { StaticLink } from "router-tsx";

export default class DiffPane extends Component {
    render() {
        return (
            <div id="diff-pane" class="pane">
                <p>Hotkey: Collapse diff panel</p>
                <p>Hotkey: Toggle between inline diff and full diff view</p>
                <h4>Commit d842471</h4>

                <p>Parent: <StaticLink href="/commit/2ef7d5ef02ce614408fa6bf55c00d0d88f0fa74b">2ef7d5e</StaticLink></p>
                <p class="date">authored: 1587587995000</p>
                <p class="author">author: Linus Björklund</p>
                <p class="msg">
                    <code>test module</code>
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
