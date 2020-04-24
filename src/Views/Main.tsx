import { h, Component } from "preact";
import { RoutableProps, Link } from "router-tsx";

export default class Main extends Component<RoutableProps> {
    render() {
        console.log(this.props);
        return (
        <div id="main-window">
            <div id="left-pane">
                <div id="changes-pane" class="pane">
                    <h4>Working area</h4>
                    <ul>
                        <li><Link activeClassName="selected" href="/working-area">Changes (1)</Link></li>
                    </ul>
                </div>
                <div id="branch-pane" class="pane">
                    <h4>Refs</h4>
                    <ul class="tree-list">
                        <li>
                            <Link activeClassName="selected" href="/">HEAD (current branch)</Link>
                        </li>
                        <hr />
                        <li class="open">
                            <a href="#">[-] Local</a>
                            <ul class="tree-list">
                                <li><a href="#">[+] dev</a></li>
                                <li><a href="#">develop</a></li>
                            </ul>
                        </li>
                        <hr />
                        <li class="open">
                            <a href="#">[-] Remote</a>
                            <ul class="tree-list">
                                <li class="open">
                                    <a href="#">[-] origin</a>
                                    <ul class="tree-list">
                                        <li><a href="#">develop</a></li>
                                        <li>
                                            <a href="#">[+] Linus</a>
                                            <ul class="tree-list">
                                                <li><a href="#">intern dev</a></li>
                                            </ul>
                                        </li>
                                        <li><a href="#">master</a></li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                        <hr />
                        <li class="open">
                            <a href="#">[-] Tags</a>
                            <ul class="tree-list">
                                <li><a href="#">9.2.3</a></li>
                                <li><a href="#">9.2.2</a></li>
                                <li><a href="#">9.2.1</a></li>
                                <li><a href="#">9.2.0</a></li>
                                <li><a href="#">9.1.3</a></li>
                                <li><a href="#">9.1.2</a></li>
                                <li><a href="#">9.1.1</a></li>
                                <li><a href="#">9.1.0</a></li>
                                <li><a href="#">9.0.5</a></li>
                                <li><a href="#">9.0.4</a></li>
                                <li><a href="#">9.0.3</a></li>
                                <li><a href="#">9.0.2</a></li>
                                <li><a href="#">9.0.1</a></li>
                                <li><a href="#">9.0.0</a></li>
                            </ul>
                        </li>
                        <hr />
                        <li>
                            <a href="#">[+] Stash</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <ul>
                    <li class="short">
                        <Link activeClassName="selected" href="/commit/22a4df3">
                            <span class="msg">No need to spread Route since params comes from mapParams</span>
                            <span class="date">2020-10-01 18:00</span>
                            <span class="sha">22a4df3</span>
                            <span class="author">Linus Björklund</span>
                        </Link>
                    </li>
                    <li class="short">
                        <Link activeClassName="selected" href="/commit/1931e14">
                            <span class="msg">find returns a `match` value to indicate if we matched the whole URI</span>
                            <span class="date">2020-10-01 17:59</span>
                            <span class="sha">1931e14</span>
                            <span class="author">Linus Björklund</span>
                        </Link>
                    </li>
                </ul>
            </div>
            <div id="diff-pane" class="pane">
                <p>Hotkey: Collapse diff panel</p>
                <p>Hotkey: Toggle between inline diff and full diff view</p>
                <h4>Commit 22a4df3</h4>

                <p>Parent: 1931e14</p>
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
        </div>
        )
    }
}
