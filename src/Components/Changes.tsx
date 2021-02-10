import { h } from "preact";
import { IpcAction, IpcActionReturn } from "src/Data/Actions";
import { updateStore, Store, PureStoreComponent } from "../Data/Renderer/store";
import Link from "./Link";

export default class Changes extends PureStoreComponent<unknown, {staged: number, unstaged: number, repoPath: string}> {
    state = {
        staged: 0,
        unstaged: 0,
        repoPath: "",
    };
    componentDidMount() {
        this.listen("repo", (repo) => {
            this.setState({repoPath: repo?.path});
        });
        this.registerHandler(IpcAction.REFRESH_WORKDIR, (changes: IpcActionReturn[IpcAction.REFRESH_WORKDIR]) => {
            this.setState({
                staged: changes.staged,
                unstaged: changes.unstaged
            });
        });
    }
    render() {
        const changes = this.state.staged + this.state.unstaged;
        return (
            <div id="changes-pane" className="pane">
                <h4>Working area</h4>
                <ul className="block-list">
                    {Store.repo?.status?.bisecting && <li><span>Bisecting</span></li>}
                    {Store.repo?.status?.merging && <li><span>Merging</span></li>}
                    {Store.repo?.status?.rebasing && <li><span>Rebasing</span></li>}
                    {Store.repo?.status?.reverting && <li><span>Reverting</span></li>}
                    <li><Link type="commits" selectAction={() => updateStore({viewChanges: null})}>Changes ({changes})</Link></li>
                </ul>
            </div>
        );
    }
}
