import { h, Component } from "preact";
import { Link, RoutableProps } from "router-tsx";

export default class WorkingArea extends Component<RoutableProps> {
    render() {
        return (
            <div id="main-window">
            <div id="left-pane">
                <div id="changes-pane" class="pane">
                    <h4>Working area</h4>
                    <ul>
                        <li><Link href="/working-area" class="selected">Changes (1)</Link></li>
                    </ul>
                </div>
                <div id="branch-pane" class="pane">
                    <h4>Refs</h4>
                    <ul class="tree-list">
                        <li>
                            <Link href="/">HEAD (current branch)</Link>
                        </li>
                        <hr />
                        <li class="open">
                            <a href="#">[-] Local</a>
                            <ul class="tree-list">
                                <li>
                                    <a href="#">[+] dev</a>
                                </li>
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
            <div id="working-area">
                <div id="unstaged-changes" class="pane">
                    <h4>Unstaged</h4>
                    <ul>
                        <li>index.js</li>
                    </ul>
                </div>
                <div id="staged-changes" class="pane">
                    <h4>Staged</h4>
                    <ul>
                        <li>index.html</li>
                    </ul>
                </div>
                <div class="pane">
                    <h4>Commit</h4>
                    <form>
                        <input type="text" name="msg" placeholder="Message..." />
                        <input type="submit" name="commit" value="Commit" />
                        <input type="submit" name="amend" value="Amend" />
                        <input type="button" value="Open editor" />
                    </form>
                </div>
            </div>
            <div id="diff-pane" class="pane">
                <h4>Diff</h4>
            </div>
        </div>
        )
    }
}
